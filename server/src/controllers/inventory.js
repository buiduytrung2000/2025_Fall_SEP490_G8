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

