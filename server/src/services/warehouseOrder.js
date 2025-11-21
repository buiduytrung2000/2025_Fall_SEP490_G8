import db from '../models';
import { Op } from 'sequelize';

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

            const totalItems = orderData.storeOrderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const totalAmount = orderData.storeOrderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;

            return {
                ...orderData,
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

        return {
            err: 0,
            msg: 'Get order detail successfully',
            data: {
                ...orderData,
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
            return {
                ...orderData,
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
            return {
                ...orderData,
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

        const { count, rows } = await db.StoreOrder.findAndCountAll({
            where: { status },
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
            return {
                ...orderData,
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
            return {
                ...orderData,
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

        const statusCounts = await db.StoreOrder.findAll({
            where: whereConditions,
            attributes: [
                'status',
                [db.sequelize.fn('COUNT', db.sequelize.col('store_order_id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

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
 * - preparing → shipped: TRỪ actual_quantity từ inventory của kho.
 * - shipped → preparing/cancelled: CỘNG lại actual_quantity vào inventory.
 * - delivered: KHÔNG CHO SỬA.
 */
export const updateOrderStatusService = async ({ orderId, status, updatedBy }) => {
    const transaction = await db.sequelize.transaction();

    try {
        const order = await db.StoreOrder.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        const currentStatus = order.status;

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
            'confirmed': ['pending', 'preparing', 'cancelled'],
            'preparing': ['confirmed', 'shipped', 'cancelled'],
            'shipped': ['preparing', 'delivered', 'cancelled'],
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

        // 1. TRỪ TỒN KHO KHI GIAO HÀNG
        if (currentStatus === 'preparing' && status === 'shipped') {
            await shipInventoryFromWarehouse(orderId, transaction);
        }

        // 2. HOÀN LẠI TỒN KHO KHI HỦY
        if (currentStatus === 'shipped' && (status === 'preparing' || status === 'cancelled')) {
            await returnInventoryToWarehouse(orderId, transaction);
        }

        // 3. CỘNG TỒN KHO TẠI CỬA HÀNG KHI NHẬN HÀNG
        if (currentStatus === 'shipped' && status === 'delivered') {
            await receiveInventoryAtStore(orderId, transaction);
        }

        await order.update({
            status,
            updated_at: new Date()
        }, { transaction });

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
    try {
        // orderItemId is actually store_order_item_id from frontend mapping
        const orderItem = await db.StoreOrderItem.findByPk(orderItemId, {
            include: [
                {
                    model: db.StoreOrder,
                    as: 'storeOrder',
                    attributes: ['status']
                }
            ]
        });

        if (!orderItem) {
            return { err: 1, msg: 'Order item not found' };
        }

        if (orderItem.storeOrder.status === 'delivered') {
            return {
                err: 1,
                msg: 'Không thể thay đổi số lượng của đơn hàng đã giao'
            };
        }

        if (actual_quantity < 0) {
            return { err: 1, msg: 'Số lượng không hợp lệ' };
        }

        await orderItem.update({
            actual_quantity,
            subtotal: actual_quantity * parseFloat(orderItem.unit_price),
            updated_at: new Date()
        });

        return {
            err: 0,
            msg: 'Cập nhật số lượng thành công',
            data: orderItem
        };
    } catch (error) {
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
