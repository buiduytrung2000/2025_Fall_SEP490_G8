import * as orderService from '../services/order';
import { VALID_STATUSES } from '../services/orderValidation';

// =====================================================
// ORDER CONTROLLERS - Warehouse to Supplier Orders
// =====================================================

/**
 * Create batch warehouse-to-supplier orders
 * POST /api/v1/order/batch
 */
export const createBatchOrders = async (req, res) => {
    try {
        const batchData = req.body;

        if (!batchData.orders || !Array.isArray(batchData.orders)) {
            return res.status(400).json({
                err: 1,
                msg: 'Invalid request: orders array is required'
            });
        }

        const response = await orderService.createBatchOrders(batchData);
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Create warehouse-to-supplier order
 * POST /api/v1/order
 */
export const createOrder = async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            created_by: req.user?.user_id || req.user?.id
        };

        if (!orderData.supplier_id || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields: supplier_id and items'
            });
        }

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
 * Get all orders with filters and pagination
 * GET /api/v1/order
 */
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, supplierId, search } = req.query;

        // Validate status if provided
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        const response = await orderService.getAllOrders({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            supplierId: supplierId ? parseInt(supplierId) : undefined,
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
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at order controller: ' + error.message
        });
    }
};

/**
 * Update order status with validation
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

        // Validate status using the three-state system
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        const response = await orderService.updateOrderStatus({
            orderId: parseInt(orderId),
            status,
            updatedBy: req.user?.user_id
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
 * Update order details (only for pending orders)
 * PUT /api/v1/order/:orderId
 */
export const updateOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderData = req.body;

        if (!orderId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing order ID'
            });
        }

        const response = await orderService.updateOrder({
            orderId: parseInt(orderId),
            orderData,
            updatedBy: req.user?.user_id
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
 * Update order items (only for pending orders)
 * PUT /api/v1/order/:orderId/items
 */
export const updateOrderItems = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { items } = req.body;

        if (!orderId || !items || !Array.isArray(items)) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order ID and items array'
            });
        }

        const response = await orderService.updateOrderItems({
            orderId: parseInt(orderId),
            items,
            updatedBy: req.user?.user_id
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
 * Update expected delivery date (only for pending orders)
 * PATCH /api/v1/order/:orderId/delivery
 */
export const updateExpectedDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { expected_delivery } = req.body;

        if (!orderId || !expected_delivery) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order ID and expected_delivery'
            });
        }

        const response = await orderService.updateExpectedDelivery({
            orderId: parseInt(orderId),
            expectedDelivery: expected_delivery,
            updatedBy: req.user?.user_id
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
 * Get pending orders
 * GET /api/v1/order/pending
 */
export const getPendingOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const response = await orderService.getOrdersByStatus({
            status: 'pending',
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

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
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
 * Delete order (only pending or cancelled orders)
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

