import * as customerService from '../services/customer'

// GET ALL CUSTOMERS
export const getAll = async (req, res) => {
    try {
        const response = await customerService.getAll(req.query)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

// GET ONE CUSTOMER
export const getOne = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })
        const response = await customerService.getOne(customer_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

// SEARCH CUSTOMER BY PHONE
export const searchByPhone = async (req, res) => {
    const { phone } = req.query
    try {
        if (!phone) return res.status(400).json({
            err: 1,
            msg: 'Missing phone parameter'
        })
        const response = await customerService.searchByPhone(phone)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

// CREATE CUSTOMER
export const create = async (req, res) => {
    try {
        const { name, phone, email } = req.body
        if (!name || !phone) return res.status(400).json({
            err: 1,
            msg: 'Missing required fields: name, phone'
        })
        const response = await customerService.create(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

// UPDATE CUSTOMER
export const update = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })
        const response = await customerService.update(customer_id, req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

// DELETE CUSTOMER
export const remove = async (req, res) => {
    const { customer_id } = req.params
    try {
        if (!customer_id) return res.status(400).json({
            err: 1,
            msg: 'Missing customer_id'
        })
        const response = await customerService.remove(customer_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at customer controller: ' + error
        })
    }
}

