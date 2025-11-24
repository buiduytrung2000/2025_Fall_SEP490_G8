import db from '../models';
import { Op } from 'sequelize';

// =====================================================
// ORDER SERVICES - Warehouse to Supplier Orders
// =====================================================

/**
 * Create batch warehouse-to-supplier orders
 */
export const createBatchOrders = (batchData) => new Promise(async (resolve, reject) => {
    try {
        const { orders } = batchData;

        if (!orders || orders.length === 0) {
            return resolve({ err: 1, msg: 'No orders provided' });
        }

        const results = {
            successful: [],
            failed: []
        };

        // Process each order
        for (let i = 0; i < orders.length; i++) {
            const orderData = orders[i];
            try {
                const result = await createOrder(orderData);

                if (result.err === 0) {
                    results.successful.push({
                        index: i,
                        supplier_id: orderData.supplier_id,
                        order_id: result.data.order_id,
                        total_amount: result.data.total_amount
                    });
                } else {
                    results.failed.push({
                        index: i,
                        supplier_id: orderData.supplier_id,
                        error: result.msg
                    });
                }
            } catch (error) {
                results.failed.push({
                    index: i,
                    supplier_id: orderData.supplier_id,
                    error: error.message
                });
            }
        }

        // Determine overall result
        if (results.failed.length === 0) {
            resolve({
                err: 0,
                msg: `Successfully created ${results.successful.length} order(s)`,
                data: {
                    successful: results.successful,
                    failed: results.failed,
                    total: orders.length,
                    successCount: results.successful.length,
                    failCount: results.failed.length
                }
            });
        } else if (results.successful.length === 0) {
            resolve({
                err: 1,
                msg: 'All orders failed to create',
                data: {
                    successful: results.successful,
                    failed: results.failed,
                    total: orders.length,
                    successCount: results.successful.length,
                    failCount: results.failed.length
                }
            });
        } else {
            resolve({
                err: 0,
                msg: `Created ${results.successful.length} order(s), ${results.failed.length} failed`,
                data: {
                    successful: results.successful,
                    failed: results.failed,
                    total: orders.length,
                    successCount: results.successful.length,
                    failCount: results.failed.length
                }
            });
        }
    } catch (error) {
        reject(error);
    }
});

/**
 * Create warehouse-to-supplier order
 */
export const createOrder = (orderData) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { supplier_id, created_by, items, expected_delivery, notes } = orderData;

        if (!supplier_id || !created_by || !items || items.length === 0) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'Missing required fields: supplier_id, created_by, items' });
        }

        // Verify supplier exists
        const supplier = await db.Supplier.findByPk(supplier_id);
        if (!supplier) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'Supplier not found' });
        }

        // Calculate total amount
        let total = 0;
        for (const item of items) {
            const quantity = parseInt(item.quantity);
            const unitPrice = parseFloat(item.unit_price);
            total += quantity * unitPrice;
        }

        // Create order
        const order = await db.Order.create({
            supplier_id,
            created_by,
            status: 'pending',
            expected_delivery: expected_delivery || null
        }, { transaction });

        // Create order items
        for (const item of items) {
            const quantity = parseInt(item.quantity);
            const unitPrice = parseFloat(item.unit_price);
            const subtotal = quantity * unitPrice;

            // Get product info
            let product = null;
            if (item.product_id) {
                product = await db.Product.findByPk(item.product_id, {
                    include: [
                        {
                            model: db.Unit,
                            as: 'baseUnit',
                            attributes: ['unit_id', 'name', 'symbol']
                        }
                    ]
                });
            } else if (item.sku) {
                product = await db.Product.findOne({
                    where: { sku: item.sku },
                    include: [
                        {
                            model: db.Unit,
                            as: 'baseUnit',
                            attributes: ['unit_id', 'name', 'symbol']
                        }
                    ]
                });
            }

            if (!product) {
                await transaction.rollback();
                return resolve({
                    err: 1,
                    msg: `Product not found: ${item.product_id || item.sku}`
                });
            }

            // Get unit info
            let unitId = item.unit_id || product.base_unit_id;
            let conversionToBase = 1;

            if (item.unit_id && item.unit_id !== product.base_unit_id) {
                const productUnit = await db.ProductUnit.findOne({
                    where: {
                        product_id: product.product_id,
                        unit_id: item.unit_id
                    }
                });

                if (productUnit) {
                    conversionToBase = parseFloat(productUnit.conversion_to_base);
                }
            }

            const quantityInBase = quantity * conversionToBase;

            await db.OrderItem.create({
                order_id: order.order_id,
                product_id: product.product_id,
                quantity,
                unit_price: unitPrice,
                subtotal,
                unit_id: unitId,
                quantity_in_base: quantityInBase
            }, { transaction });
        }

        await transaction.commit();
        resolve({
            err: 0,
            msg: 'Order created successfully',
            data: {
                order_id: order.order_id,
                total_amount: total
            }
        });
    } catch (error) {
        await transaction.rollback();
        reject(error);
    }
});

/**
 * Get all orders with filters and pagination
 */
export const getAllOrders = async ({ page, limit, status, supplierId, search }) => {
    try {
        const offset = (page - 1) * limit;

        const whereConditions = {};
        if (status) whereConditions.status = status;
        if (supplierId) whereConditions.supplier_id = supplierId;

        const includeConditions = [
            {
                model: db.Supplier,
                as: 'supplier',
                attributes: ['supplier_id', 'name', 'contact', 'email', 'address'],
                ...(search && {
                    where: { name: { [Op.like]: `%${search}%` } }
                })
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
                    },
                    {
                        model: db.Unit,
                        as: 'unit',
                        attributes: ['unit_id', 'name', 'symbol']
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

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalItems = orderData.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;

            return {
                ...orderData,
                totalItems,
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: 'Get all orders successfully',
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
 * Get order detail by ID
 */
export const getOrderDetail = async (orderId) => {
    try {
        const order = await db.Order.findOne({
            where: { order_id: orderId },
            include: [
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
                        },
                        {
                            model: db.Unit,
                            as: 'unit',
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
 * Update order status
 */
export const updateOrderStatus = async ({ orderId, status, updatedBy }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const order = await db.Order.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        const currentStatus = order.status;

        // Only run inventory logic when status changes to 'confirmed'
        if (status === 'confirmed' && currentStatus !== 'confirmed') {
            const orderItems = await db.OrderItem.findAll({ where: { order_id: orderId }, transaction });

            for (const item of orderItems) {
                // Use WarehouseInventory for warehouse-to-supplier orders
                const inventory = await db.WarehouseInventory.findOne({ where: { product_id: item.product_id }, transaction });

                if (inventory) {
                    // Use the correct field name 'stock'
                    await inventory.increment('stock', { by: item.quantity, transaction });
                } else {
                    // Create a new WarehouseInventory record if it doesn't exist
                    await db.WarehouseInventory.create({
                        product_id: item.product_id,
                        stock: item.quantity, // Use the correct field name 'stock'
                    }, { transaction });
                }
            }
        }

        // Update order status
        await order.update({ status }, { transaction });

        await transaction.commit();

        return {
            err: 0,
            msg: 'Order status updated successfully',
            data: { order_id: orderId, status }
        };
    } catch (error) {
        await transaction.rollback();
        console.error('Failed to update order status:', error);
        throw error;
    }
};


/**
 * Get orders by supplier
 */
export const getOrdersBySupplier = async ({ supplierId, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.Order.findAndCountAll({
            where: { supplier_id: supplierId },
            include: [
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
            return {
                ...orderData,
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
export const getOrdersByStatus = async ({ status, page, limit }) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.Order.findAndCountAll({
            where: { status },
            include: [
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
            return {
                ...orderData,
                totalAmount: parseFloat(totalAmount.toFixed(2))
            };
        });

        return {
            err: 0,
            msg: 'Get orders by status successfully',
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
 * Delete order
 */
export const deleteOrder = async (orderId) => {
    const transaction = await db.sequelize.transaction();
    try {
        const order = await db.Order.findByPk(orderId);

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        // Only allow deletion of pending or cancelled orders
        if (!['pending', 'cancelled'].includes(order.status)) {
            await transaction.rollback();
            return {
                err: 1,
                msg: 'Can only delete orders with status "pending" or "cancelled"'
            };
        }

        await order.destroy({ transaction });
        await transaction.commit();

        return {
            err: 0,
            msg: 'Order deleted successfully',
            data: { order_id: orderId }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

