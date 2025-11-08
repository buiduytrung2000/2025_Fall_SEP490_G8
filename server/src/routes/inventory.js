import express from 'express';
import * as inventoryController from '../controllers/inventory';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// Get inventory by store_id (for store manager)
// If store_id not provided, will use user's store_id
router.get('/store', verifyToken, inventoryController.getInventoryByStore);
router.get('/store/:store_id', verifyToken, inventoryController.getInventoryByStore);

// Update inventory stock
router.put('/:inventory_id', verifyToken, inventoryController.updateInventoryStock);

export default router;

