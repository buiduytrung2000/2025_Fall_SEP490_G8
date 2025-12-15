import db from '../models';
import { Op } from 'sequelize';
import { generateOrderCode } from './order';


const createDirectSupplierOrdersForPerishable = async (storeOrder, transaction) => {
    // Load toàn bộ item kèm thông tin Product
    const items = await db.StoreOrderItem.findAll({
        where: { store_order_id: storeOrder.store_order_id },
        include: [
            {
                model: db.Product,
                as: 'product',
                attributes: ['product_id', 'name', 'sku', 'supplier_id', 'base_unit_id', 'import_price', 'is_perishable']
            },
            {
                model: db.Unit,
                as: 'unit',
                attributes: ['unit_id', 'name', 'symbol']
            }
        ],
        transaction
    });

    if (!items.length) return;

    const itemsBySupplier = {};
    const perishableItemIds = [];
    const hasRegularItems = items.some((item) => item.product && !item.product.is_perishable);

    for (const item of items) {
        const product = item.product;

        // Chỉ tách các sản phẩm tươi sống sang đơn NCC
        if (!product?.is_perishable) {
            continue;
        }
        const supplierId = product?.supplier_id;
        if (!supplierId) {
            // Bỏ qua sản phẩm không có NCC
            continue;
        }

        if (!itemsBySupplier[supplierId]) {
            itemsBySupplier[supplierId] = [];
        }

        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || product?.import_price || 0);
        const subtotal = quantity * unitPrice;
        const quantityInBase = item.quantity_in_base || quantity;
        const unitId = item.unit_id || product?.base_unit_id;

        itemsBySupplier[supplierId].push({
            product_id: product?.product_id || null,
            quantity,
            unit_price: unitPrice,
            subtotal,
            unit_id: unitId,
            quantity_in_base: quantityInBase
        });

        perishableItemIds.push(item.store_order_item_id);
    }

    const supplierIds = Object.keys(itemsBySupplier);
    if (!supplierIds.length) return;

    // 1. Tạo các đơn NCC giao thẳng cho cửa hàng
    for (const supplierId of supplierIds) {
        const orderItems = itemsBySupplier[supplierId];
        if (!orderItems.length) continue;

        const orderCode = await generateOrderCode();

        const order = await db.Order.create({
            order_code: orderCode,
            supplier_id: supplierId,
            created_by: storeOrder.created_by,
            status: 'pending',
            expected_delivery: storeOrder.expected_delivery || null,
            direct_to_store: true,
            target_store_id: storeOrder.store_id
        }, { transaction });

        for (const oi of orderItems) {
            await db.OrderItem.create({
                order_id: order.order_id,
                product_id: oi.product_id,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                subtotal: oi.subtotal,
                unit_id: oi.unit_id,
                quantity_in_base: oi.quantity_in_base
            }, { transaction });
        }
    }

    /**
     * 2. Xóa các dòng tươi sống khỏi StoreOrder (đã chuyển sang NCC)
     * - Nếu đơn ban đầu có cả hàng thường và tươi sống thì phần tươi sống sẽ bị xóa để kho chỉ xử lý hàng thường.
     * - Nếu đơn chỉ gồm hàng tươi sống, giữ nguyên các dòng để người dùng vẫn nhìn thấy chi tiết (theo yêu cầu mới).
     */
    const shouldRemovePerishableItems = perishableItemIds.length > 0 && hasRegularItems;

    if (shouldRemovePerishableItems) {
        await db.StoreOrderItem.destroy({
            where: { store_order_item_id: perishableItemIds },
            transaction
        });

        // 3. Tính lại tổng tiền cho đơn còn lại sau khi xóa hàng tươi sống
        const remainingItems = await db.StoreOrderItem.findAll({
            where: { store_order_id: storeOrder.store_order_id },
            transaction
        });

        const newTotal = remainingItems.reduce(
            (sum, item) => sum + parseFloat(item.subtotal || 0),
            0
        );

        await storeOrder.update(
            {
                total_amount: newTotal,
                // Đơn còn lại chỉ chứa hàng thường nên bỏ cờ perishable
                perishable: false
            },
            { transaction }
        );
    }
};

const normalizeOrderStatus = (status) => (status === 'preparing' ? 'confirmed' : status);

// =====================================================
// QUERY SERVICES - Get Orders
// =====================================================

/**
 * Get all orders with filters and pagination
 * Hiển thị tồn kho của chi nhánh (store_id = order.store_id)
 */
export const getAllOrdersService = async ({ page, limit, status, storeId, supplierId, search }) => {
    try {
        const offset = (page - 1) * limit;

        const whereConditions = {};
        if (status) whereConditions.status = status;
        if (storeId) whereConditions.store_id = storeId;
        if (supplierId) whereConditions.supplier_id = supplierId;

        const includeConditions = [
            {
                model: db.Store,
                as: 'store',
                attributes: ['store_id', 'name', 'address', 'phone', 'status'],
                ...(search && {
                    where: { name: { [Op.like]: `%${search}%` } }
                })
            },
            {
                model: db.Supplier,
                as: 'supplier',
                attributes: ['supplier_id', 'name', 'contact', 'email', 'address']
            },
            {
                model: db.User,
                as: 'creator',
                attributes: ['user_id', 'username', 'email', 'role']
            },
            {
                model: db.StoreOrderItem,
                as: 'storeOrderItems',
                include: [
                    {
                        model: db.Product,
                        as: 'product',
                        attributes: ['product_id', 'name', 'sku']
                    },
                    {
                        model: db.Unit,
                        as: 'unit',
                        attributes: ['unit_id', 'name', 'symbol']
                    },
                    {
                        model: db.Unit,
                        as: 'packageUnit',
                        attributes: ['unit_id', 'name', 'symbol']
                    }
                ]
            }
        ];

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true
        });

        const ordersWithInventory = await Promise.all(rows.map(async (order) => {
            const orderData = order.toJSON();

            for (let item of orderData.storeOrderItems) {
                const productId = await resolveProductId(item);
                if (!productId) {
                    item.inventory = { store: null, warehouse: null };
                    continue;
                }

                if (!item.product_id) {
                    item.product_id = productId;
                }

                const storeInventory = await db.Inventory.findOne({
                    where: {
                        store_id: order.store_id,
                        product_id: productId
                    },
                    attributes: ['base_quantity']
                });

                const warehouseInventory = await db.WarehouseInventory.findOne({
                    where: { product_id: productId },
                    attributes: ['base_quantity']
                });

                item.inventory = {
                    store: storeInventory ? { base_quantity: Number(storeInventory.get('base_quantity')) || 0 } : null,
                    warehouse: warehouseInventory ? { base_quantity: Number(warehouseInventory.get('base_quantity')) || 0 } : null
                };
                item.order_item_id = item.store_order_item_id; // Map for frontend compatibility
            }

            // Tính số loại sản phẩm (số items), không phải tổng quantity
            const totalItems = orderData.storeOrderItems?.length || 0;
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const normalizedStatus = normalizeOrderStatus(orderData.status);

            return {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalItems,
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        }));

        return {
            err: 0,
            msg: 'Get all orders successfully',
            data: {
                orders: ordersWithInventory,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalOrders: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

const packageUnitCache = new Map();

const resolveProductId = async (item) => {
    if (item.product_id) return item.product_id;
    if (item.sku) {
        const product = await db.Product.findOne({
            where: { sku: item.sku },
            attributes: ['product_id']
        });
        return product?.product_id || null;
    }
    return null;
};

const getPreferredPackageUnit = async (productId) => {
    if (packageUnitCache.has(productId)) return packageUnitCache.get(productId);

    const productUnit = await db.ProductUnit.findOne({
        where: { product_id: productId },
        include: [
            {
                model: db.Unit,
                as: 'unit',
                attributes: ['unit_id', 'name', 'symbol']
            }
        ],
        order: [['conversion_to_base', 'DESC']]
    });

    if (!productUnit) {
        packageUnitCache.set(productId, null);
        return null;
    }

    const meta = {
        conversion_to_base: Number(productUnit.conversion_to_base),
        unit: productUnit.unit ? {
            unit_id: productUnit.unit.unit_id,
            name: productUnit.unit.name,
            symbol: productUnit.unit.symbol
        } : null
    };

    packageUnitCache.set(productId, meta);
    return meta;
};

/**
 * Get order detail by ID with full inventory info
 */
export const getOrderDetailService = async (orderId) => {
    try {
        const order = await db.StoreOrder.findOne({
            where: { store_order_id: orderId },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address', 'phone', 'status']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact', 'email', 'address']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['user_id', 'username', 'email', 'role', 'phone']
                },
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems',
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            attributes: ['product_id', 'name', 'sku', 'description'],
                            include: [
                                {
                                    model: db.Category,
                                    as: 'category',
                                    attributes: ['category_id', 'name']
                                }
                            ]
                        },
                        {
                            model: db.Unit,
                            as: 'unit',
                            attributes: ['unit_id', 'name', 'symbol']
                        },
                        {
                            model: db.Unit,
                            as: 'packageUnit',
                            attributes: ['unit_id', 'name', 'symbol']
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return { err: 1, msg: 'Order not found' };
        }

        const orderData = order.toJSON();

        for (let item of orderData.storeOrderItems) {
            const productId = await resolveProductId(item);
            if (!productId) {
                item.inventory = null;
                item.order_item_id = item.store_order_item_id;
                continue;
            }

            if (!item.product_id) {
                item.product_id = productId;
            }

            const storeInventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: productId
                },
                attributes: ['base_quantity', 'min_stock_level', 'reorder_point']
            });

            const warehouseInventory = await db.WarehouseInventory.findOne({
                where: { product_id: productId },
                attributes: ['base_quantity']
            });

            const inventoryInfo = {};

            if (storeInventory) {
                const rawStore = storeInventory.get({ plain: true });
                inventoryInfo.store = {
                    base_quantity: Number(rawStore.base_quantity) || 0,
                    min_stock_level: rawStore.min_stock_level,
                    reorder_point: rawStore.reorder_point
                };
            }

            // Lấy package unit info: ưu tiên từ item, nếu không có thì từ ProductUnit
            let preferredPackageMeta = null;
            if (item.packageUnit) {
                // Nếu có packageUnit trong item, thử lấy conversion từ đó
                const conversionFromItem = item.package_quantity && item.actual_quantity
                    ? Number(item.actual_quantity) / Number(item.package_quantity)
                    : null;

                preferredPackageMeta = {
                    conversion_to_base: conversionFromItem,
                    unit: {
                        unit_id: item.packageUnit.unit_id,
                        name: item.packageUnit.name,
                        symbol: item.packageUnit.symbol
                    }
                };
            }

            // Nếu chưa có conversion, lấy từ ProductUnit
            if (!preferredPackageMeta?.conversion_to_base || preferredPackageMeta.conversion_to_base <= 1) {
                const productUnitMeta = await getPreferredPackageUnit(item.product_id);
                if (productUnitMeta) {
                    preferredPackageMeta = productUnitMeta;
                }
            }

            if (warehouseInventory) {
                const rawWarehouse = warehouseInventory.get({ plain: true });
                const baseQty = Number(rawWarehouse.base_quantity) || 0;

                // Lấy package_conversion: ưu tiên từ rawWarehouse, nếu không có thì từ preferredPackageMeta
                let pkgConversion = null;
                if (rawWarehouse.package_conversion && rawWarehouse.package_conversion > 1) {
                    pkgConversion = Number(rawWarehouse.package_conversion);
                } else if (preferredPackageMeta?.conversion_to_base && preferredPackageMeta.conversion_to_base > 1) {
                    pkgConversion = Number(preferredPackageMeta.conversion_to_base);
                }

                // Tính package_quantity: nếu có conversion thì tính, giữ 2 chữ số thập phân
                let packageQty = null;
                if (pkgConversion && pkgConversion > 1 && baseQty > 0) {
                    packageQty = parseFloat((baseQty / pkgConversion).toFixed(2));
                }

                inventoryInfo.warehouse = {
                    base_quantity: baseQty,
                    package_conversion: pkgConversion,
                    package_quantity: packageQty,
                    package_unit: rawWarehouse.package_unit || preferredPackageMeta?.unit || null
                };
            }

            item.inventory = Object.keys(inventoryInfo).length ? inventoryInfo : null;
            item.order_item_id = item.store_order_item_id; // Map for frontend compatibility
        }

        const totalItems = orderData.storeOrderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
        const normalizedStatus = normalizeOrderStatus(orderData.status);

        return {
            err: 0,
            msg: 'Get order detail successfully',
            data: {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalItems,
                totalAmount: parseFloat(totalAmount.toFixed(2))
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get orders by store
 */
export const getOrdersByStoreService = async ({ storeId, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: { store_id: storeId },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact']
                },
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const normalizedStatus = normalizeOrderStatus(orderData.status);
            return {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: 'Get orders by store successfully',
            data: {
                orders: ordersWithTotals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalOrders: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get orders by supplier
 */
export const getOrdersBySupplierService = async ({ supplierId, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: { supplier_id: supplierId },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact', 'email']
                },
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const normalizedStatus = normalizeOrderStatus(orderData.status);
            return {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: 'Get orders by supplier successfully',
            data: {
                orders: ordersWithTotals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalOrders: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get orders by status
 */
export const getOrdersByStatusService = async ({ status, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const statusFilter = status === 'confirmed'
            ? { [Op.in]: ['confirmed', 'preparing'] }
            : status;

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: { status: statusFilter },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name']
                },
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const normalizedStatus = normalizeOrderStatus(orderData.status);
            return {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: `Get ${status} orders successfully`,
            data: {
                orders: ordersWithTotals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalOrders: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get pending orders
 */
export const getPendingOrdersService = async ({ page, limit }) => {
    try {
        return await getOrdersByStatusService({ status: 'pending', page, limit });
    } catch (error) {
        throw error;
    }
};

/**
 * Get orders by date range
 */
export const getOrdersByDateRangeService = async ({ startDate, endDate, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: {
                created_at: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name']
                },
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const normalizedStatus = normalizeOrderStatus(orderData.status);
            return {
                ...orderData,
                status: normalizedStatus,
                order_id: orderData.store_order_id, // Map for frontend compatibility
                orderItems: orderData.storeOrderItems, // Map for frontend compatibility
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: 'Get orders by date range successfully',
            data: {
                orders: ordersWithTotals,
                dateRange: { startDate, endDate },
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalOrders: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get order statistics
 */
export const getOrderStatisticsService = async ({ startDate, endDate }) => {
    try {
        const whereConditions = {};

        if (startDate && endDate) {
            whereConditions.created_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const rawStatusCounts = await db.StoreOrder.findAll({
            where: whereConditions,
            attributes: [
                'status',
                [db.sequelize.fn('COUNT', db.sequelize.col('store_order_id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const statusCounts = rawStatusCounts.reduce((acc, row) => {
            const normalized = normalizeOrderStatus(row.status);
            const countValue = Number(row.count || 0);
            const existing = acc.find(item => item.status === normalized);
            if (existing) {
                existing.count += countValue;
            } else {
                acc.push({ status: normalized, count: countValue });
            }
            return acc;
        }, []);

        const storeCounts = await db.StoreOrder.findAll({
            where: whereConditions,
            attributes: [
                'store_id',
                [db.sequelize.fn('COUNT', db.sequelize.col('store_order_id')), 'count']
            ],
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['name']
                }
            ],
            group: ['store_id']
        });

        const totalOrders = await db.StoreOrder.count({ where: whereConditions });

        const orders = await db.StoreOrder.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.StoreOrderItem,
                    as: 'storeOrderItems',
                    attributes: ['subtotal']
                }
            ]
        });

        const totalAmount = orders.reduce((sum, order) => {
            const orderTotal = order.storeOrderItems.reduce((s, item) => s + parseFloat(item.subtotal), 0);
            return sum + orderTotal;
        }, 0);

        return {
            err: 0,
            msg: 'Get order statistics successfully',
            data: {
                totalOrders,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                byStatus: statusCounts,
                byStore: storeCounts.map(s => s.toJSON())
            }
        };
    } catch (error) {
        throw error;
    }
};

// =====================================================
// UPDATE SERVICES - Modify Orders
// =====================================================

/**
 * Update order status with inventory management
 * LOGIC:
 * - confirmed → shipped: TRỪ actual_quantity từ inventory của kho.
 * - shipped → confirmed/cancelled: CỘNG lại actual_quantity vào inventory.
 * - shipped → delivered: bổ sung tồn kho tại cửa hàng.
 * - delivered: KHÔNG CHO SỬA.
 */
export const updateOrderStatusService = async ({ orderId, status, updatedBy, notes }) => {
    const transaction = await db.sequelize.transaction();

    try {
        const order = await db.StoreOrder.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        let currentStatus = normalizeOrderStatus(order.status);

        // KHÔNG CHO SỬA NẾU ĐÃ GIAO
        if (currentStatus === 'delivered') {
            await transaction.rollback();
            return {
                err: 1,
                msg: 'Không thể thay đổi trạng thái của đơn hàng đã giao. Đơn hàng đã hoàn tất.'
            };
        }

        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            // Cho phép confirmed -> shipped để supplier/warehouse cập nhật tiến trình,
            // nhưng luồng xuất kho sẽ bị bỏ qua cho đơn perishable.
            'confirmed': ['pending', 'shipped', 'cancelled'],
            'shipped': ['confirmed', 'delivered', 'cancelled'],
            'delivered': [],
            'cancelled': ['pending']
        };

        if (!validTransitions[currentStatus]?.includes(status)) {
            await transaction.rollback();
            return {
                err: 1,
                msg: `Không thể chuyển trạng thái từ "${currentStatus}" sang "${status}". Các trạng thái hợp lệ: ${validTransitions[currentStatus]?.join(', ') || 'không có'}`
            };
        }

        // =====================================================
        // INVENTORY MANAGEMENT LOGIC
        // =====================================================

        const isPerishableOrder = !!order.perishable;

        // 1. Nếu đơn được đánh dấu là tươi sống và từ pending -> confirmed,
        // tách các sản phẩm tươi sống sang đơn NCC giao thẳng cho cửa hàng
        // VÀ tự động cập nhật tồn kho của store ngay lập tức (không cần chờ supplier xác nhận)
        if (isPerishableOrder && currentStatus === 'pending' && status === 'confirmed') {
            // Lưu thông tin các item tươi sống trước khi có thể bị xóa
            const perishableItems = await db.StoreOrderItem.findAll({
                where: { store_order_id: orderId },
                include: [
                    {
                        model: db.Product,
                        as: 'product',
                        attributes: ['product_id', 'is_perishable']
                    }
                ],
                transaction
            });

            const itemsToUpdate = perishableItems.filter(item => item.product?.is_perishable);

            // Tạo đơn NCC
            await createDirectSupplierOrdersForPerishable(order, transaction);

            // Tự động cập nhật tồn kho của store cho các sản phẩm tươi sống
            await receivePerishableInventoryAtStore(orderId, itemsToUpdate, transaction);
        }

        // 2. TRỪ TỒN KHO KHI GIAO HÀNG (chỉ áp dụng cho phần hàng thường trong đơn)
        if (currentStatus === 'confirmed' && status === 'shipped') {
            await shipInventoryFromWarehouse(orderId, transaction);
        }

        // 3. HOÀN LẠI TỒN KHO KHI HỦY (chỉ áp dụng cho phần hàng thường trong đơn)
        if (currentStatus === 'shipped' && (status === 'confirmed' || status === 'cancelled')) {
            await returnInventoryToWarehouse(orderId, transaction);
        }

        // 4. CỘNG TỒN KHO TẠI CỬA HÀNG KHI NHẬN HÀNG (áp dụng cho cả hai loại)
        if (currentStatus === 'shipped' && status === 'delivered') {
            await receiveInventoryAtStore(orderId, transaction);
        }

        // Build update data
        const updateData = {
            status,
            updated_at: new Date()
        };

        // Append notes if provided (when marking as delivered)
        if (notes && status === 'delivered') {
            const existingNotes = order.notes || '';
            updateData.notes = existingNotes
                ? `${existingNotes}\n[Ghi chú nhận hàng]: ${notes}`
                : `[Ghi chú nhận hàng]: ${notes}`;
        }

        await order.update(updateData, { transaction });

        await transaction.commit();

        return {
            err: 0,
            msg: `Đã chuyển trạng thái từ "${currentStatus}" sang "${status}" thành công`,
            data: order
        };
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error updating order status:', error);

        return {
            err: -1,
            msg: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng'
        };
    }
};

/**
 * Update expected delivery date
 */
export const updateExpectedDeliveryService = async ({ orderId, expected_delivery }) => {
    try {
        const order = await db.StoreOrder.findByPk(orderId);

        if (!order) {
            return { err: 1, msg: 'Order not found' };
        }

        if (order.status === 'delivered') {
            return {
                err: 1,
                msg: 'Không thể thay đổi ngày giao của đơn hàng đã giao'
            };
        }

        await order.update({ expected_delivery, updated_at: new Date() });

        return {
            err: 0,
            msg: 'Cập nhật ngày giao hàng thành công',
            data: order
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Update order item actual quantity
 */
export const updateOrderItemQuantityService = async ({ orderItemId, actual_quantity }) => {
    const transaction = await db.sequelize.transaction();
    try {
        // orderItemId is actually store_order_item_id from frontend mapping
        const orderItem = await db.StoreOrderItem.findByPk(orderItemId, {
            include: [
                {
                    model: db.StoreOrder,
                    as: 'storeOrder',
                    attributes: ['status', 'store_id']
                },
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name']
                }
            ],
            transaction,
            lock: transaction?.LOCK?.UPDATE
        });

        if (!orderItem) {
            await transaction.rollback();
            return { err: 1, msg: 'Order item not found' };
        }

        // Frontend gửi số lượng thực tế theo thùng (package unit), cần quy đổi sang base unit (chai)
        const newActualPackage = Number(actual_quantity);
        if (isNaN(newActualPackage) || newActualPackage < 0) {
            await transaction.rollback();
            return { err: 1, msg: 'Số lượng không hợp lệ' };
        }

        const normalizedStatus = normalizeOrderStatus(orderItem.storeOrder?.status);
        const productId = orderItem.product_id || orderItem.product?.product_id;

        // Lấy package conversion để quy đổi từ thùng sang chai
        let packageConversion = 1;
        if (productId) {
            const productUnit = await db.ProductUnit.findOne({
                where: { product_id: productId },
                order: [['conversion_to_base', 'DESC']],
                transaction
            });
            if (productUnit && productUnit.conversion_to_base > 1) {
                packageConversion = Number(productUnit.conversion_to_base);
            }
        }

        // Quy đổi số lượng thực tế từ thùng sang chai (base unit)
        const newActualBase = newActualPackage * packageConversion;
        const oldActualBase = Number(orderItem.actual_quantity || 0);
        const deltaBase = newActualBase - oldActualBase;

        /**
         * LOGIC CẬP NHẬT TỒN KHO KHI THAY ĐỔI SỐ LƯỢNG THỰC TẾ:
         * 
         * Frontend gửi số lượng theo thùng → quy đổi sang chai (base unit) để cập nhật tồn kho
         * deltaBase = newActualBase - oldActualBase (theo chai)
         * - Nếu số lượng thực tế GIẢM (deltaBase < 0): hàng xuất ít hơn → tồn kho TĂNG
         * - Nếu số lượng thực tế TĂNG (deltaBase > 0): hàng xuất nhiều hơn → tồn kho GIẢM
         * 
         * Kho tổng: stock = stock - deltaBase
         *   - deltaBase < 0 (giảm): stock = stock - (-2) = stock + 2 → TĂNG ✓
         *   - deltaBase > 0 (tăng): stock = stock - (+2) = stock - 2 → GIẢM ✓
         * 
         * Kho chi nhánh: stock = stock + deltaBase
         *   - deltaBase < 0 (giảm): stock = stock + (-2) = stock - 2 → GIẢM ✓
         *   - deltaBase > 0 (tăng): stock = stock + (+2) = stock + 2 → TĂNG ✓
         */

        // Khi đơn đã xuất kho/đã giao, cần điều chỉnh tồn kho kho tổng theo delta thực tế (theo base unit)
        if (deltaBase !== 0 && (normalizedStatus === 'shipped' || normalizedStatus === 'delivered')) {
            if (!productId) {
                await transaction.rollback();
                return { err: 1, msg: 'Thiếu product_id để cập nhật tồn kho' };
            }

            const warehouseInventory = await db.WarehouseInventory.findOne({
                where: { product_id: productId },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (!warehouseInventory) {
                await transaction.rollback();
                return {
                    err: 1,
                    msg: `Không tìm thấy tồn kho kho tổng cho sản phẩm "${orderItem.product?.name || orderItem.product_name || ''}"`
                };
            }

            // Kiểm tra nếu số lượng thực tế tăng (deltaBase > 0) thì kho phải đủ hàng để trừ
            if (deltaBase > 0 && warehouseInventory.stock < deltaBase) {
                await transaction.rollback();
                return { err: 1, msg: 'Kho không đủ hàng để điều chỉnh theo số lượng thực tế' };
            }

            // Cập nhật tồn kho kho tổng: số lượng thực tế giảm → tồn kho tăng, và ngược lại
            await warehouseInventory.update(
                {
                    stock: warehouseInventory.stock - deltaBase, // deltaBase < 0 → tăng, deltaBase > 0 → giảm
                    updated_at: new Date()
                },
                { transaction }
            );
        }

        // Nếu đơn đã giao, cần cập nhật tồn kho chi nhánh theo deltaBase
        if (deltaBase !== 0 && normalizedStatus === 'delivered') {
            const storeId = orderItem.storeOrder?.store_id;
            if (!storeId) {
                await transaction.rollback();
                return { err: 1, msg: 'Không xác định được chi nhánh để cập nhật tồn kho' };
            }

            const storeInventory = await db.Inventory.findOne({
                where: { store_id: storeId, product_id: productId },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (storeInventory) {
                // Cập nhật tồn kho chi nhánh: số lượng thực tế tăng → tồn kho tăng, và ngược lại
                const newStock = storeInventory.stock + deltaBase; // deltaBase < 0 → giảm, deltaBase > 0 → tăng
                if (newStock < 0) {
                    await transaction.rollback();
                    return { err: 1, msg: 'Tồn kho chi nhánh không đủ để giảm theo số lượng thực tế' };
                }
                await storeInventory.update(
                    {
                        stock: newStock,
                        updated_at: new Date()
                    },
                    { transaction }
                );
            } else {
                // Tạo mới bản ghi tồn kho chi nhánh nếu chưa có
                if (deltaBase < 0) {
                    await transaction.rollback();
                    return { err: 1, msg: 'Không thể giảm tồn kho chi nhánh vì chưa có bản ghi tồn' };
                }
                await db.Inventory.create(
                    {
                        store_id: storeId,
                        product_id: productId,
                        stock: deltaBase, // deltaBase > 0 khi tạo mới
                        min_stock_level: 0,
                        reorder_point: 0
                    },
                    { transaction }
                );
            }
        }

        // Lưu actual_quantity theo base unit (chai) và package_quantity theo thùng vào DB
        await orderItem.update(
            {
                actual_quantity: newActualBase, // Lưu theo base unit (chai) cho xử lý tồn kho
                package_quantity: newActualPackage, // Lưu đúng số thùng mà user nhập để hiển thị lại
                subtotal: newActualPackage * parseFloat(orderItem.unit_price), // Tính tiền theo đơn vị thùng
                updated_at: new Date()
            },
            { transaction }
        );

        await transaction.commit();

        return {
            err: 0,
            msg: 'Cập nhật số lượng thành công',
            data: orderItem
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// =====================================================
// HELPER FUNCTIONS - Inventory Management
// =====================================================

const fetchOrderWithItems = async (orderId, transaction) => {
    return db.StoreOrder.findOne({
        where: { store_order_id: orderId },
        include: [
            {
                model: db.StoreOrderItem,
                as: 'storeOrderItems',
                include: [{ model: db.Product, as: 'product' }]
            }
        ],
        transaction,
        lock: transaction?.LOCK?.UPDATE
    });
};

const getBaseQuantity = (item) => {
    const candidates = [
        item.actual_quantity,
        item.quantity_in_base,
        item.quantity
    ];
    for (const candidate of candidates) {
        const value = Number(candidate || 0);
        if (value > 0) return value;
    }
    return 0;
};

const calculateShipmentQuantity = async (productId, requestedBaseQty, transaction) => {
    if (!requestedBaseQty || requestedBaseQty <= 0) {
        return {
            shipmentBaseQty: 0,
            packageUnitId: null,
            packageQuantity: null
        };
    }

    const packageUnit = await db.ProductUnit.findOne({
        where: { product_id: productId },
        order: [['conversion_to_base', 'DESC']],
        transaction,
        lock: transaction?.LOCK?.SHARE
    });

    if (!packageUnit) {
        return {
            shipmentBaseQty: requestedBaseQty,
            packageUnitId: null,
            packageQuantity: null
        };
    }

    const conversion = Number(packageUnit.conversion_to_base);
    if (!conversion || conversion <= 1) {
        return {
            shipmentBaseQty: requestedBaseQty,
            packageUnitId: null,
            packageQuantity: null
        };
    }

    const packages = Math.ceil(requestedBaseQty / conversion);
    return {
        shipmentBaseQty: packages * conversion,
        packageUnitId: packageUnit.unit_id,
        packageQuantity: packages
    };
};

/**
 * TRỪ hàng khỏi WarehouseInventory khi xuất kho
 */
const shipInventoryFromWarehouse = async (orderId, transaction) => {
    try {
        const order = await fetchOrderWithItems(orderId, transaction);
        if (!order) return;

        for (const item of order.storeOrderItems) {
            // Bỏ qua các sản phẩm tươi sống (đã giao thẳng từ NCC đến cửa hàng)
            if (item.product?.is_perishable) {
                continue;
            }
            if (!item.product_id) {
                throw new Error(`Sản phẩm "${item.product_name}" chưa được liên kết với sản phẩm trong hệ thống`);
            }

            const requestedBaseQty = getBaseQuantity(item);
            if (requestedBaseQty <= 0) {
                console.warn(`⚠️ Quantity not set for item ${item.store_order_item_id}, skipped`);
                continue;
            }

            const {
                shipmentBaseQty,
                packageUnitId,
                packageQuantity
            } = await calculateShipmentQuantity(item.product_id, requestedBaseQty, transaction);

            const warehouseInventory = await db.WarehouseInventory.findOne({
                where: { product_id: item.product_id },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (!warehouseInventory) {
                throw new Error(`Không tìm thấy tồn kho kho tổng cho sản phẩm "${item.product?.name || item.product_name}"`);
            }

            if (warehouseInventory.stock < shipmentBaseQty) {
                throw new Error(`Kho không đủ hàng cho "${item.product?.name || item.product_name}". Hiện có ${warehouseInventory.stock}, yêu cầu ${shipmentBaseQty}`);
            }

            await warehouseInventory.update({
                stock: warehouseInventory.stock - shipmentBaseQty,
                updated_at: new Date()
            }, { transaction });

            await item.update({
                actual_quantity: shipmentBaseQty,
                package_unit_id: packageUnitId,
                package_quantity: packageQuantity,
                updated_at: new Date()
            }, { transaction });
        }
    } catch (error) {
        console.error('❌ Error shipping inventory from warehouse:', error);
        throw error;
    }
};

/**
 * CỘNG hàng trở lại WarehouseInventory khi hoàn kho
 */
const returnInventoryToWarehouse = async (orderId, transaction) => {
    try {
        const order = await fetchOrderWithItems(orderId, transaction);
        if (!order) return;

        for (const item of order.storeOrderItems) {
            // Bỏ qua các sản phẩm tươi sống (không hoàn kho về kho tổng)
            if (item.product?.is_perishable) {
                continue;
            }
            if (!item.product_id) {
                console.warn(`⚠️ Item ${item.store_order_item_id} không có product_id, bỏ qua hoàn kho`);
                continue;
            }

            const qty = getBaseQuantity(item);
            if (qty <= 0) continue;

            const warehouseInventory = await db.WarehouseInventory.findOne({
                where: { product_id: item.product_id },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (warehouseInventory) {
                await warehouseInventory.update({
                    stock: warehouseInventory.stock + qty,
                    updated_at: new Date()
                }, { transaction });
            } else {
                await db.WarehouseInventory.create({
                    product_id: item.product_id,
                    stock: qty,
                    min_stock_level: 0,
                    reorder_point: 0
                }, { transaction });
            }
        }
    } catch (error) {
        console.error('❌ Error returning inventory to warehouse:', error);
        throw error;
    }
};

/**
 * CỘNG hàng tươi sống vào tồn kho chi nhánh ngay khi warehouse xác nhận
 * (không cần chờ supplier xác nhận)
 */
const receivePerishableInventoryAtStore = async (orderId, perishableItems, transaction) => {
    try {
        const order = await db.StoreOrder.findByPk(orderId, { transaction });
        if (!order) return;

        for (const item of perishableItems) {
            if (!item.product_id) {
                // Thử lấy product_id từ product relation
                const productId = item.product?.product_id || item.product_id;
                if (!productId) {
                    console.warn(`⚠️ Item ${item.store_order_item_id} không có product_id, bỏ qua nhập kho cửa hàng`);
                    continue;
                }
                item.product_id = productId;
            }

            const qty = getBaseQuantity(item);
            if (qty <= 0) continue;

            const inventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: item.product_id
                },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (inventory) {
                await inventory.update({
                    stock: inventory.stock + qty,
                    updated_at: new Date()
                }, { transaction });
            } else {
                await db.Inventory.create({
                    store_id: order.store_id,
                    product_id: item.product_id,
                    stock: qty,
                    min_stock_level: 0,
                    reorder_point: 0
                }, { transaction });
            }
        }
    } catch (error) {
        console.error('❌ Error receiving perishable inventory at store:', error);
        throw error;
    }
};

/**
 * CỘNG hàng vào tồn kho chi nhánh khi cửa hàng xác nhận đã nhận
 */
const receiveInventoryAtStore = async (orderId, transaction) => {
    try {
        const order = await fetchOrderWithItems(orderId, transaction);
        if (!order) return;

        for (const item of order.storeOrderItems) {
            if (!item.product_id) {
                console.warn(`⚠️ Item ${item.store_order_item_id} không có product_id, bỏ qua nhập kho cửa hàng`);
                continue;
            }

            const qty = getBaseQuantity(item);
            if (qty <= 0) continue;

            const inventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: item.product_id
                },
                transaction,
                lock: transaction?.LOCK?.UPDATE
            });

            if (inventory) {
                await inventory.update({
                    stock: inventory.stock + qty,
                    updated_at: new Date()
                }, { transaction });
            } else {
                await db.Inventory.create({
                    store_id: order.store_id,
                    product_id: item.product_id,
                    stock: qty,
                    min_stock_level: 0,
                    reorder_point: 0
                }, { transaction });
            }
        }
    } catch (error) {
        console.error('❌ Error receiving inventory at store:', error);
        throw error;
    }
};
