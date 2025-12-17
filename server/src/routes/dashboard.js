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

// =====================================================
// CEO DASHBOARD ROUTES
// =====================================================

// Get company-wide KPIs
router.get('/ceo/kpis', dashboardController.getCompanyKPIs);

// Get company revenue for last 30 days
router.get('/ceo/revenue-last-30-days', dashboardController.getCompanyRevenueLast30Days);

// Get company top products
router.get('/ceo/top-products', dashboardController.getCompanyTopProducts);

// Get revenue mix
router.get('/ceo/revenue-mix', dashboardController.getCompanyRevenueMix);

// Get store performance
router.get('/ceo/store-performance', dashboardController.getStorePerformance);

// Get warehouse orders summary
router.get('/ceo/warehouse-orders', dashboardController.getWarehouseOrdersSummary);

// Get company low stock alerts
router.get('/ceo/low-stock', dashboardController.getCompanyLowStock);

// Get product sales per branch
router.get('/ceo/branch-product-sales', dashboardController.getBranchProductSales);

// Get latest purchase orders
router.get('/ceo/purchase-orders', dashboardController.getRecentPurchaseOrders);

// Get inventory overview
router.get('/ceo/inventory-overview', dashboardController.getInventoryOverview);

// Get recent branch orders
router.get('/ceo/branch-orders', dashboardController.getRecentBranchOrders);

// Get branch orders summary
router.get('/ceo/branch-orders-summary', dashboardController.getBranchOrdersSummary);

export default router;

