import * as categoryService from '../services/category'

// GET ALL CATEGORIES
export const getAll = async (req, res) => {
    try {
        const response = await categoryService.getAll()
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at category controller: ' + error
        })
    }
}

// GET ONE CATEGORY
export const getOne = async (req, res) => {
    const { category_id } = req.params
    try {
        if (!category_id) return res.status(400).json({
            err: 1,
            msg: 'Missing category_id'
        })
        const response = await categoryService.getOne(category_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at category controller: ' + error
        })
    }
}

// CREATE CATEGORY
export const create = async (req, res) => {
    const { name, category_name } = req.body
    try {
        if (!name && !category_name) return res.status(400).json({
            err: 1,
            msg: 'Missing required fields: name'
        })
        const response = await categoryService.create(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at category controller: ' + error
        })
    }
}

// UPDATE CATEGORY
export const update = async (req, res) => {
    const { category_id } = req.params
    try {
        if (!category_id) return res.status(400).json({
            err: 1,
            msg: 'Missing category_id'
        })
        const response = await categoryService.update(category_id, req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at category controller: ' + error
        })
    }
}

// DELETE CATEGORY
export const remove = async (req, res) => {
    const { category_id } = req.params
    try {
        if (!category_id) return res.status(400).json({
            err: 1,
            msg: 'Missing category_id'
        })
        const response = await categoryService.remove(category_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at category controller: ' + error
        })
    }
}

