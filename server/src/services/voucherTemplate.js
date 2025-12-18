import db from '../models';
import { Op } from 'sequelize';

// GET ALL VOUCHER TEMPLATES
export const getAllVoucherTemplates = (query) => new Promise(async (resolve, reject) => {
    try {
        const { is_active, store_id } = query;
        const whereClause = {};
        
        if (is_active !== undefined) {
            whereClause.is_active = is_active === 'true';
        }
        if (store_id) {
            whereClause[Op.or] = [
                { store_id: null },
                { store_id }
            ];
        }

        const response = await db.VoucherTemplate.findAll({
            where: whereClause,
            order: [['required_loyalty_points', 'ASC']],
            raw: true
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// GET ONE VOUCHER TEMPLATE
export const getVoucherTemplateById = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.VoucherTemplate.findOne({
            where: { voucher_template_id: id },
            raw: true
        });

        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Voucher template not found',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// CREATE VOUCHER TEMPLATE
export const createVoucherTemplate = (data) => new Promise(async (resolve, reject) => {
    try {
        const {
            voucher_code_prefix,
            voucher_name,
            discount_type,
            discount_value,
            min_purchase_amount,
            max_discount_amount,
            required_loyalty_points,
            validity_days,
            is_active,
            // store_id của cửa hàng tạo voucher
            store_id
        } = data;

        // Validation
        if (!voucher_code_prefix || !voucher_name || !discount_type || !discount_value) {
            return resolve({
                err: 1,
                msg: 'Missing required fields: voucher_code_prefix, voucher_name, discount_type, discount_value'
            });
        }

        // Check if prefix already exists
        const existingTemplate = await db.VoucherTemplate.findOne({
            where: { voucher_code_prefix }
        });

        if (existingTemplate) {
            return resolve({
                err: 1,
                msg: 'Voucher code prefix already exists'
            });
        }

        const response = await db.VoucherTemplate.create({
            voucher_code_prefix,
            voucher_name,
            discount_type,
            discount_value,
            min_purchase_amount: min_purchase_amount || 0,
            max_discount_amount: max_discount_amount || null,
            required_loyalty_points: required_loyalty_points || 0,
            validity_days: validity_days || 30,
            is_active: is_active !== undefined ? is_active : true,
            // Gán store_id theo cửa hàng tạo voucher (nếu có)
            store_id: store_id || null
        });

        resolve({
            err: 0,
            msg: 'Voucher template created successfully',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// UPDATE VOUCHER TEMPLATE
export const updateVoucherTemplate = (id, data) => new Promise(async (resolve, reject) => {
    try {
        const template = await db.VoucherTemplate.findByPk(id);

        if (!template) {
            return resolve({
                err: 1,
                msg: 'Voucher template not found'
            });
        }

        // If updating prefix, check if new prefix already exists
        if (data.voucher_code_prefix && data.voucher_code_prefix !== template.voucher_code_prefix) {
            const existingTemplate = await db.VoucherTemplate.findOne({
                where: { 
                    voucher_code_prefix: data.voucher_code_prefix,
                    voucher_template_id: { [Op.ne]: id }
                }
            });

            if (existingTemplate) {
                return resolve({
                    err: 1,
                    msg: 'Voucher code prefix already exists'
                });
            }
        }

        await template.update(data);

        resolve({
            err: 0,
            msg: 'Voucher template updated successfully',
            data: template
        });
    } catch (error) {
        reject(error);
    }
});

// DELETE VOUCHER TEMPLATE (soft delete by setting is_active to false)
export const deleteVoucherTemplate = (id) => new Promise(async (resolve, reject) => {
    try {
        const template = await db.VoucherTemplate.findByPk(id);

        if (!template) {
            return resolve({
                err: 1,
                msg: 'Voucher template not found'
            });
        }

        await template.update({ is_active: false });

        resolve({
            err: 0,
            msg: 'Voucher template deleted successfully'
        });
    } catch (error) {
        reject(error);
    }
});

