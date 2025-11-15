import * as voucherTemplateService from '../services/voucherTemplate';

// GET ALL VOUCHER TEMPLATES
export const getAllVoucherTemplates = async (req, res) => {
    try {
        const response = await voucherTemplateService.getAllVoucherTemplates(req.query);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at voucher template controller: ' + error.message
        });
    }
};

// GET ONE VOUCHER TEMPLATE
export const getVoucherTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing voucher_template_id'
            });
        }
        const response = await voucherTemplateService.getVoucherTemplateById(id);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at voucher template controller: ' + error.message
        });
    }
};

// CREATE VOUCHER TEMPLATE
export const createVoucherTemplate = async (req, res) => {
    try {
        const response = await voucherTemplateService.createVoucherTemplate(req.body);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at voucher template controller: ' + error.message
        });
    }
};

// UPDATE VOUCHER TEMPLATE
export const updateVoucherTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing voucher_template_id'
            });
        }
        const response = await voucherTemplateService.updateVoucherTemplate(id, req.body);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at voucher template controller: ' + error.message
        });
    }
};

// DELETE VOUCHER TEMPLATE
export const deleteVoucherTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing voucher_template_id'
            });
        }
        const response = await voucherTemplateService.deleteVoucherTemplate(id);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at voucher template controller: ' + error.message
        });
    }
};

