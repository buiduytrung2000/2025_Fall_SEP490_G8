import express from 'express'
import * as voucherController from '../controllers/customerVoucher'
import verifyToken from '../middlewares/verifyToken'

const router = express.Router()

// All voucher routes require authentication
router.use(verifyToken)

// Get available vouchers for a customer
router.get('/customer/:customer_id/available', voucherController.getAvailableVouchers)

// Get all vouchers for a customer
router.get('/customer/:customer_id', voucherController.getAllVouchers)

// Validate voucher
router.post('/validate', voucherController.validateVoucher)

// Create voucher
router.post('/', voucherController.createVoucher)

// Generate vouchers for existing customer
router.post('/customer/:customer_id/generate', voucherController.generateVouchersForCustomer)

export default router

