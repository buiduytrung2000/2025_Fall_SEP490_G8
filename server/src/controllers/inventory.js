import * as inventoryService from '../services/inventory';
import db from '../models';

// Get inventory by store_id (for store manager)
export const getInventoryByStore = async (req, res) => {
    try {
        console.log('Inventory route hit:', req.path, req.params, req.query);
        
        // Get store_id from query param or from user's store_id
        let storeId = req.query.store_id || req.params.store_id;
        
        // If not provided, try to get from user's store_id
        if (!storeId && req.user) {
            console.log('Getting store_id from user:', req.user.user_id);
            // Get user info from database to get store_id
            const user = await db.User.findOne({
                where: { user_id: req.user.user_id },
                attributes: ['store_id']
            });
            storeId = user?.store_id;
            console.log('User store_id:', storeId);
        }

        if (!storeId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing store_id or user does not have a store assigned',
                data: []
            });
        }

        const response = await inventoryService.getInventoryByStore(parseInt(storeId));
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        console.error('Error in getInventoryByStore:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at inventory controller: ' + error.message
        });
    }
};

// Update inventory stock
export const updateInventoryStock = async (req, res) => {
    try {
        const { inventory_id } = req.params;
        const { stock, min_stock_level, reorder_point } = req.body;

        if (!inventory_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inventory_id'
            });
        }

        const response = await inventoryService.updateInventoryStock(
            parseInt(inventory_id),
            stock,
            min_stock_level,
            reorder_point
        );
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at inventory controller: ' + error.message
        });
    }
};

/**
 * Get all inventory with filters (for Warehouse)
 * GET /api/v1/inventory/warehouse
 */
export const getAllInventory = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            storeId, 
            categoryId, 
            status,
            search 
        } = req.query;

        const response = await inventoryService.getAllInventoryService({
            page: parseInt(page),
            limit: parseInt(limit),
            storeId,
            categoryId,
            status,
            search
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};

/**
 * Get inventory detail by ID (for Warehouse)
 * GET /api/v1/inventory/warehouse/:inventoryId
 */
export const getInventoryDetail = async (req, res) => {
    try {
        const { inventoryId } = req.params;

        if (!inventoryId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inventory ID'
            });
        }

        const response = await inventoryService.getInventoryDetailService(inventoryId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};

/**
 * Get inventory statistics (for Warehouse)
 * GET /api/v1/inventory/warehouse/statistics
 */
export const getInventoryStatistics = async (req, res) => {
    try {
        const { storeId } = req.query;

        const response = await inventoryService.getInventoryStatisticsService({ storeId });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};

/**
 * Get low stock items (for Warehouse)
 * GET /api/v1/inventory/warehouse/low-stock
 */
export const getLowStockItems = async (req, res) => {
    try {
        const { storeId, page = 1, limit = 10 } = req.query;

        const response = await inventoryService.getLowStockItemsService({
            storeId,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};

/**
 * Update inventory settings (for Warehouse)
 * PATCH /api/v1/inventory/warehouse/:inventoryId
 */
export const updateInventory = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const { min_stock_level, reorder_point } = req.body;

        if (!inventoryId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inventory ID'
            });
        }

        const response = await inventoryService.updateInventoryService({
            inventoryId,
            min_stock_level,
            reorder_point
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};

/**
 * Manual stock adjustment (for Warehouse)
 * POST /api/v1/inventory/warehouse/:inventoryId/adjust
 */
export const adjustStock = async (req, res) => {
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

        const response = await inventoryService.adjustStockService({
            inventoryId,
            adjustment: parseInt(adjustment),
            reason,
            adjustedBy: req.user.user_id
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at inventory controller: ' + error.message
        });
    }
};
