import express from 'express';
import * as voucherTemplateController from '../controllers/voucherTemplate';
import verifyToken from '../middlewares/verifyToken';

const router = express.Router();

// Test endpoint - no auth required
router.get('/test', async (req, res) => {
    try {
        const db = require('../models').default;
        const templates = await db.VoucherTemplate.findAll();
        res.json({
            err: 0,
            msg: 'OK',
            count: templates.length,
            data: templates
        });
    } catch (error) {
        res.status(500).json({
            err: -1,
            msg: error.message
        });
    }
});

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

