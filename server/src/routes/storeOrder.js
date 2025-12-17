import express from 'express';
import * as storeOrderController from '../controllers/storeOrder';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// Create store order
router.post('/', verifyToken, storeOrderController.createStoreOrder);

// Get store orders
router.get('/', verifyToken, storeOrderController.getStoreOrders);

// Get store order detail by ID
router.get('/:orderId', verifyToken, storeOrderController.getStoreOrderDetail);

// Update store order status (for store to mark as delivered)
router.patch('/:orderId/status', verifyToken, storeOrderController.updateStoreOrderStatus);

export default router;

