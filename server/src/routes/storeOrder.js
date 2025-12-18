import express from 'express';
import * as storeOrderController from '../controllers/storeOrder';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// Create store order
router.post('/', verifyToken, storeOrderController.createStoreOrder);

// Get store orders
router.get('/', verifyToken, storeOrderController.getStoreOrders);

// Update store order status (for store to mark as delivered) - MUST be before /:orderId
router.patch('/:orderId/status', verifyToken, storeOrderController.updateStoreOrderStatus);

// Cancel store order - MUST be before /:orderId
router.post('/:orderId/cancel', verifyToken, storeOrderController.cancelStoreOrder);

// Update store order (edit order details when status is pending) - PUT before GET
router.put('/:orderId', verifyToken, storeOrderController.updateStoreOrder);

// Get store order detail by ID - MUST be last
router.get('/:orderId', verifyToken, storeOrderController.getStoreOrderDetail);

export default router;

