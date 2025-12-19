import * as warehouseInventoryService from '../services/warehouseInventory';

/**
 * Get all warehouse inventory with filters
 * GET /api/v1/warehouse-inventory
 */
export const getAllWarehouseInventory = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            categoryId, 
            status,
            search,
            supplierId
        } = req.query;

        const response = await warehouseInventoryService.getAllWarehouseInventoryService({
            page: parseInt(page),
            limit: parseInt(limit),
            categoryId,
            status,
            search,
            supplierId: supplierId ? parseInt(supplierId) : undefined
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

/**
 * Get warehouse inventory detail by ID
 * GET /api/v1/warehouse-inventory/:inventoryId
 */
export const getWarehouseInventoryDetail = async (req, res) => {
    try {
        const { inventoryId } = req.params;

        if (!inventoryId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inventory ID'
            });
        }

        const response = await warehouseInventoryService.getWarehouseInventoryDetailService(inventoryId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

/**
 * Get warehouse inventory statistics
 * GET /api/v1/warehouse-inventory/statistics
 */
export const getWarehouseInventoryStatistics = async (req, res) => {
    try {
        const response = await warehouseInventoryService.getWarehouseInventoryStatisticsService();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

/**
 * Update warehouse inventory settings
 * PATCH /api/v1/warehouse-inventory/:inventoryId
 */
export const updateWarehouseInventory = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const { min_stock_level, reorder_point, location, notes } = req.body;

        if (!inventoryId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inventory ID'
            });
        }

        const response = await warehouseInventoryService.updateWarehouseInventoryService({
            inventoryId,
            min_stock_level,
            reorder_point,
            location,
            notes
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

/**
 * Manual stock adjustment
 * POST /api/v1/warehouse-inventory/:inventoryId/adjust
 */
export const adjustWarehouseStock = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const { adjustment, reason } = req.body;

        if (!inventoryId || adjustment === undefined || !reason) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: inventory ID, adjustment, and reason'
            });
        }

        if (typeof adjustment !== 'number') {
            return res.status(400).json({
                err: 1,
                msg: 'Adjustment must be a number (positive to add, negative to subtract)'
            });
        }

        const response = await warehouseInventoryService.adjustWarehouseStockService({
            inventoryId,
            adjustment: parseInt(adjustment),
            reason,
            adjustedBy: req.user.user_id
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

/**
 * Create warehouse inventory
 * POST /api/v1/warehouse-inventory
 */
export const createWarehouseInventory = async (req, res) => {
    try {
        const { product_id, stock, min_stock_level, reorder_point, location, notes } = req.body;

        if (!product_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing product_id'
            });
        }

        const response = await warehouseInventoryService.createWarehouseInventoryService({
            productId: product_id,
            stock,
            min_stock_level,
            reorder_point,
            location,
            notes
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at warehouse inventory controller: ' + error.message
        });
    }
};

