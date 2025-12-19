import db from '../models'

// GET ALL CATEGORIES
export const getAllCategories = () => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Category.findAll({
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

// GET ONE CATEGORY
export const getCategoryById = (category_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Category.findOne({
            where: { category_id },
            raw: true
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Category not found',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE CATEGORY
export const createCategory = (body) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Category.create({
            name: body.name || body.category_name,
            parent_id: body.parent_id || null
        })
        resolve({
            err: 0,
            msg: 'Category created successfully',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE CATEGORY
export const updateCategory = (category_id, body) => new Promise(async (resolve, reject) => {
    try {
        const updateData = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.category_name !== undefined) updateData.name = body.category_name
        if (body.parent_id !== undefined) updateData.parent_id = body.parent_id

        const [affectedRows] = await db.Category.update(
            updateData,
            {
                where: { category_id }
            }
        )
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Category updated successfully' : 'Category not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// DELETE CATEGORY
export const deleteCategory = (category_id) => new Promise(async (resolve, reject) => {
    try {
        if (!category_id) {
            return resolve({
                err: 1,
                msg: 'Missing category_id',
                data: false
            })
        }

        // Kiểm tra ràng buộc: có sản phẩm hoặc danh mục con đang dùng không
        const [productCount, childCount] = await Promise.all([
            db.Product.count({ where: { category_id } }),
            db.Category.count({ where: { parent_id: category_id } })
        ])

        if (productCount > 0 || childCount > 0) {
            return resolve({
                err: 1,
                msg: 'Không thể xóa danh mục vì đang được gắn với sản phẩm hoặc có danh mục con',
                data: false
            })
        }

        const affectedRows = await db.Category.destroy({
            where: { category_id }
        })
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Category deleted successfully' : 'Category not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

