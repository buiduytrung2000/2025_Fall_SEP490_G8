import express from 'express';
import * as warehouseOrderController from '../controllers/warehouseOrder';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// =====================================================
// MIDDLEWARE - Authentication & Authorization
// =====================================================
router.use(verifyToken);
router.use(checkRole('Warehouse', 'CEO'));

// =====================================================
// QUERY ROUTES - Get Orders
// =====================================================

// Get all orders with filters
router.get('/', warehouseOrderController.getAllOrders);

// Get order statistics
router.get('/statistics', warehouseOrderController.getOrderStatistics);

// Get pending orders
router.get('/filter/pending', warehouseOrderController.getPendingOrders);

// Get orders by date range
router.post('/filter/date-range', warehouseOrderController.getOrdersByDateRange);

// Get orders by store
router.get('/store/:storeId', warehouseOrderController.getOrdersByStore);

// Get orders by supplier
router.get('/supplier/:supplierId', warehouseOrderController.getOrdersBySupplier);

// Get orders by status
router.get('/status/:status', warehouseOrderController.getOrdersByStatus);

// Get order detail by ID (MUST BE AFTER specific routes)
router.get('/:orderId', warehouseOrderController.getOrderDetail);

// =====================================================
// UPDATE ROUTES - Modify Orders
// =====================================================

// Update order status
router.patch('/:orderId/status', warehouseOrderController.updateOrderStatus);

// Update expected delivery date
router.patch('/:orderId/delivery', warehouseOrderController.updateExpectedDelivery);

// Update order item actual quantity
router.patch('/order-item/:orderItemId/quantity', warehouseOrderController.updateOrderItemQuantity);

// Update order item discrepancy reason
router.patch('/order-item/:orderItemId/discrepancy-reason', warehouseOrderController.updateOrderItemDiscrepancyReason);

export default router;
