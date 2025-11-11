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
                model: db.OrderItem,
                as: 'orderItems',
                include: [
                    {
                        model: db.Product,
                        as: 'product',
                        attributes: ['product_id', 'name', 'sku']
                    }
                ]
            }
        ];

        const { count, rows } = await db.Order.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true
        });

        const ordersWithInventory = await Promise.all(rows.map(async (order) => {
            const orderData = order.toJSON();
            
            for (let item of orderData.orderItems) {
                const inventory = await db.Inventory.findOne({
                    where: {
                        store_id: order.store_id,
                        product_id: item.product_id
                    },
                    attributes: ['stock']
                });
                
                item.inventory = inventory ? { stock: inventory.stock } : { stock: 0 };
            }
            
            const totalItems = orderData.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            
            return {
                ...orderData,
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

/**
 * Get order detail by ID with full inventory info
 */
export const getOrderDetailService = async (orderId) => {
    try {
        const order = await db.Order.findOne({
            where: { order_id: orderId },
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
                    model: db.OrderItem,
                    as: 'orderItems',
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
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return { err: 1, msg: 'Order not found' };
        }

        const orderData = order.toJSON();

        for (let item of orderData.orderItems) {
            const inventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: item.product_id
                },
                attributes: ['stock', 'min_stock_level', 'reorder_point']
            });

            item.inventory = inventory ? {
                stock: inventory.stock,
                min_stock_level: inventory.min_stock_level,
                reorder_point: inventory.reorder_point
            } : {
                stock: 0,
                min_stock_level: 0,
                reorder_point: 0
            };
        }

        const totalItems = orderData.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;

        return {
            err: 0,
            msg: 'Get order detail successfully',
            data: {
                ...orderData,
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

        const { count, rows } = await db.Order.findAndCountAll({
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
                    model: db.OrderItem,
                    as: 'orderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            return { ...orderData, totalAmount: parseFloat(totalAmount.toFixed(2)) };
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

        const { count, rows } = await db.Order.findAndCountAll({
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
                    model: db.OrderItem,
                    as: 'orderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            return { ...orderData, totalAmount: parseFloat(totalAmount.toFixed(2)) };
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

        const { count, rows } = await db.Order.findAndCountAll({
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
                    model: db.OrderItem,
                    as: 'orderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            return { ...orderData, totalAmount: parseFloat(totalAmount.toFixed(2)) };
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

        const { count, rows } = await db.Order.findAndCountAll({
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
                    model: db.OrderItem,
                    as: 'orderItems'
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            return { ...orderData, totalAmount: parseFloat(totalAmount.toFixed(2)) };
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

        const statusCounts = await db.Order.findAll({
            where: whereConditions,
            attributes: [
                'status',
                [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const storeCounts = await db.Order.findAll({
            where: whereConditions,
            attributes: [
                'store_id',
                [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'count']
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

        const totalOrders = await db.Order.count({ where: whereConditions });

        const orders = await db.Order.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.OrderItem,
                    as: 'orderItems',
                    attributes: ['subtotal']
                }
            ]
        });

        const totalAmount = orders.reduce((sum, order) => {
            const orderTotal = order.orderItems.reduce((s, item) => s + parseFloat(item.subtotal), 0);
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
 * - pending → confirmed: TRỪ actual_quantity từ inventory
 * - confirmed → pending: CỘNG lại actual_quantity vào inventory
 * - confirmed → cancelled: CỘNG lại actual_quantity vào inventory
 * - shipped → delivered: CỘNG actual_quantity vào store, KHÓA đơn hàng
 * - delivered: KHÔNG CHO SỬA
 */
export const updateOrderStatusService = async ({ orderId, status, updatedBy }) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const order = await db.Order.findByPk(orderId, { transaction });

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

        // 1. PENDING → CONFIRMED: Trừ actual_quantity
        if (currentStatus === 'pending' && status === 'confirmed') {
            await deductInventory(orderId, transaction);
        }

        // 2. CONFIRMED → PENDING: Hoàn lại actual_quantity
        if (currentStatus === 'confirmed' && status === 'pending') {
            await restoreInventory(orderId, transaction);
        }

        // 3. CONFIRMED → CANCELLED: Hoàn lại actual_quantity
        if (currentStatus === 'confirmed' && status === 'cancelled') {
            await restoreInventory(orderId, transaction);
        }

        // 4. SHIPPED → DELIVERED: Cộng vào store (nếu cần logic riêng cho store)
        if (currentStatus === 'shipped' && status === 'delivered') {
            // Inventory đã được trừ từ lúc confirmed, không cần làm gì thêm
            // Hoặc có thể thêm logic cộng vào store inventory nếu có 2 inventory riêng
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
        const order = await db.Order.findByPk(orderId);

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
        const orderItem = await db.OrderItem.findByPk(orderItemId, {
            include: [
                {
                    model: db.Order,
                    as: 'order',
                    attributes: ['status']
                }
            ]
        });

        if (!orderItem) {
            return { err: 1, msg: 'Order item not found' };
        }

        if (orderItem.order.status === 'delivered') {
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

/**
 * TRỪ actual_quantity từ inventory khi confirmed
 */
const deductInventory = async (orderId, transaction) => {
    try {
        const order = await db.Order.findOne({
            where: { order_id: orderId },
            include: [
                {
                    model: db.OrderItem,
                    as: 'orderItems',
                    include: [{ model: db.Product, as: 'product' }]
                }
            ],
            transaction
        });

        if (!order) return;

        for (const item of order.orderItems) {
            const qty = item.actual_quantity || item.quantity;
            
            const inventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: item.product_id
                },
                transaction
            });

            if (!inventory) {
                throw new Error(`Sản phẩm "${item.product.name}" không tồn tại trong kho`);
            }

            if (inventory.stock < qty) {
                throw new Error(`Sản phẩm "${item.product.name}" không đủ số lượng. Tồn kho: ${inventory.stock}, Yêu cầu: ${qty}`);
            }

            await inventory.update({
                stock: inventory.stock - qty,
                updated_at: new Date()
            }, { transaction });

            console.log(`✅ Deducted ${qty} (actual_quantity) of "${item.product.name}" from inventory`);
        }
    } catch (error) {
        console.error('❌ Error deducting inventory:', error);
        throw error;
    }
};

/**
 * HOÀN LẠI actual_quantity vào inventory
 */
const restoreInventory = async (orderId, transaction) => {
    try {
        const order = await db.Order.findOne({
            where: { order_id: orderId },
            include: [
                {
                    model: db.OrderItem,
                    as: 'orderItems',
                    include: [{ model: db.Product, as: 'product' }]
                }
            ],
            transaction
        });

        if (!order) return;

        for (const item of order.orderItems) {
            const qty = item.actual_quantity || item.quantity;
            
            const inventory = await db.Inventory.findOne({
                where: {
                    store_id: order.store_id,
                    product_id: item.product_id
                },
                transaction
            });

            if (inventory) {
                await inventory.update({
                    stock: inventory.stock + qty,
                    updated_at: new Date()
                }, { transaction });

                console.log(`✅ Restored ${qty} (actual_quantity) of "${item.product.name}" to inventory`);
            } else {
                await db.Inventory.create({
                    store_id: order.store_id,
                    product_id: item.product_id,
                    stock: qty,
                    min_stock_level: 10,
                    reorder_point: 20
                }, { transaction });

                console.log(`✅ Created inventory for "${item.product.name}" with ${qty} items`);
            }
        }
    } catch (error) {
        console.error('❌ Error restoring inventory:', error);
        throw error;
    }
};
