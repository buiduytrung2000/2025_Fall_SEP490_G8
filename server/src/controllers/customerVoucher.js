import * as voucherService from '../services/customerVoucher'

// GET AVAILABLE VOUCHERS BY CUSTOMER ID
export const getAvailableVouchers = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })
        const response = await voucherService.getAvailableVouchersByCustomer(customer_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at voucher controller: ' + error
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
        const response = await customerVoucherService.generateVouchersForExistingCustomer(customer_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customerVoucher controller: ' + error
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

