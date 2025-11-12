import express from 'express';
import * as voucherTemplateController from '../controllers/voucherTemplate';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// All voucher template routes require authentication
router.use(verifyToken);

// Get all voucher templates
router.get('/', voucherTemplateController.getAllVoucherTemplates);

// Get voucher template by ID
router.get('/:id', voucherTemplateController.getVoucherTemplateById);

// Create voucher template
router.post('/', voucherTemplateController.createVoucherTemplate);

// Update voucher template
router.put('/:id', voucherTemplateController.updateVoucherTemplate);

// Delete voucher template (soft delete)
router.delete('/:id', voucherTemplateController.deleteVoucherTemplate);

export default router;

