import express from 'express';
import * as inventoryController from '../controllers/inventory';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// Get inventory by store_id (for Store Manager)
router.get('/store', verifyToken, inventoryController.getInventoryByStore);
router.get('/store/:store_id', verifyToken, inventoryController.getInventoryByStore);

// Update inventory stock (for Store Manager)
router.put('/:inventory_id', verifyToken, inventoryController.updateInventoryStock);


// Get inventory statistics (MUST BE BEFORE other routes)
router.get('/warehouse/statistics', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.getInventoryStatistics);

// Get low stock items (MUST BE BEFORE /:inventoryId)
router.get('/warehouse/low-stock', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.getLowStockItems);

// Get all inventory with filters
router.get('/warehouse', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.getAllInventory);

// Get inventory detail by ID
router.get('/warehouse/:inventoryId', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.getInventoryDetail);

// Update inventory settings
router.patch('/warehouse/:inventoryId', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.updateInventory);

// Manual stock adjustment
router.post('/warehouse/:inventoryId/adjust', verifyToken, checkRole('Warehouse', 'CEO'), inventoryController.adjustStock);

export default router;

