import db from '../models'

// GET ALL SUPPLIERS
export const getAll = () => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Supplier.findAll({
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
            raw: true
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
        const response = await db.Supplier.create({
            name: body.name || body.supplier_name,
            contact: body.contact || body.contact_name,
            address: body.address,
            email: body.email
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

