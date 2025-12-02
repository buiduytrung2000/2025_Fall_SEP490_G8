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
    const { name, sku, base_unit_id } = req.body
    try {
        if (!name || !sku || !base_unit_id) return res.status(400).json({
            err: 1,
            msg: 'Missing required fields: name, sku, base_unit_id'
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

// SOFT DELETE PRODUCT
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

// RESTORE PRODUCT
export const restore = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.restore(product_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// HARD DELETE PRODUCT (permanent deletion)
export const hardDelete = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.hardDelete(product_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// TOGGLE PRODUCT STATUS
export const toggleStatus = async (req, res) => {
    const { product_id } = req.params
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await productService.toggleStatus(product_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// GET PRODUCTS BY STORE
export const getByStore = async (req, res) => {
    const { store_id } = req.params
    try {
        if (!store_id) return res.status(400).json({
            err: 1,
            msg: 'Missing store_id'
        })
        const response = await productService.getByStore(store_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// GET PRODUCTS FOR PRICE MANAGEMENT
export const getForPriceManagement = async (req, res) => {
    try {
        const response = await productService.getForPriceManagement(req.query)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

// GET PRODUCT BY BARCODE (for POS scanning)
export const getByBarcode = async (req, res) => {
    const { code } = req.params
    const { store_id } = req.query

    try {
        if (!code) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing barcode code'
            })
        }

        if (!store_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing store_id'
            })
        }

        const response = await productService.getByBarcode(code, parseInt(store_id))
        return res.status(200).json(response)
    } catch (error) {
        console.error('Error in getByBarcode:', error)
        return res.status(500).json({
            err: -1,
            msg: 'Fail at product controller: ' + error
        })
    }
}

