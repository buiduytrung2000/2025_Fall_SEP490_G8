import express from 'express';
import * as warehouseInventoryController from '../controllers/warehouseInventory';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// Get warehouse inventory statistics (MUST BE BEFORE other routes)
router.get('/statistics', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.getWarehouseInventoryStatistics);

// Get all warehouse inventory with filters
router.get('/', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.getAllWarehouseInventory);

// Create warehouse inventory
router.post('/', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.createWarehouseInventory);

// Get warehouse inventory detail by ID
router.get('/:inventoryId', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.getWarehouseInventoryDetail);

// Update warehouse inventory settings
router.patch('/:inventoryId', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.updateWarehouseInventory);

// Manual stock adjustment
router.post('/:inventoryId/adjust', verifyToken, checkRole('Warehouse', 'CEO'), warehouseInventoryController.adjustWarehouseStock);

export default router;

