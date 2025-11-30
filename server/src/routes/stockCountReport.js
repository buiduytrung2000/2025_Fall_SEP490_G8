import express from 'express';
import * as stockCountReportController from '../controllers/stockCountReport';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// Get stock count statistics (MUST BE BEFORE other routes)
router.get('/statistics', verifyToken, checkRole('Warehouse', 'CEO'), stockCountReportController.getStockCountStatistics);

// Get all stock count reports with filters
router.get('/', verifyToken, checkRole('Warehouse', 'CEO'), stockCountReportController.getAllStockCountReports);

// Create stock count report
router.post('/', verifyToken, checkRole('Warehouse', 'CEO'), stockCountReportController.createStockCountReport);

// Create multiple stock count reports (batch)
router.post('/batch', verifyToken, checkRole('Warehouse', 'CEO'), stockCountReportController.createBatchStockCountReports);

// Get stock count report by ID
router.get('/:reportId', verifyToken, checkRole('Warehouse', 'CEO'), stockCountReportController.getStockCountReportById);

export default router;

