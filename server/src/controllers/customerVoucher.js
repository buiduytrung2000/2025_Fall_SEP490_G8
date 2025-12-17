import * as voucherService from '../services/customerVoucher'

// GET AVAILABLE VOUCHERS BY CUSTOMER ID
export const getAvailableVouchers = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })

        console.log('Controller: Getting vouchers for customer:', customer_id);
        const response = await voucherService.getAvailableVouchersByCustomer(customer_id)
        console.log('Controller: Voucher response:', response);

        return res.status(200).json(response)
    } catch (error) {
        console.error('Controller: Error getting vouchers:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error.message
        })
    }
}

// GET ALL VOUCHERS BY CUSTOMER ID
export const getAllVouchers = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })
        const response = await voucherService.getAllVouchersByCustomer(customer_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error
        })
    }
}

// VALIDATE VOUCHER
export const validateVoucher = async (req, res) => {
    const { voucher_code, customer_id, purchase_amount } = req.body
    try {
        if (!voucher_code || !customer_id || !purchase_amount) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields'
            })
        }
        const response = await voucherService.validateVoucher(voucher_code, customer_id, purchase_amount)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error
        })
    }
}

// GENERATE VOUCHERS FOR EXISTING CUSTOMER
export const generateVouchersForCustomer = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing customer_id'
            })
        }

        console.log('Controller: Generating vouchers for customer:', customer_id);
        const response = await voucherService.generateVouchersForExistingCustomer(customer_id)
        console.log('Controller: Generate response:', response);

        return res.status(200).json(response)
    } catch (error) {
        console.error('Controller: Error generating vouchers:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customerVoucher controller: ' + error.message
        })
    }
}

// CREATE VOUCHER
export const createVoucher = async (req, res) => {
    try {
        const response = await voucherService.createVoucher(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error
        })
    }
}

// ADD VOUCHER FROM TEMPLATE
export const addVoucherFromTemplate = async (req, res) => {
    try {
        const { customer_id, template_id, store_id } = req.body;
        if (!customer_id || !template_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing customer_id or template_id'
            });
        }
        // Lấy store_id từ request body hoặc từ user context
        const storeId = store_id || req.user?.store_id || null;
        const response = await voucherService.addVoucherFromTemplate(customer_id, template_id, storeId);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error.message
        });
    }
}

// GET AVAILABLE TEMPLATES FOR CUSTOMER
export const getAvailableTemplatesForCustomer = async (req, res) => {
    try {
        const { customer_id } = req.params;
        if (!customer_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing customer_id'
            });
        }
        const response = await voucherService.getAvailableTemplatesForCustomer(customer_id);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error.message
        });
    }
}

