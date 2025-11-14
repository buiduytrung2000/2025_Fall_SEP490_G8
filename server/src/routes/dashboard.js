import express from 'express';
import * as dashboardController from '../controllers/dashboard';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get today's KPIs
router.get('/kpis', dashboardController.getTodayKPIs);

// Get revenue for last 7 days
router.get('/revenue-last-7-days', dashboardController.getRevenueLast7Days);

// Get top selling products
router.get('/top-products', dashboardController.getTopSellingProducts);

// Get today's schedules
router.get('/today-schedules', dashboardController.getTodaySchedules);

// Get employee statistics
router.get('/employee-stats', dashboardController.getEmployeeStats);

// Get low stock products
router.get('/low-stock', dashboardController.getLowStockProducts);

export default router;

