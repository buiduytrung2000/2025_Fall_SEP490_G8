import express from 'express';
import * as orderController from '../controllers/order';
import verifyToken from '../middlewares/verifyToken';
import checkRole from '../middlewares/checkRole';

const router = express.Router();

// =====================================================
// MIDDLEWARE - Authentication & Authorization
// =====================================================
router.use(verifyToken);

// =====================================================
// ORDER ROUTES - Warehouse to Supplier Orders
// =====================================================

// Create batch warehouse orders (MUST BE BEFORE single order route)
router.post('/batch', checkRole('Warehouse', 'CEO'), orderController.createBatchOrders);

// Create warehouse order
router.post('/', checkRole('Warehouse', 'CEO'), orderController.createOrder);

// Get all orders with filters
router.get('/', checkRole('Warehouse', 'CEO', 'Supplier'), orderController.getAllOrders);

// Get orders by supplier
router.get('/supplier/:supplierId', checkRole('Warehouse', 'CEO'), orderController.getOrdersBySupplier);

// Get orders by status
router.get('/status/:status', checkRole('Warehouse', 'CEO'), orderController.getOrdersByStatus);

// Get order detail by ID (MUST BE AFTER specific routes)
router.get('/:orderId', checkRole('Warehouse', 'CEO', 'Supplier'), orderController.getOrderDetail);

// Update order status
router.patch('/:orderId/status', checkRole('Warehouse', 'CEO', 'Supplier'), orderController.updateOrderStatus);

// Delete order
router.delete('/:orderId', checkRole('Warehouse', 'CEO'), orderController.deleteOrder);

export default router;

