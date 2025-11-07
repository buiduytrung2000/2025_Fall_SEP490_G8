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
                    attributes: ['category_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact', 'address', 'email']
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
                    attributes: ['category_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact', 'address', 'email']
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
                    as: 'product',
                    include: [
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['category_id', 'name']
                        }
                    ]
                }
            ],
            nest: true
        })

        const now = new Date()
        
        // Get all active pricing rules for this store
        const activeRules = await db.PricingRule.findAll({
            where: {
                store_id,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now }
            },
            nest: true
        })

        // Create a map of product_id -> active rule for quick lookup
        const ruleMap = {}
        activeRules.forEach(rule => {
            // Convert to plain object to avoid circular references
            const rulePlain = rule.get ? rule.get({ plain: true }) : JSON.parse(JSON.stringify(rule))
            if (!ruleMap[rulePlain.product_id] || new Date(rulePlain.created_at) > new Date(ruleMap[rulePlain.product_id]?.created_at || 0)) {
                ruleMap[rulePlain.product_id] = rulePlain
            }
        })

        const data = inventories.map(inv => {
            // Convert Sequelize instance to plain object to avoid circular references
            const invPlain = inv.get ? inv.get({ plain: true }) : JSON.parse(JSON.stringify(inv))
            const product = invPlain.product || {}
            
            // Extract category data safely
            const category = product.category ? {
                category_id: product.category.category_id,
                name: product.category.name
            } : null

            const hqPrice = parseFloat(product.hq_price || 0)
            let currentPrice = hqPrice
            const activeRule = ruleMap[product.product_id]

            // Calculate current price based on active rule
            if (activeRule) {
                if (activeRule.type === 'markup') {
                    currentPrice = hqPrice + parseFloat(activeRule.value)
                } else if (activeRule.type === 'markdown') {
                    currentPrice = hqPrice - parseFloat(activeRule.value)
                } else if (activeRule.type === 'fixed_price') {
                    currentPrice = parseFloat(activeRule.value)
                }
            }

            return {
                inventory_id: invPlain.inventory_id,
                store_id: invPlain.store_id,
                product_id: invPlain.product_id,
                stock: invPlain.stock,
                min_stock_level: invPlain.min_stock_level,
                reorder_point: invPlain.reorder_point,
                product: {
                    product_id: product.product_id,
                    name: product.name,
                    sku: product.sku,
                    hq_price: hqPrice,
                    current_price: currentPrice,
                    category_id: product.category_id,
                    supplier_id: product.supplier_id,
                    category: category
                }
            }
        })

        resolve({
            err: 0,
            msg: 'OK',
            data
        })
    } catch (error) {
        reject(error)
    }
})

// GET PRODUCTS FOR PRICE MANAGEMENT (with current pricing info)
export const getForPriceManagement = (query) => new Promise(async (resolve, reject) => {
    try {
        const { store_id, search, category_id, supplier_id } = query || {}
        
        // Get all products
        let where = {}
        if (category_id) where.category_id = category_id
        if (supplier_id) where.supplier_id = supplier_id

        const products = await db.Product.findAll({
            where,
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    attributes: ['category_id', 'name']
                },
                {
                    model: db.Supplier,
                    as: 'supplier',
                    attributes: ['supplier_id', 'name', 'contact', 'address', 'email']
                }
            ],
            nest: true
        })

        // Filter by search if provided
        let filteredProducts = products
        if (search) {
            filteredProducts = products.filter(product =>
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.sku.toLowerCase().includes(search.toLowerCase())
            )
        }

        // Get current pricing for each product if store_id is provided
        const now = new Date()
        const productsWithPricing = await Promise.all(
            filteredProducts.map(async (product) => {
                // Convert Sequelize instance to plain object to avoid circular references
                const productPlain = product.get ? product.get({ plain: true }) : JSON.parse(JSON.stringify(product))
                
                let currentPrice = parseFloat(productPlain.hq_price || 0)
                let activePricingRule = null
                let priceSource = 'hq_price'

                if (store_id) {
                    // Get active pricing rule for this product and store
                    const activeRule = await db.PricingRule.findOne({
                        where: {
                            product_id: productPlain.product_id,
                            store_id: parseInt(store_id),
                            start_date: { [Op.lte]: now },
                            end_date: { [Op.gte]: now }
                        },
                        include: [
                            {
                                model: db.Store,
                                as: 'store',
                                attributes: ['store_id', 'name']
                            }
                        ],
                        order: [['created_at', 'DESC']],
                        nest: true,
                        raw: false
                    })

                    if (activeRule) {
                        // Convert activeRule to plain object
                        const activeRulePlain = activeRule.get ? activeRule.get({ plain: true }) : JSON.parse(JSON.stringify(activeRule))
                        
                        activePricingRule = {
                            rule_id: activeRulePlain.rule_id,
                            type: activeRulePlain.type,
                            value: parseFloat(activeRulePlain.value),
                            start_date: activeRulePlain.start_date,
                            end_date: activeRulePlain.end_date,
                            store: activeRulePlain.store ? {
                                store_id: activeRulePlain.store.store_id,
                                name: activeRulePlain.store.name
                            } : null
                        }

                        // Calculate current price based on rule type
                        const hqPrice = parseFloat(productPlain.hq_price || 0)
                        if (activeRulePlain.type === 'markup') {
                            currentPrice = hqPrice + parseFloat(activeRulePlain.value)
                        } else if (activeRulePlain.type === 'markdown') {
                            currentPrice = hqPrice - parseFloat(activeRulePlain.value)
                        } else if (activeRulePlain.type === 'fixed_price') {
                            currentPrice = parseFloat(activeRulePlain.value)
                        }
                        priceSource = 'pricing_rule'
                    }
                }

                // Return plain object with only needed fields
                return {
                    product_id: productPlain.product_id,
                    name: productPlain.name,
                    sku: productPlain.sku,
                    hq_price: parseFloat(productPlain.hq_price || 0),
                    description: productPlain.description || null,
                    category_id: productPlain.category_id,
                    supplier_id: productPlain.supplier_id,
                    created_at: productPlain.created_at,
                    updated_at: productPlain.updated_at,
                    category: productPlain.category ? {
                        category_id: productPlain.category.category_id,
                        name: productPlain.category.name
                    } : null,
                    supplier: productPlain.supplier ? {
                        supplier_id: productPlain.supplier.supplier_id,
                        name: productPlain.supplier.name,
                        contact: productPlain.supplier.contact,
                        address: productPlain.supplier.address,
                        email: productPlain.supplier.email
                    } : null,
                    current_price: currentPrice,
                    price_source: priceSource,
                    active_pricing_rule: activePricingRule
                }
            })
        )

        resolve({
            err: 0,
            msg: 'OK',
            data: productsWithPricing
        })
    } catch (error) {
        reject(error)
    }
})

