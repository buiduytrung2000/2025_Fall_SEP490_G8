import db from '../models';
import { Op } from 'sequelize';
import {
    isOrderEditable,
    isValidStatusTransition,
    validateOrderEditPermission,
    validateStatusTransition
} from './orderValidation';

const buildPackageMetaMap = async (productIds = []) => {
    if (!productIds.length) return {};

    const productUnits = await db.ProductUnit.findAll({
        where: { product_id: productIds },
        include: [
            {
                model: db.Unit,
                as: 'unit',
                attributes: ['unit_id', 'name', 'symbol']
            }
        ],
        order: [['conversion_to_base', 'DESC']]
    });

    const metaMap = {};
    productUnits.forEach((pu) => {
        const plain = pu.get ? pu.get({ plain: true }) : JSON.parse(JSON.stringify(pu));
        const conversion = Number(plain.conversion_to_base) || 0;
        if (!plain.product_id) return;
        if (!metaMap[plain.product_id] || conversion > metaMap[plain.product_id].conversion_to_base) {
            metaMap[plain.product_id] = {
                conversion_to_base: conversion,
                unit: plain.unit
                    ? {
                        unit_id: plain.unit.unit_id,
                        name: plain.unit.name,
                        symbol: plain.unit.symbol
                    }
                    : null
            };
        }
    });

    return metaMap;
};

export const generateOrderCode = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let exists = true;

    while (exists) {
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        // Ensure uniqueness
        const count = await db.Order.count({ where: { order_code: code } });
        if (count === 0) exists = false;
    }

    return code;
};

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
                const result = await createOrder(orderData, orderData.supplier_id);

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
export const createOrder = (orderData, defaultSupplierId = null) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { supplier_id, items, created_by, expected_delivery } = orderData;

        // Validate required fields
        const effectiveSupplierId = supplier_id || defaultSupplierId;

        if (!effectiveSupplierId || !items || items.length === 0 || !created_by) {
            await transaction.rollback();
            return resolve({
                err: 1,
                msg: 'Missing required fields: supplier_id, items, created_by'
            });
        }

        // Verify supplier exists
        const supplier = await db.Supplier.findByPk(effectiveSupplierId);
        if (!supplier) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'Supplier not found' });
        }

        // Create order
        const orderCode = await generateOrderCode();
        const order = await db.Order.create({
            supplier_id: effectiveSupplierId,
            created_by,
            order_code: orderCode,
            status: 'pending',
            expected_delivery: expected_delivery || null
        }, { transaction });

        let total = 0;

        // Create order items
        for (const item of items) {
            const { product_id, quantity, unit_price, unit_id } = item;

            if (!product_id || !quantity || !unit_price) {
                await transaction.rollback();
                return resolve({
                    err: 1,
                    msg: 'Each item must have product_id, quantity, and unit_price'
                });
            }

            // Verify product exists
            const product = await db.Product.findByPk(product_id);
            if (!product) {
                await transaction.rollback();
                return resolve({ err: 1, msg: `Product with ID ${product_id} not found` });
            }

            const subtotal = quantity * unit_price;
            total += subtotal;

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
                unit_price: unit_price,
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

        const productIds = [];
        rows.forEach(order => {
            order.orderItems?.forEach(item => {
                if (item.product_id) productIds.push(item.product_id);
            });
        });
        const packageMetaMap = await buildPackageMetaMap([...new Set(productIds)]);

        const ordersWithTotals = rows.map(order => {
            const orderData = order.toJSON();
            const totalItems = orderData.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const totalAmount = orderData.orderItems?.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;
            const packageQuantity = orderData.orderItems?.reduce((sum, item) => {
                const meta = packageMetaMap[item.product_id];
                if (meta?.conversion_to_base) {
                    const baseQty = Number(item.quantity_in_base) || Number(item.quantity) || 0;
                    return sum + baseQty / meta.conversion_to_base;
                }
                return sum + (Number(item.quantity) || 0);
            }, 0) || 0;
            const packageUnitLabel = (() => {
                const candidate = orderData.orderItems?.find(it => packageMetaMap[it.product_id]?.unit);
                if (candidate) {
                    const unitInfo = packageMetaMap[candidate.product_id].unit;
                    return unitInfo?.name || unitInfo?.symbol || 'thùng';
                }
                const fallbackUnit = orderData.orderItems?.[0]?.unit;
                return fallbackUnit?.name || fallbackUnit?.symbol || 'đơn vị';
            })();

            return {
                ...orderData,
                totalItems,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                displayPackageQuantity: parseFloat(packageQuantity.toFixed(2)),
                displayPackageUnit: packageUnitLabel
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
        const productIds = orderData.orderItems?.map(item => item.product_id).filter(Boolean) || [];
        const packageMetaMap = await buildPackageMetaMap([...new Set(productIds)]);

        const enhancedItems = orderData.orderItems?.map(item => {
            const meta = packageMetaMap[item.product_id];
            const conversion = meta?.conversion_to_base || null;
            const baseQuantity = Number(item.quantity_in_base) || Number(item.quantity) || 0;
            let displayQuantity = baseQuantity;
            let displayUnitPrice = Number(item.unit_price) || 0;
            let displayUnitLabel = item.unit?.name || item.unit?.symbol || 'đơn vị';

            if (conversion && conversion > 0) {
                displayQuantity = Number((baseQuantity / conversion).toFixed(2));
                displayUnitPrice = Number((displayUnitPrice * conversion).toFixed(2));
                displayUnitLabel = meta.unit?.name || meta.unit?.symbol || 'thùng';
            }

            return {
                ...item,
                display_quantity: displayQuantity,
                display_unit_price: displayUnitPrice,
                display_unit_label: displayUnitLabel
            };
        }) || [];

        const totalItems = enhancedItems.reduce((sum, item) => sum + (Number(item.display_quantity) || 0), 0);
        const totalAmount = enhancedItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) || 0;

        return {
            err: 0,
            msg: 'Get order detail successfully',
            data: {
                ...orderData,
                orderItems: enhancedItems,
                totalItems,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                isEditable: isOrderEditable(orderData.status) // Add editable flag
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Update order status with validation
 */
export const updateOrderStatus = async ({ orderId, status, updatedBy, supplierGuardId }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const order = await db.Order.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        if (supplierGuardId && order.supplier_id !== supplierGuardId) {
            await transaction.rollback();
            return { err: 1, msg: 'Bạn không có quyền cập nhật đơn hàng này' };
        }

        const currentStatus = order.status;
        if (supplierGuardId && currentStatus !== 'pending') {
            await transaction.rollback();
            return { err: 1, msg: 'Đơn hàng đã được xử lý, không thể cập nhật nữa' };
        }

        // Validate status transition
        const transitionValidation = validateStatusTransition(currentStatus, status);
        if (!transitionValidation.isValid) {
            await transaction.rollback();
            return { err: 1, msg: transitionValidation.message };
        }

        // Only run inventory logic when status changes to 'confirmed'
        if (status === 'confirmed' && currentStatus !== 'confirmed') {
            const orderItems = await db.OrderItem.findAll({ where: { order_id: orderId }, transaction });

            // Nếu là đơn giao thẳng tới cửa hàng (direct_to_store), cộng vào tồn kho store
            if (order.direct_to_store && order.target_store_id) {
                for (const item of orderItems) {
                    const inventory = await db.Inventory.findOne({
                        where: {
                            store_id: order.target_store_id,
                            product_id: item.product_id
                        },
                        transaction
                    });

                    if (inventory) {
                        await inventory.increment('stock', { by: item.quantity_in_base, transaction });
                    } else {
                        await db.Inventory.create({
                            store_id: order.target_store_id,
                            product_id: item.product_id,
                            stock: item.quantity_in_base,
                            min_stock_level: 0,
                            reorder_point: 0
                        }, { transaction });
                    }
                }
            } else {
                // Ngược lại: đơn nhập kho tổng, cộng vào WarehouseInventory như cũ
                for (const item of orderItems) {
                    const inventory = await db.WarehouseInventory.findOne({ where: { product_id: item.product_id }, transaction });

                    if (inventory) {
                        await inventory.increment('stock', { by: item.quantity_in_base, transaction });
                    } else {
                        await db.WarehouseInventory.create({
                            product_id: item.product_id,
                            stock: item.quantity_in_base,
                        }, { transaction });
                    }
                }
            }
        }

        // Update order status
        await order.update({ status }, { transaction });

        await transaction.commit();

        return {
            err: 0,
            msg: 'Order status updated successfully',
            data: { order_id: orderId, status, previousStatus: currentStatus }
        };
    } catch (error) {
        await transaction.rollback();
        console.error('Failed to update order status:', error);
        throw error;
    }
};

/**
 * Update order details (only for pending orders)
 */
export const updateOrder = async ({ orderId, orderData, updatedBy }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const order = await db.Order.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        // Check if order can be edited
        const editValidation = validateOrderEditPermission(order);
        if (!editValidation.isValid) {
            await transaction.rollback();
            return { err: 1, msg: editValidation.message };
        }

        // Update order fields (only allow updating certain fields)
        const allowedFields = ['expected_delivery'];
        const updateData = {};

        allowedFields.forEach(field => {
            if (orderData[field] !== undefined) {
                updateData[field] = orderData[field];
            }
        });

        if (Object.keys(updateData).length > 0) {
            await order.update(updateData, { transaction });
        }

        await transaction.commit();

        return {
            err: 0,
            msg: 'Order updated successfully',
            data: { order_id: orderId }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Update order items (only for pending orders)
 */
export const updateOrderItems = async ({ orderId, items, updatedBy }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const order = await db.Order.findByPk(orderId, { transaction });

        if (!order) {
            await transaction.rollback();
            return { err: 1, msg: 'Order not found' };
        }

        // Check if order can be edited
        const editValidation = validateOrderEditPermission(order);
        if (!editValidation.isValid) {
            await transaction.rollback();
            return { err: 1, msg: editValidation.message };
        }

        // Delete existing order items
        await db.OrderItem.destroy({ where: { order_id: orderId }, transaction });

        // Create new order items
        for (const item of items) {
            const { product_id, quantity, unit_price, unit_id } = item;

            if (!product_id || !quantity || !unit_price) {
                await transaction.rollback();
                return {
                    err: 1,
                    msg: 'Each item must have product_id, quantity, and unit_price'
                };
            }

            // Verify product exists
            const product = await db.Product.findByPk(product_id);
            if (!product) {
                await transaction.rollback();
                return { err: 1, msg: `Product with ID ${product_id} not found` };
            }

            const subtotal = quantity * unit_price;

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
                order_id: orderId,
                product_id: product.product_id,
                quantity,
                unit_price: unit_price,
                subtotal,
                unit_id: unitId,
                quantity_in_base: quantityInBase
            }, { transaction });
        }

        await transaction.commit();

        return {
            err: 0,
            msg: 'Order items updated successfully',
            data: { order_id: orderId }
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Update expected delivery date (only for pending orders)
 */
export const updateExpectedDelivery = async ({ orderId, expectedDelivery, updatedBy }) => {
    try {
        const order = await db.Order.findByPk(orderId);

        if (!order) {
            return { err: 1, msg: 'Order not found' };
        }

        // Check if order can be edited
        const editValidation = validateOrderEditPermission(order);
        if (!editValidation.isValid) {
            return { err: 1, msg: editValidation.message };
        }

        // Update expected delivery date
        await order.update({
            expected_delivery: expectedDelivery,
            updated_at: new Date()
        });

        return {
            err: 0,
            msg: 'Expected delivery date updated successfully',
            data: {
                order_id: orderId,
                expected_delivery: expectedDelivery
            }
        };
    } catch (error) {
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
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                isEditable: isOrderEditable(orderData.status)
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
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                isEditable: isOrderEditable(orderData.status)
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
 * Delete order (only pending or cancelled orders)
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
