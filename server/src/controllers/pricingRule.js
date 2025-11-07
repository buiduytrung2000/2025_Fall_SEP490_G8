import * as pricingRuleService from '../services/pricingRule'

// GET ALL PRICING RULES
export const getAll = async (req, res) => {
    try {
        const response = await pricingRuleService.getAll(req.query)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// GET ONE PRICING RULE
export const getOne = async (req, res) => {
    const { rule_id } = req.params
    try {
        if (!rule_id) return res.status(400).json({
            err: 1,
            msg: 'Missing rule_id'
        })
        const response = await pricingRuleService.getOne(rule_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// GET PRICING HISTORY FOR A PRODUCT
export const getProductPriceHistory = async (req, res) => {
    const { product_id } = req.params
    const { store_id } = req.query
    try {
        if (!product_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id'
        })
        const response = await pricingRuleService.getProductPriceHistory(product_id, store_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// CREATE PRICING RULE
export const create = async (req, res) => {
    try {
        const response = await pricingRuleService.create(req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// UPDATE PRICING RULE
export const update = async (req, res) => {
    const { rule_id } = req.params
    try {
        if (!rule_id) return res.status(400).json({
            err: 1,
            msg: 'Missing rule_id'
        })
        const response = await pricingRuleService.update(rule_id, req.body)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// DELETE PRICING RULE
export const remove = async (req, res) => {
    const { rule_id } = req.params
    try {
        if (!rule_id) return res.status(400).json({
            err: 1,
            msg: 'Missing rule_id'
        })
        const response = await pricingRuleService.remove(rule_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

// GET CURRENT PRICE FOR A PRODUCT AT A STORE
export const getCurrentPrice = async (req, res) => {
    const { product_id, store_id } = req.params
    try {
        if (!product_id || !store_id) return res.status(400).json({
            err: 1,
            msg: 'Missing product_id or store_id'
        })
        const response = await pricingRuleService.getCurrentPrice(product_id, store_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at pricing rule controller: ' + error
        })
    }
}

