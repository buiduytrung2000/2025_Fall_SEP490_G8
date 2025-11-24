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
// ORDER ROUTES - Warehouse to Supplier Orders
// =====================================================

// Create batch warehouse orders (MUST BE BEFORE single order route)
router.post('/batch', orderController.createBatchOrders);

// Create warehouse order
router.post('/', orderController.createOrder);

// Get all orders with filters
router.get('/', orderController.getAllOrders);

// Get orders by supplier
router.get('/supplier/:supplierId', orderController.getOrdersBySupplier);

// Get orders by status
router.get('/status/:status', orderController.getOrdersByStatus);

// Get order detail by ID (MUST BE AFTER specific routes)
router.get('/:orderId', orderController.getOrderDetail);

// Update order status
router.patch('/:orderId/status', orderController.updateOrderStatus);

// Delete order
router.delete('/:orderId', orderController.deleteOrder);

export default router;

