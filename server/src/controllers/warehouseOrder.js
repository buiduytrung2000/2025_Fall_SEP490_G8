import * as warehouseOrderService from '../services/warehouseOrder';

// =====================================================
// QUERY CONTROLLERS
// =====================================================

/**
 * Get all orders with pagination and filters
 * GET /api/v1/warehouse-order
 */
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, storeId, supplierId, search } = req.query;

        const response = await warehouseOrderService.getAllOrdersService({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            storeId,
            supplierId,
            search
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get order detail with items
 * GET /api/v1/warehouse-order/:orderId
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

        const response = await warehouseOrderService.getOrderDetailService(orderId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get orders by store
 * GET /api/v1/warehouse-order/store/:storeId
 */
export const getOrdersByStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!storeId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing store ID'
            });
        }

        const response = await warehouseOrderService.getOrdersByStoreService({
            storeId,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get orders by supplier
 * GET /api/v1/warehouse-order/supplier/:supplierId
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

        const response = await warehouseOrderService.getOrdersBySupplierService({
            supplierId,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get orders by status
 * GET /api/v1/warehouse-order/status/:status
 */
export const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Valid values: ${validStatuses.join(', ')}`
            });
        }

        const response = await warehouseOrderService.getOrdersByStatusService({
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get pending orders (priority for warehouse)
 * GET /api/v1/warehouse-order/filter/pending
 */
export const getPendingOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const response = await warehouseOrderService.getPendingOrdersService({
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get orders by date range
 * POST /api/v1/warehouse-order/filter/date-range
 */
export const getOrdersByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: start date and end date'
            });
        }

        const response = await warehouseOrderService.getOrdersByDateRangeService({
            startDate,
            endDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Get order statistics
 * GET /api/v1/warehouse-order/statistics
 */
export const getOrderStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const response = await warehouseOrderService.getOrderStatisticsService({
            startDate,
            endDate
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

// =====================================================
// UPDATE CONTROLLERS
// =====================================================

/**
 * Update order status
 * PATCH /api/v1/warehouse-order/:orderId/status
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

        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid status. Valid values: ${validStatuses.join(', ')}`
            });
        }

        const response = await warehouseOrderService.updateOrderStatusService({
            orderId,
            status,
            updatedBy: req.user.user_id
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Update expected delivery date
 * PATCH /api/v1/warehouse-order/:orderId/delivery
 */
export const updateExpectedDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { expected_delivery } = req.body;

        if (!orderId || !expected_delivery) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order ID and expected delivery date'
            });
        }

        const response = await warehouseOrderService.updateExpectedDeliveryService({
            orderId,
            expected_delivery
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};

/**
 * Update order item actual quantity
 * PATCH /api/v1/warehouse-order/order-item/:orderItemId/quantity
 */
export const updateOrderItemQuantity = async (req, res) => {
    try {
        const { orderItemId } = req.params;
        const { actual_quantity } = req.body;

        if (!orderItemId || actual_quantity === undefined) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order item ID and actual quantity'
            });
        }

        const response = await warehouseOrderService.updateOrderItemQuantityService({
            orderItemId,
            actual_quantity
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse order controller: ' + error.message
        });
    }
};
