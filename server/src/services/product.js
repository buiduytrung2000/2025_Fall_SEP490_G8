import db from '../models'
import { Op } from 'sequelize'

// GET ALL PRODUCTS
export const getAll = (query) => new Promise(async (resolve, reject) => {
    try {
        const { category_id, supplier_id, search } = query || {}
        let where = {}

        if (category_id) where.category_id = category_id
        if (supplier_id) where.supplier_id = supplier_id

        const response = await db.Product.findAll({
            where,
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['category_id', 'category_name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'supplier_name', 'contact_name', 'phone']
                }
            ],
            nest: true
        })

        // Filter by search if provided
        let filteredData = response
        if (search) {
            filteredData = response.filter(product =>
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.sku.toLowerCase().includes(search.toLowerCase())
            )
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: filteredData
        })
    } catch (error) {
        reject(error)
    }
})

// GET ONE PRODUCT
export const getOne = (product_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Product.findOne({
            where: { product_id },
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['category_id', 'category_name', 'description']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'supplier_name', 'contact_name', 'phone', 'address', 'email']
                }
            ],
            nest: true
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Product not found',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE PRODUCT
export const create = (body) => new Promise(async (resolve, reject) => {
    try {
        // Check if SKU already exists
        const existingProduct = await db.Product.findOne({
            where: { sku: body.sku }
        })

        if (existingProduct) {
            resolve({
                err: 1,
                msg: 'SKU already exists',
                data: null
            })
            return
        }

        const response = await db.Product.create({
            name: body.name,
            sku: body.sku,
            category_id: body.category_id || null,
            supplier_id: body.supplier_id || null,
            hq_price: body.hq_price || 0.00,
            description: body.description
        })
        resolve({
            err: 0,
            msg: 'Product created successfully',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE PRODUCT
export const update = (product_id, body) => new Promise(async (resolve, reject) => {
    try {
        // If updating SKU, check if it's unique
        if (body.sku) {
            const existingProduct = await db.Product.findOne({
                where: {
                    sku: body.sku,
                    product_id: { [Op.ne]: product_id }
                }
            })

            if (existingProduct) {
                resolve({
                    err: 1,
                    msg: 'SKU already exists',
                    data: false
                })
                return
            }
        }

        const [affectedRows] = await db.Product.update(
            {
                name: body.name,
                sku: body.sku,
                category_id: body.category_id,
                supplier_id: body.supplier_id,
                hq_price: body.hq_price,
                description: body.description
            },
            {
                where: { product_id }
            }
        )
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Product updated successfully' : 'Product not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// DELETE PRODUCT
export const remove = (product_id) => new Promise(async (resolve, reject) => {
    try {
        const affectedRows = await db.Product.destroy({
            where: { product_id }
        })
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Product deleted successfully' : 'Product not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// GET PRODUCTS BY STORE
export const getByStore = (store_id) => new Promise(async (resolve, reject) => {
    try {
        const inventories = await db.Inventory.findAll({
            where: { store_id },
            include: [
                {
                    model: db.Product,
                    as: 'product'
                }
            ],
            nest: true
        })

        const data = inventories.map(inv => ({
            inventory_id: inv.inventory_id,
            store_id: inv.store_id,
            product_id: inv.product_id,
            stock: inv.stock,
            min_stock_level: inv.min_stock_level,
            reorder_point: inv.reorder_point,
            product: inv.product
        }))

        resolve({
            err: 0,
            msg: 'OK',
            data
        })
    } catch (error) {
        reject(error)
    }
})

