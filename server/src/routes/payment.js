import express from 'express';
import * as paymentController from '../controllers/payment';

const router = express.Router();

// Create cash payment (no authentication required)
router.post('/cash', paymentController.createCashPayment);

// Create QR payment (no authentication required)
router.post('/qr', paymentController.createQRPayment);

// Check payment status (no authentication required)
router.get('/status/:orderCode', paymentController.checkPaymentStatus);

// Get transaction details (no authentication required)
router.get('/transaction/:transactionId', paymentController.getTransactionDetails);

// PayOS webhook (no authentication required - PayOS will call this)
router.post('/webhook/payos', paymentController.handlePayOSWebhook);

export default router;

