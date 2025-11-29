import db from '../models'
import { Op } from 'sequelize'

// GET ALL PRICING RULES
export const getAll = (query) => new Promise(async (resolve, reject) => {
    try {
        const { product_id, store_id, active_only } = query || {}
        let where = {}

        if (product_id) where.product_id = product_id
        if (store_id) where.store_id = store_id

        // If active_only, filter by date range
        if (active_only === 'true') {
            const now = new Date()
            where = {
                ...where,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now }
            }
        }

        const response = await db.PricingRule.findAll({
            where,
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'hq_price']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            nest: true
        })

        // Tự động cập nhật status dựa trên thời gian hiện tại
        const now = new Date()
        const updatePromises = response.map(async (rule) => {
            const start = new Date(rule.start_date)
            const end = new Date(rule.end_date)
            const newStatus = computeStatus(start, end)
            
            // Chỉ cập nhật nếu status thay đổi
            if (rule.status !== newStatus) {
                await db.PricingRule.update(
                    { status: newStatus },
                    { where: { rule_id: rule.rule_id } }
                )
                rule.status = newStatus
            }
            return rule
        })

        await Promise.all(updatePromises)

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// GET ONE PRICING RULE
export const getOne = (rule_id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.PricingRule.findOne({
            where: { rule_id },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'hq_price']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                }
            ],
            nest: true
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Pricing rule not found',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// GET PRICING HISTORY FOR A PRODUCT
export const getProductPriceHistory = (product_id, store_id) => new Promise(async (resolve, reject) => {
    try {
        let where = { product_id }
        if (store_id) where.store_id = store_id

        const response = await db.PricingRule.findAll({
            where,
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                }
            ],
            order: [['start_date', 'DESC']],
            nest: true
        })

        // Tự động cập nhật status dựa trên thời gian hiện tại
        const now = new Date()
        const updatePromises = response.map(async (rule) => {
            const start = new Date(rule.start_date)
            const end = new Date(rule.end_date)
            const newStatus = computeStatus(start, end)
            
            // Chỉ cập nhật nếu status thay đổi
            if (rule.status !== newStatus) {
                await db.PricingRule.update(
                    { status: newStatus },
                    { where: { rule_id: rule.rule_id } }
                )
                rule.status = newStatus
            }
            return rule
        })

        await Promise.all(updatePromises)

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE PRICING RULE
const PERMANENT_END_ISO = '9999-12-31T23:59:59.999Z'

const getPermanentEndDate = () => new Date(PERMANENT_END_ISO)

const normalizeEndDateInput = (value) => {
    if (!value) return getPermanentEndDate()
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return getPermanentEndDate()
    }
    return parsed
}

const computeStatus = (start, end) => {
    const now = new Date()
    if (now < start) return 'upcoming'
    if (now > end) return 'expired'
    return 'active'
}

export const create = (body) => new Promise(async (resolve, reject) => {
    try {
        const { product_id, store_id, type, value, start_date, end_date } = body

        if (!product_id || !store_id || !type || value === undefined || !start_date) {
            resolve({
                err: 1,
                msg: 'Missing required fields',
                data: null
            })
            return
        }

        // Validate dates
        const start = new Date(start_date)
        if (Number.isNaN(start.getTime())) {
            resolve({
                err: 1,
                msg: 'Invalid start date',
                data: null
            })
            return
        }

        const end = normalizeEndDateInput(end_date)
        if (start >= end) {
            resolve({
                err: 1,
                msg: 'Start date must be before end date',
                data: null
            })
            return
        }

        const status = computeStatus(start, end)

        const response = await db.PricingRule.create({
            product_id,
            store_id,
            type,
            value: parseFloat(value),
            start_date: start,
            end_date: end,
            status
        })

        const created = await db.PricingRule.findOne({
            where: { rule_id: response.rule_id },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'hq_price']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                }
            ],
            nest: true
        })

        resolve({
            err: 0,
            msg: 'Pricing rule created successfully',
            data: created
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE PRICING RULE
export const update = (rule_id, body) => new Promise(async (resolve, reject) => {
    try {
        const rule = await db.PricingRule.findOne({ where: { rule_id } })
        if (!rule) {
            resolve({
                err: 1,
                msg: 'Pricing rule not found',
                data: false
            })
            return
        }

        // Không cho phép sửa khi trạng thái là 'active'
        if (rule.status === 'active') {
            resolve({
                err: 1,
                msg: 'Không thể sửa quy tắc giá đang áp dụng',
                data: false
            })
            return
        }

        const { type, value, start_date, end_date } = body

        // Validate dates if provided
        let start, end
        const hasStart = !!start_date
        const hasEnd = end_date !== undefined

        if (hasStart) {
            start = new Date(start_date)
            if (Number.isNaN(start.getTime())) {
                resolve({
                    err: 1,
                    msg: 'Invalid start date',
                    data: false
                })
                return
            }
        }

        if (hasEnd) {
            end = normalizeEndDateInput(end_date)
        }

        if (hasStart && hasEnd) {
            if (start >= end) {
                resolve({
                    err: 1,
                    msg: 'Start date must be before end date',
                    data: false
                })
                return
            }
        }

        const updateData = {}
        if (type) updateData.type = type
        if (value !== undefined) updateData.value = parseFloat(value)
        if (hasStart) updateData.start_date = start
        if (hasEnd) updateData.end_date = end

        // Tính status mới dựa trên start/end hiệu lực sau cập nhật
        const effectiveStart = hasStart ? start : rule.start_date
        const effectiveEnd = hasEnd ? end : rule.end_date
        updateData.status = computeStatus(effectiveStart, effectiveEnd)

        const [affectedRows] = await db.PricingRule.update(updateData, {
            where: { rule_id }
        })

        if (affectedRows > 0) {
            const updated = await db.PricingRule.findOne({
                where: { rule_id },
                include: [
                    {
                        model: db.Product,
                        as: 'product',
                        attributes: ['product_id', 'name', 'sku', 'hq_price']
                    },
                    {
                        model: db.Store,
                        as: 'store',
                        attributes: ['store_id', 'name']
                    }
                ],
                nest: true
            })

            resolve({
                err: 0,
                msg: 'Pricing rule updated successfully',
                data: updated
            })
        } else {
            resolve({
                err: 1,
                msg: 'Pricing rule not found',
                data: false
            })
        }
    } catch (error) {
        reject(error)
    }
})

// DELETE PRICING RULE
export const remove = (rule_id) => new Promise(async (resolve, reject) => {
    try {
        const rule = await db.PricingRule.findOne({ where: { rule_id } })
        if (!rule) {
            resolve({
                err: 1,
                msg: 'Pricing rule not found',
                data: false
            })
            return
        }

        // Không cho phép xóa khi trạng thái là 'active'
        if (rule.status === 'active') {
            resolve({
                err: 1,
                msg: 'Không thể xóa quy tắc giá đang áp dụng',
                data: false
            })
            return
        }

        const affectedRows = await db.PricingRule.destroy({
            where: { rule_id }
        })
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Pricing rule deleted successfully' : 'Pricing rule not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// GET CURRENT PRICE FOR A PRODUCT AT A STORE
export const getCurrentPrice = (product_id, store_id) => new Promise(async (resolve, reject) => {
    try {
        const now = new Date()
        const activeRule = await db.PricingRule.findOne({
            where: {
                product_id,
                store_id,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now }
            },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'hq_price']
                }
            ],
            order: [['created_at', 'DESC']],
            nest: true
        })

        if (!activeRule) {
            // Return HQ price if no active rule
            const product = await db.Product.findOne({
                where: { product_id },
                attributes: ['product_id', 'name', 'sku', 'hq_price']
            })
            resolve({
                err: 0,
                msg: 'OK',
                data: {
                    product_id,
                    store_id,
                    current_price: product ? parseFloat(product.hq_price) : 0,
                    rule: null,
                    source: 'hq_price'
                }
            })
            return
        }

        // Calculate price based on rule type
        const hqPrice = parseFloat(activeRule.product.hq_price)
        let currentPrice = hqPrice

        if (activeRule.type === 'markup') {
            // Markup: cộng thêm số tiền
            currentPrice = hqPrice + parseFloat(activeRule.value)
        } else if (activeRule.type === 'markdown') {
            // Markdown: trừ đi số tiền
            currentPrice = hqPrice - parseFloat(activeRule.value)
        } else if (activeRule.type === 'fixed_price') {
            currentPrice = parseFloat(activeRule.value)
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: {
                product_id,
                store_id,
                current_price: currentPrice,
                rule: activeRule,
                source: 'pricing_rule'
            }
        })
    } catch (error) {
        reject(error)
    }
})

