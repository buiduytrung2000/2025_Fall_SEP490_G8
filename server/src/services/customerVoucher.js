import db from '../models'
import { Op } from 'sequelize'

// GET AVAILABLE VOUCHERS BY CUSTOMER ID
export const getAvailableVouchersByCustomer = (customerId) => new Promise(async (resolve, reject) => {
    try {
        const now = new Date();
        const response = await db.CustomerVoucher.findAll({
            where: {
                customer_id: customerId,
                status: 'available',
                start_date: {
                    [Op.lte]: now
                },
                end_date: {
                    [Op.gte]: now
                }
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            order: [['end_date', 'ASC']]
        })

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// GET ALL VOUCHERS BY CUSTOMER ID (including used and expired)
export const getAllVouchersByCustomer = (customerId) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.CustomerVoucher.findAll({
            where: {
                customer_id: customerId
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            order: [['status', 'ASC'], ['end_date', 'ASC']]
        })

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// VALIDATE AND APPLY VOUCHER
export const validateVoucher = (voucherCode, customerId, purchaseAmount) => new Promise(async (resolve, reject) => {
    try {
        const now = new Date();
        const voucher = await db.CustomerVoucher.findOne({
            where: {
                voucher_code: voucherCode,
                customer_id: customerId,
                status: 'available',
                start_date: {
                    [Op.lte]: now
                },
                end_date: {
                    [Op.gte]: now
                }
            }
        })

        if (!voucher) {
            return resolve({
                err: 1,
                msg: 'Voucher không hợp lệ hoặc đã hết hạn'
            })
        }

        // Check minimum purchase amount
        if (purchaseAmount < voucher.min_purchase_amount) {
            return resolve({
                err: 1,
                msg: `Đơn hàng tối thiểu ${voucher.min_purchase_amount.toLocaleString('vi-VN')}đ để sử dụng voucher này`
            })
        }

        // Calculate discount
        let discountAmount = 0;
        if (voucher.discount_type === 'percentage') {
            discountAmount = (purchaseAmount * voucher.discount_value) / 100;
            if (voucher.max_discount_amount && discountAmount > voucher.max_discount_amount) {
                discountAmount = voucher.max_discount_amount;
            }
        } else {
            discountAmount = voucher.discount_value;
        }

        resolve({
            err: 0,
            msg: 'Voucher hợp lệ',
            data: {
                voucher,
                discountAmount
            }
        })
    } catch (error) {
        reject(error)
    }
})

// MARK VOUCHER AS USED
export const markVoucherAsUsed = (voucherCode, transactionId) => new Promise(async (resolve, reject) => {
    try {
        const voucher = await db.CustomerVoucher.findOne({
            where: {
                voucher_code: voucherCode
            }
        })

        if (!voucher) {
            return resolve({
                err: 1,
                msg: 'Voucher không tồn tại'
            })
        }

        await voucher.update({
            status: 'used',
            used_at: new Date(),
            transaction_id: transactionId
        })

        resolve({
            err: 0,
            msg: 'Đã đánh dấu voucher đã sử dụng'
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE VOUCHER FOR CUSTOMER
export const createVoucher = (data) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.CustomerVoucher.create(data)
        resolve({
            err: 0,
            msg: 'Tạo voucher thành công',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

