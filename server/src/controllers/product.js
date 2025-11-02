import * as productService from '../services/product'

// GET ALL PRODUCTS
export const getAll = async (req, res) => {
    try {
        const response = await productService.getAll(req.query)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// GET ONE PRODUCT
export const getOne = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.getOne(product_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// CREATE PRODUCT
export const create = async (req, res) => {
    const { name, sku } = req.body
    try {
        if (!name || !sku) return res.status(400).json({
            err: 1,
            msg: 'Missing required fields: name, sku'
        })
        const response = await productService.create(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// UPDATE PRODUCT
export const update = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.update(product_id, req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// DELETE PRODUCT
export const remove = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.remove(product_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

