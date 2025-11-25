import db from '../models'
import { Op } from 'sequelize'

const resolveSupplierAccount = async ({ user_id, account_user_id, account_email }, currentSupplierId = null) => {
    const identifier = account_user_id || user_id || account_email
    if (!identifier) {
        return { err: 0, userId: null }
    }

    let user = null
    if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
        user = await db.User.findByPk(parseInt(identifier))
    } else {
        user = await db.User.findOne({
            where: { email: identifier }
        })
    }

    if (!user) {
        return { err: 1, msg: 'Không tìm thấy tài khoản với thông tin đã nhập' }
    }

    if (user.role !== 'Supplier') {
        return { err: 1, msg: 'Tài khoản được liên kết phải thuộc vai trò Supplier' }
    }

    const existingLink = await db.Supplier.findOne({
        where: {
            user_id: user.user_id,
            ...(currentSupplierId ? { supplier_id: { [Op.ne]: currentSupplierId } } : {})
        }
    })

    if (existingLink) {
        return { err: 1, msg: 'Tài khoản Supplier này đã được liên kết với nhà cung cấp khác' }
    }

    return { err: 0, userId: user.user_id, user }
}

// GET ALL SUPPLIERS
export const getAll = () => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Supplier.findAll({
            include: [
                {
                    model: db.User,
                    as: 'accountOwner',
                    attributes: ['user_id', 'username', 'email']
                }
            ],
            raw: true,
            nest: true
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

// GET ONE SUPPLIER
export const getOne = (supplier_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Supplier.findOne({
            where: { supplier_id },
            include: [
                {
                    model: db.User,
                    as: 'accountOwner',
                    attributes: ['user_id', 'username', 'email']
                }
            ],
            raw: true,
            nest: true
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Supplier not found',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE SUPPLIER
export const create = (body) => new Promise(async (resolve, reject) => {
    try {
        const accountResult = await resolveSupplierAccount(body)
        if (accountResult.err !== 0) {
            return resolve(accountResult)
        }

        const response = await db.Supplier.create({
            name: body.name || body.supplier_name,
            contact: body.contact || body.contact_name,
            address: body.address,
            email: body.email,
            user_id: accountResult.userId
        })
        resolve({
            err: 0,
            msg: 'Supplier created successfully',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE SUPPLIER
export const update = (supplier_id, body) => new Promise(async (resolve, reject) => {
    try {
        const updateData = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.supplier_name !== undefined) updateData.name = body.supplier_name
        if (body.contact !== undefined) updateData.contact = body.contact
        if (body.contact_name !== undefined) updateData.contact = body.contact_name
        if (body.address !== undefined) updateData.address = body.address
        if (body.email !== undefined) updateData.email = body.email

        if (body.user_id !== undefined || body.account_user_id !== undefined || body.account_email !== undefined) {
            const accountResult = await resolveSupplierAccount(body, supplier_id)
            if (accountResult.err !== 0) {
                return resolve(accountResult)
            }
            updateData.user_id = accountResult.userId
        }

        const [affectedRows] = await db.Supplier.update(
            updateData,
            {
                where: { supplier_id }
            }
        )
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Supplier updated successfully' : 'Supplier not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// DELETE SUPPLIER
export const remove = (supplier_id) => new Promise(async (resolve, reject) => {
    try {
        const affectedRows = await db.Supplier.destroy({
            where: { supplier_id }
        })
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Supplier deleted successfully' : 'Supplier not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// LIST SUPPLIER USER ACCOUNTS
export const getAccounts = () => new Promise(async (resolve, reject) => {
    try {
        const users = await db.User.findAll({
            where: { role: 'Supplier' },
            attributes: ['user_id', 'username', 'email', 'status']
        })
        resolve({
            err: 0,
            msg: 'OK',
            data: users
        })
    } catch (error) {
        reject(error)
    }
})

