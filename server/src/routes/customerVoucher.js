import express from 'express'
import * as voucherController from '../controllers/customerVoucher'
import verifyToken from '../middlewares/verifyToken'

const router = express.Router()

// All voucher routes require authentication
router.use(verifyToken)

// Get available vouchers for a customer
router.get('/customer/:customer_id/available', voucherController.getAvailableVouchers)

// Get available templates for a customer (based on loyalty points)
router.get('/customer/:customer_id/available-templates', voucherController.getAvailableTemplatesForCustomer)

// Get all vouchers for a customer
router.get('/customer/:customer_id', voucherController.getAllVouchers)

// Validate voucher
router.post('/validate', voucherController.validateVoucher)

// Create voucher
router.post('/', voucherController.createVoucher)

// Add voucher from template (manual assignment)
router.post('/add-from-template', voucherController.addVoucherFromTemplate)

// Generate vouchers for existing customer
router.post('/customer/:customer_id/generate', voucherController.generateVouchersForCustomer)

export default router

