import db from '../models'

// GET ALL CATEGORIES
export const getAll = () => new Promise(async (resolve, reject) => {
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
export const getOne = (category_id) => new Promise(async (resolve, reject) => {
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
export const create = (body) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Category.create({
            category_name: body.category_name,
            description: body.description
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
export const update = (category_id, body) => new Promise(async (resolve, reject) => {
    try {
        const [affectedRows] = await db.Category.update(
            {
                category_name: body.category_name,
                description: body.description
            },
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
export const remove = (category_id) => new Promise(async (resolve, reject) => {
    try {
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

