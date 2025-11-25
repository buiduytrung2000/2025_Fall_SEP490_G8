import * as supplierService from '../services/supplier'

// GET ALL SUPPLIERS
export const getAll = async (req, res) => {
    try {
        const response = await supplierService.getAll()
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

// GET ONE SUPPLIER
export const getOne = async (req, res) => {
    const { supplier_id } = req.params
    try {
        if (!supplier_id) return res.status(400).json({
            err: 1,
            msg: 'Missing supplier_id'
        })
        const response = await supplierService.getOne(supplier_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

// CREATE SUPPLIER
export const create = async (req, res) => {
    const { name, supplier_name } = req.body
    try {
        if (!name && !supplier_name) return res.status(400).json({
            err: 1,
            msg: 'Missing required fields: name'
        })
        const response = await supplierService.create(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

// UPDATE SUPPLIER
export const update = async (req, res) => {
    const { supplier_id } = req.params
    try {
        if (!supplier_id) return res.status(400).json({
            err: 1,
            msg: 'Missing supplier_id'
        })
        const response = await supplierService.update(supplier_id, req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

// DELETE SUPPLIER
export const remove = async (req, res) => {
    const { supplier_id } = req.params
    try {
        if (!supplier_id) return res.status(400).json({
            err: 1,
            msg: 'Missing supplier_id'
        })
        const response = await supplierService.remove(supplier_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

// LIST SUPPLIER USER ACCOUNTS
export const getAccounts = async (req, res) => {
    try {
        const response = await supplierService.getAccounts()
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at supplier controller: ' + error
        })
    }
}

