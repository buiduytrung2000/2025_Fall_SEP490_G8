import express from 'express';
import * as orderController from '../controllers/order';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// =====================================================
// MIDDLEWARE - Authentication & Authorization
// =====================================================
router.use(verifyToken);
router.use(checkRole('Warehouse', 'CEO'));

// =====================================================
// CREATE ROUTES - New Orders
// =====================================================

// Create batch orders
router.post('/batch', orderController.createBatchOrders);

// Create single order
router.post('/', orderController.createOrder);

// =====================================================
// QUERY ROUTES - Get Orders
// =====================================================

// Get orders by supplier (MUST BE BEFORE /:orderId)
router.get('/supplier/:supplierId', orderController.getOrdersBySupplier);

// Get orders by status (MUST BE BEFORE /:orderId)
router.get('/status/:status', orderController.getOrdersByStatus);

// Get pending orders (MUST BE BEFORE /:orderId)
router.get('/pending', orderController.getPendingOrders);

// Get all orders with filters
router.get('/', orderController.getAllOrders);

// Get order detail by ID (MUST BE AFTER specific routes)
router.get('/:orderId', orderController.getOrderDetail);

// =====================================================
// UPDATE ROUTES - Modify Orders
// =====================================================

// Update order status
router.patch('/:orderId/status', orderController.updateOrderStatus);

// Update expected delivery date
router.patch('/:orderId/delivery', orderController.updateExpectedDelivery);

// Update order details
router.put('/:orderId', orderController.updateOrder);

// Update order items
router.put('/:orderId/items', orderController.updateOrderItems);

// =====================================================
// DELETE ROUTES - Remove Orders
// =====================================================

// Delete order (only pending orders)
router.delete('/:orderId', orderController.deleteOrder);

export default router;

