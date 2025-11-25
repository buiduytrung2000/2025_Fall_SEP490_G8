import * as orderService from '../services/order';
import db from '../models';
import { Op } from 'sequelize';

const findSupplierIdForUser = async (user) => {
    if (!user) return null;

    if (user.user_id) {
        const supplierByAccount = await db.Supplier.findOne({
            where: { user_id: user.user_id },
            attributes: ['supplier_id']
        });
        if (supplierByAccount) return supplierByAccount.supplier_id;
    }

    const conditions = [];
    if (user.email) conditions.push({ email: user.email });
    if (user.username) conditions.push({ name: user.username });
    if (!conditions.length) return null;

    const supplier = await db.Supplier.findOne({
        where: { [Op.or]: conditions },
        attributes: ['supplier_id']
    });
    return supplier?.supplier_id || null;
};

const ensureSupplierLinked = async (req, res) => {
    const supplierId = await findSupplierIdForUser(req.user);
    if (!supplierId) {
        res.status(403).json({
            err: 1,
            msg: 'Tài khoản nhà cung cấp chưa được liên kết với bất kỳ nhà cung cấp nào.'
        });
        return null;
    }
    return supplierId;
};

// =====================================================
// ORDER CONTROLLERS - Warehouse to Supplier Orders
// =====================================================

/**
 * Create batch warehouse-to-supplier orders
 * POST /api/v1/order/batch
 */
export const createBatchOrders = async (req, res) => {
    try {
        const { orders, expected_delivery, notes } = req.body;

        console.log('Create batch warehouse orders request:', {
            ordersCount: orders?.length,
            user: req.user
        });

        // Get created_by from user token
        const createdBy = req.user?.user_id || req.user?.id || req.body.created_by;

        if (!createdBy) {
            return res.status(400).json({
                err: 1,
                msg: 'User not authenticated or missing user_id'
            });
        }

        // Validation: Check orders array
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({
                err: 1,
                msg: 'Must provide at least one order'
            });
        }

        // Validate each order
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (!order.supplier_id) {
                return res.status(400).json({
                    err: 1,
                    msg: `Order ${i + 1}: supplier_id is required`
                });
            }

            if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
                return res.status(400).json({
                    err: 1,
                    msg: `Order ${i + 1}: Must have at least one item`
                });
            }

            // Validate items in each order
            for (let j = 0; j < order.items.length; j++) {
                const item = order.items[j];

                if (!item.product_id && !item.sku) {
                    return res.status(400).json({
                        err: 1,
                        msg: `Order ${i + 1}, Item ${j + 1}: Either product_id or sku is required`
                    });
                }

                const quantity = parseInt(item.quantity);
                if (isNaN(quantity) || quantity <= 0) {
                    return res.status(400).json({
                        err: 1,
                        msg: `Order ${i + 1}, Item ${j + 1}: Quantity must be greater than 0`
                    });
                }

                const unitPrice = parseFloat(item.unit_price);
                if (isNaN(unitPrice) || unitPrice <= 0) {
                    return res.status(400).json({
                        err: 1,
                        msg: `Order ${i + 1}, Item ${j + 1}: Unit price must be greater than 0`
                    });
                }
            }
        }

        // Prepare batch data
        const batchData = {
            orders: orders.map(order => ({
                supplier_id: parseInt(order.supplier_id),
                created_by: parseInt(createdBy),
                items: order.items,
                expected_delivery: order.expected_delivery || expected_delivery || null,
                notes: order.notes || notes || null
            }))
        };

        const response = await orderService.createBatchOrders(batchData);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at batch order controller: ' + error.message
        });
    }
};

/**
 * Create warehouse-to-supplier order
 * POST /api/v1/order
 */
export const createOrder = async (req, res) => {
    try {
        const { supplier_id, items, expected_delivery, notes } = req.body;

        console.log('Create warehouse order request:', {
            body: req.body,
            user: req.user
        });

        // Get created_by from user token
        const createdBy = req.user?.user_id || req.user?.id || req.body.created_by;

        if (!createdBy) {
            return res.status(400).json({
                err: 1,
                msg: 'User not authenticated or missing user_id'
            });
        }

        // Validation: Check supplier_id
        if (!supplier_id) {
            return res.status(400).json({
                err: 1,
                msg: 'supplier_id is required for warehouse orders'
            });
        }

        // Validation: Check items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                err: 1,
                msg: 'Order must have at least one item'
            });
        }

        // Validation: Check each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Validate product_id or sku
            if (!item.product_id && !item.sku) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Either product_id or sku is required`
                });
            }

            // Validate quantity
            const quantity = parseInt(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Quantity is required and must be greater than 0`
                });
            }

            // Validate unit_price
            const unitPrice = parseFloat(item.unit_price);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Unit price is required and must be greater than 0`
                });
            }
        }

        const orderData = {
            supplier_id: parseInt(supplier_id),
            created_by: parseInt(createdBy),
            items: items,
            expected_delivery: expected_delivery || null,
            notes: notes || null
        };

        const response = await orderService.createOrder(orderData);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Get all warehouse orders with filters
 * GET /api/v1/order
 */
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, supplierId, search } = req.query;

        let effectiveSupplierId = supplierId ? parseInt(supplierId) : undefined;

        if (req.user?.role === 'Supplier') {
            const supplierIdFromUser = await ensureSupplierLinked(req, res);
            if (!supplierIdFromUser) return;
            effectiveSupplierId = supplierIdFromUser;
        }

        const response = await orderService.getAllOrders({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            supplierId: effectiveSupplierId,
            search
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Get order detail by ID
 * GET /api/v1/order/:orderId
 */
export const getOrderDetail = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing order ID'
            });
        }

        const response = await orderService.getOrderDetail(parseInt(orderId));

        if (req.user?.role === 'Supplier' && response.err === 0) {
            const supplierIdFromUser = await ensureSupplierLinked(req, res);
            if (!supplierIdFromUser) return;

            const orderSupplierId = response.data?.supplier?.supplier_id;
            if (orderSupplierId !== supplierIdFromUser) {
                return res.status(403).json({
                    err: 1,
                    msg: 'Bạn không có quyền xem đơn hàng này.'
                });
            }
        }

        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Update order status
 * PATCH /api/v1/order/:orderId/status
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order ID and status'
            });
        }

        const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        let supplierGuardId = null;
        if (req.user?.role === 'Supplier') {
            supplierGuardId = await ensureSupplierLinked(req, res);
            if (!supplierGuardId) return;
            const allowedForSupplier = ['confirmed', 'cancelled'];
            if (!allowedForSupplier.includes(status)) {
                return res.status(403).json({
                    err: 1,
                    msg: 'Nhà cung cấp chỉ có thể xác nhận hoặc từ chối đơn hàng'
                });
            }
        }

        const response = await orderService.updateOrderStatus({
            orderId: parseInt(orderId),
            status,
            updatedBy: req.user?.user_id,
            supplierGuardId
        });

        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Get orders by supplier
 * GET /api/v1/order/supplier/:supplierId
 */
export const getOrdersBySupplier = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!supplierId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing supplier ID'
            });
        }

        const response = await orderService.getOrdersBySupplier({
            supplierId: parseInt(supplierId),
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Get orders by status
 * GET /api/v1/order/status/:status
 */
export const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const response = await orderService.getOrdersByStatus({
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Delete order
 * DELETE /api/v1/order/:orderId
 */
export const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing order ID'
            });
        }

        const response = await orderService.deleteOrder(parseInt(orderId));
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

