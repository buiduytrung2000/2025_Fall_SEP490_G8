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
            msg: response ? 'OK' : 'Không tìm thấy mẫu mã khuyến mãi',
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
        const missingFields = [];
        if (!voucher_code_prefix) missingFields.push('Mã tiền tố');
        if (!voucher_name) missingFields.push('Tên mã khuyến mãi');
        if (!discount_type) missingFields.push('Loại giảm giá');
        if (!discount_value) missingFields.push('Giá trị giảm giá');
        
        if (missingFields.length > 0) {
            return resolve({
                err: 1,
                msg: `Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`
            });
        }

        // Check if prefix already exists in the same store only (không check giữa các store khác nhau)
        const whereClause = { voucher_code_prefix };
        if (store_id) {
            // Nếu có store_id, chỉ check trùng trong cùng store đó
            whereClause.store_id = store_id;
        } else {
            // Nếu không có store_id (voucher global), chỉ check trùng với voucher global khác
            whereClause.store_id = null;
        }

        const existingTemplate = await db.VoucherTemplate.findOne({
            where: whereClause
        });

        if (existingTemplate) {
            return resolve({
                err: 1,
                msg: 'Mã tiền tố đã tồn tại trong cửa hàng này'
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
            msg: 'Tạo mẫu mã khuyến mãi thành công',
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
                msg: 'Không tìm thấy mẫu mã khuyến mãi'
            });
        }

        // If updating prefix, check if new prefix already exists in the same store only
        if (data.voucher_code_prefix && data.voucher_code_prefix !== template.voucher_code_prefix) {
            const storeId = data.store_id !== undefined ? data.store_id : template.store_id;
            const whereClause = { 
                voucher_code_prefix: data.voucher_code_prefix,
                voucher_template_id: { [Op.ne]: id }
            };
            
            if (storeId) {
                // Nếu có store_id, chỉ check trùng trong cùng store đó (không check với store khác)
                whereClause.store_id = storeId;
            } else {
                // Nếu không có store_id (voucher global), chỉ check trùng với voucher global khác
                whereClause.store_id = null;
            }

            const existingTemplate = await db.VoucherTemplate.findOne({
                where: whereClause
            });

            if (existingTemplate) {
                return resolve({
                    err: 1,
                    msg: 'Mã tiền tố đã tồn tại trong cửa hàng này'
                });
            }
        }

        await template.update(data);

        resolve({
            err: 0,
            msg: 'Cập nhật mẫu mã khuyến mãi thành công',
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
                msg: 'Không tìm thấy mẫu mã khuyến mãi'
            });
        }

        await template.update({ is_active: false });

        resolve({
            err: 0,
            msg: 'Xóa mẫu mã khuyến mãi thành công'
        });
    } catch (error) {
        reject(error);
    }
});

