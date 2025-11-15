import db from '../models'
import { Op } from 'sequelize'

// GET AVAILABLE VOUCHERS BY CUSTOMER ID (filtered by loyalty points)
export const getAvailableVouchersByCustomer = (customerId) => new Promise(async (resolve, reject) => {
    try {
        console.log('Getting vouchers for customer:', customerId);

        // Get customer's loyalty points
        const customer = await db.Customer.findByPk(customerId, {
            attributes: ['loyalty_point']
        });

        if (!customer) {
            console.log('Customer not found:', customerId);
            return resolve({
                err: 1,
                msg: 'Customer not found',
                data: []
            });
        }

        const customerLoyaltyPoints = customer.loyalty_point || 0;
        console.log('Customer loyalty points:', customerLoyaltyPoints);

        const now = new Date();

        // Get vouchers that customer can use based on loyalty points
        const response = await db.CustomerVoucher.findAll({
            where: {
                customer_id: customerId,
                status: 'available',
                start_date: {
                    [Op.lte]: now
                },
                end_date: {
                    [Op.gte]: now
                },
                required_loyalty_points: {
                    [Op.lte]: customerLoyaltyPoints
                }
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            order: [['required_loyalty_points', 'DESC'], ['end_date', 'ASC']]
        })

        console.log('Found vouchers:', response.length);

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        })
    } catch (error) {
        console.error('Error getting vouchers:', error);
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

// AUTO-GENERATE VOUCHERS FOR CUSTOMER BASED ON LOYALTY POINTS
export const autoGenerateVouchersForCustomer = (customerId, loyaltyPoints) => new Promise(async (resolve, reject) => {
    try {
        console.log('Auto-generating vouchers for customer:', customerId, 'with loyalty points:', loyaltyPoints);

        // Get all active voucher templates that customer qualifies for
        const templates = await db.VoucherTemplate.findAll({
            where: {
                is_active: true,
                required_loyalty_points: {
                    [Op.lte]: loyaltyPoints
                }
            },
            order: [['required_loyalty_points', 'DESC']]
        });

        console.log('Found templates:', templates.length);

        if (templates.length === 0) {
            console.log('No voucher templates available for loyalty points:', loyaltyPoints);
            return resolve({
                err: 0,
                msg: 'No voucher templates available',
                data: []
            });
        }

        const newVouchers = [];
        const now = new Date();

        for (const template of templates) {
            console.log('Checking template:', template.voucher_code_prefix, 'required points:', template.required_loyalty_points);

            // Check if customer already has this type of voucher
            const existingVoucher = await db.CustomerVoucher.findOne({
                where: {
                    customer_id: customerId,
                    voucher_code: {
                        [Op.like]: `${template.voucher_code_prefix}%`
                    },
                    status: 'available'
                }
            });

            if (existingVoucher) {
                console.log('Customer already has voucher:', template.voucher_code_prefix);
            }

            // Only create if customer doesn't have this voucher yet
            if (!existingVoucher) {
                const voucherCode = `${template.voucher_code_prefix}-${customerId}-${Date.now()}`;
                const endDate = new Date(now);
                endDate.setDate(endDate.getDate() + template.validity_days);

                console.log('Creating voucher:', voucherCode);

                const newVoucher = await db.CustomerVoucher.create({
                    customer_id: customerId,
                    voucher_code: voucherCode,
                    voucher_name: template.voucher_name,
                    discount_type: template.discount_type,
                    discount_value: template.discount_value,
                    min_purchase_amount: template.min_purchase_amount,
                    max_discount_amount: template.max_discount_amount,
                    required_loyalty_points: template.required_loyalty_points,
                    start_date: now,
                    end_date: endDate,
                    status: 'available'
                });

                console.log('Created voucher:', newVoucher.voucher_code);
                newVouchers.push(newVoucher);
            }
        }

        console.log('Total new vouchers created:', newVouchers.length);

        resolve({
            err: 0,
            msg: `Đã tạo ${newVouchers.length} voucher mới`,
            data: newVouchers
        });
    } catch (error) {
        console.error('Error auto-generating vouchers:', error);
        reject(error);
    }
})

// GENERATE VOUCHERS FOR EXISTING CUSTOMER (Manual trigger)
export const generateVouchersForExistingCustomer = (customerId) => new Promise(async (resolve, reject) => {
    try {
        // Get customer's current loyalty points
        const customer = await db.Customer.findByPk(customerId, {
            attributes: ['customer_id', 'name', 'loyalty_point']
        });

        if (!customer) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy khách hàng'
            });
        }

        const loyaltyPoints = customer.loyalty_point || 0;

        // Use the auto-generate function
        const result = await autoGenerateVouchersForCustomer(customerId, loyaltyPoints);

        resolve({
            err: 0,
            msg: `Đã tạo voucher cho khách hàng ${customer.name} (${loyaltyPoints} điểm). ${result.msg}`,
            data: result.data
        });
    } catch (error) {
        reject(error);
    }
})

// ADD VOUCHER MANUALLY FROM TEMPLATE
export const addVoucherFromTemplate = (customerId, templateId) => new Promise(async (resolve, reject) => {
    try {
        // Get customer
        const customer = await db.Customer.findByPk(customerId, {
            attributes: ['customer_id', 'name', 'loyalty_point']
        });

        if (!customer) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy khách hàng'
            });
        }

        // Get template
        const template = await db.VoucherTemplate.findOne({
            where: {
                voucher_template_id: templateId,
                is_active: true
            }
        });

        if (!template) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy voucher template hoặc template đã bị vô hiệu hóa'
            });
        }

        // Check if customer has enough loyalty points
        const customerPoints = customer.loyalty_point || 0;
        if (customerPoints < template.required_loyalty_points) {
            return resolve({
                err: 1,
                msg: `Khách hàng cần tối thiểu ${template.required_loyalty_points} điểm để nhận voucher này (hiện có ${customerPoints} điểm)`
            });
        }

        // Check if customer already has this voucher
        const existingVoucher = await db.CustomerVoucher.findOne({
            where: {
                customer_id: customerId,
                voucher_name: template.voucher_name,
                status: {
                    [Op.in]: ['available', 'used']
                }
            }
        });

        if (existingVoucher) {
            return resolve({
                err: 1,
                msg: 'Khách hàng đã có voucher này'
            });
        }

        // Create voucher for customer
        const now = new Date();
        const voucherCode = `${template.voucher_code_prefix}-${customerId}-${Date.now()}`;
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + template.validity_days);

        const newVoucher = await db.CustomerVoucher.create({
            customer_id: customerId,
            voucher_code: voucherCode,
            voucher_name: template.voucher_name,
            discount_type: template.discount_type,
            discount_value: template.discount_value,
            min_purchase_amount: template.min_purchase_amount,
            max_discount_amount: template.max_discount_amount,
            required_loyalty_points: template.required_loyalty_points,
            start_date: now,
            end_date: endDate,
            status: 'available'
        });

        resolve({
            err: 0,
            msg: `Đã thêm voucher "${template.voucher_name}" cho khách hàng ${customer.name}`,
            data: newVoucher
        });
    } catch (error) {
        reject(error);
    }
})

// GET AVAILABLE TEMPLATES FOR CUSTOMER (based on loyalty points)
export const getAvailableTemplatesForCustomer = (customerId) => new Promise(async (resolve, reject) => {
    try {
        // Get customer
        const customer = await db.Customer.findByPk(customerId, {
            attributes: ['customer_id', 'name', 'loyalty_point']
        });

        if (!customer) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy khách hàng'
            });
        }

        const customerPoints = customer.loyalty_point || 0;

        // Get all active templates that customer qualifies for
        const templates = await db.VoucherTemplate.findAll({
            where: {
                is_active: true,
                required_loyalty_points: {
                    [Op.lte]: customerPoints
                }
            },
            order: [['required_loyalty_points', 'DESC']]
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: templates
        });
    } catch (error) {
        reject(error);
    }
})
