import db from '../models'
import { Op } from 'sequelize'

// GET ALL CUSTOMERS
export const getAll = ({ page, limit, search, tier }) => new Promise(async (resolve, reject) => {
    try {
        const queries = {}
        const offset = (!page || +page <= 1) ? 0 : (+page - 1) * (+limit || 10)

        // Build where clause
        const whereClause = {}
        
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ]
        }

        if (tier) {
            whereClause.tier = tier
        }

        if (limit) queries.limit = +limit
        if (offset) queries.offset = offset

        queries.where = whereClause
        queries.order = [['created_at', 'DESC']]
        queries.attributes = {
            exclude: ['createdAt', 'updatedAt']
        }

        const response = await db.Customer.findAndCountAll(queries)

        resolve({
            err: response.count > 0 ? 0 : 1,
            msg: response.count > 0 ? 'OK' : 'Không tìm thấy khách hàng',
            data: response.rows,
            count: response.count
        })
    } catch (error) {
        reject(error)
    }
})

// GET ONE CUSTOMER
export const getOne = (customer_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Customer.findOne({
            where: { customer_id },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            }
        })

        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Không tìm thấy khách hàng',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// SEARCH CUSTOMER BY PHONE
export const searchByPhone = (phone) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Customer.findAll({
            where: {
                phone: {
                    [Op.like]: `%${phone}%`
                }
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            order: [['created_at', 'DESC']],
            limit: 10
        })

        resolve({
            err: response.length > 0 ? 0 : 1,
            msg: response.length > 0 ? 'OK' : 'Không tìm thấy khách hàng',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE CUSTOMER
export const create = (body) => new Promise(async (resolve, reject) => {
    try {
        // Check if phone already exists
        const existingCustomer = await db.Customer.findOne({
            where: { phone: body.phone }
        })

        if (existingCustomer) {
            resolve({
                err: 1,
                msg: 'Số điện thoại đã tồn tại',
                data: null
            })
            return
        }

        const response = await db.Customer.create({
            name: body.name,
            phone: body.phone,
            email: body.email || null,
            loyalty_point: 0,
            tier: 'bronze'
        })

        // Auto-generate welcome vouchers for new customer
        if (response) {
            const voucherService = require('./customerVoucher');
            await voucherService.autoGenerateVouchersForCustomer(response.customer_id, 0);
        }

        resolve({
            err: response ? 0 : 1,
            msg: response ? 'Tạo khách hàng thành công' : 'Tạo khách hàng thất bại',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE CUSTOMER
export const update = (customer_id, body) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Customer.update(body, {
            where: { customer_id }
        })

        resolve({
            err: response[0] > 0 ? 0 : 1,
            msg: response[0] > 0 ? 'Cập nhật khách hàng thành công' : 'Cập nhật khách hàng thất bại',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// DELETE CUSTOMER
export const remove = (customer_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Customer.destroy({
            where: { customer_id }
        })

        resolve({
            err: response > 0 ? 0 : 1,
            msg: response > 0 ? 'Xóa khách hàng thành công' : 'Xóa khách hàng thất bại',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE LOYALTY POINTS AND AUTO-GENERATE VOUCHERS
// Rule: 100đ = 1 point
export const updateLoyaltyPoints = (customer_id, purchaseAmount) => new Promise(async (resolve, reject) => {
    try {
        const customer = await db.Customer.findByPk(customer_id);

        if (!customer) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy khách hàng'
            });
        }

        // Calculate points: 100đ = 1 point
        const pointsToAdd = Math.floor(purchaseAmount / 100);
        const oldPoints = customer.loyalty_point || 0;
        const newPoints = oldPoints + pointsToAdd;

        // Update customer loyalty points
        await customer.update({
            loyalty_point: newPoints
        });

        // Auto-generate vouchers based on new loyalty points
        const voucherService = require('./customerVoucher');
        await voucherService.autoGenerateVouchersForCustomer(customer_id, newPoints);

        resolve({
            err: 0,
            msg: `Đã cộng ${pointsToAdd} điểm. Tổng điểm: ${newPoints}`,
            data: {
                old_points: oldPoints,
                points_added: pointsToAdd,
                new_points: newPoints
            }
        });
    } catch (error) {
        reject(error);
    }
})

