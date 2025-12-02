import db from '../models'
import { Op, Sequelize } from 'sequelize'

// GET ALL PRODUCTS
export const getAll = (query) => new Promise(async (resolve, reject) => {
    try {
        const { category_id, supplier_id, search, include_inactive = false } = query || {}
        let where = {}

        if (category_id) where.category_id = category_id
        if (supplier_id) where.supplier_id = supplier_id

        // By default, only show active products unless explicitly requested
        if (!include_inactive) {
            where.is_active = true
        }

        const response = await db.Product.findAll({
            where,
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT 
                                CASE 
                                    WHEN oi.unit_id = Product.base_unit_id THEN oi.unit_price
                                    WHEN pu.conversion_to_base > 0 THEN ROUND(oi.unit_price / pu.conversion_to_base, 2)
                                    ELSE oi.unit_price
                                END as import_price
                            FROM OrderItem oi
                            INNER JOIN \`Order\` o ON oi.order_id = o.order_id
                            LEFT JOIN ProductUnit pu ON pu.product_id = oi.product_id AND pu.unit_id = oi.unit_id
                            WHERE oi.product_id = Product.product_id
                            AND o.status = 'confirmed'
                            ORDER BY o.created_at DESC, oi.created_at DESC
                            LIMIT 1
                        )`),
                        'latest_import_price'
                    ]
                ]
            },
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
export const getOne = (product_id, include_inactive = false) => new Promise(async (resolve, reject) => {
    try {
        let where = { product_id }

        // By default, only show active products unless explicitly requested
        if (!include_inactive) {
            where.is_active = true
        }

        const response = await db.Product.findOne({
            where,
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT 
                                CASE 
                                    WHEN oi.unit_id = Product.base_unit_id THEN oi.unit_price
                                    WHEN pu.conversion_to_base > 0 THEN ROUND(oi.unit_price / pu.conversion_to_base, 2)
                                    ELSE oi.unit_price
                                END as import_price
                            FROM OrderItem oi
                            INNER JOIN \`Order\` o ON oi.order_id = o.order_id
                            LEFT JOIN ProductUnit pu ON pu.product_id = oi.product_id AND pu.unit_id = oi.unit_id
                            WHERE oi.product_id = Product.product_id
                            AND o.status = 'confirmed'
                            ORDER BY o.created_at DESC, oi.created_at DESC
                            LIMIT 1
                        )`),
                        'latest_import_price'
                    ]
                ]
            },
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
                },
                {
                    model: db.ProductUnit,
                    as: 'units',
                    include: [
                        {
                            model: db.Unit,
                            as: 'unit',
                            attributes: ['unit_id', 'name', 'symbol']
                        }
                    ],
                    attributes: ['product_unit_id', 'unit_id', 'conversion_to_base']
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
    const transaction = await db.sequelize.transaction()
    try {
        // Check if SKU already exists (including inactive products)
        const existingProduct = await db.Product.findOne({
            where: { sku: body.sku },
            transaction
        })

        if (existingProduct) {
            await transaction.rollback()
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
            base_unit_id: body.base_unit_id,
            hq_price: body.hq_price || 0.00,
            import_price: body.import_price || 0.00,
            description: body.description,
            is_active: true  // New products are active by default
        }, { transaction })

        // Create ProductUnit for package unit if provided
        if (body.package_unit_id && body.conversion_factor && body.conversion_factor > 0) {
            await db.ProductUnit.create({
                product_id: response.product_id,
                unit_id: body.package_unit_id,
                conversion_to_base: body.conversion_factor
            }, { transaction })
        }

        await transaction.commit()
        resolve({
            err: 0,
            msg: 'Product created successfully',
            data: response
        })
    } catch (error) {
        await transaction.rollback()
        reject(error)
    }
})

// UPDATE PRODUCT
export const update = (product_id, body) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction()
    try {
        // If updating SKU, check if it's unique
        if (body.sku) {
            const existingProduct = await db.Product.findOne({
                where: {
                    sku: body.sku,
                    product_id: { [Op.ne]: product_id }
                },
                transaction
            })

            if (existingProduct) {
                await transaction.rollback()
                resolve({
                    err: 1,
                    msg: 'SKU already exists',
                    data: false
                })
                return
            }
        }

        // Build update object with only provided fields
        const updateData = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.sku !== undefined) updateData.sku = body.sku
        if (body.category_id !== undefined) updateData.category_id = body.category_id
        if (body.supplier_id !== undefined) updateData.supplier_id = body.supplier_id
        if (body.base_unit_id !== undefined) updateData.base_unit_id = body.base_unit_id
        if (body.hq_price !== undefined) updateData.hq_price = body.hq_price
        if (body.import_price !== undefined) updateData.import_price = body.import_price
        if (body.description !== undefined) updateData.description = body.description
        if (body.is_active !== undefined) updateData.is_active = body.is_active

        const [affectedRows] = await db.Product.update(
            updateData,
            {
                where: { product_id },
                transaction
            }
        )

        if (affectedRows === 0) {
            await transaction.rollback()
            resolve({
                err: 1,
                msg: 'Product not found',
                data: false
            })
            return
        }

        // Handle ProductUnit for package unit
        if (body.package_unit_id !== undefined) {
            // Find existing ProductUnit for this product (excluding base unit)
            const existingProductUnits = await db.ProductUnit.findAll({
                where: {
                    product_id: product_id,
                    unit_id: { [Op.ne]: body.base_unit_id || null }
                },
                transaction
            })

            // Delete existing package units
            if (existingProductUnits.length > 0) {
                await db.ProductUnit.destroy({
                    where: {
                        product_id: product_id,
                        unit_id: { [Op.ne]: body.base_unit_id || null }
                    },
                    transaction
                })
            }

            // Create new ProductUnit if package_unit_id and conversion_factor are provided
            if (body.package_unit_id && body.conversion_factor && body.conversion_factor > 0) {
                await db.ProductUnit.create({
                    product_id: product_id,
                    unit_id: body.package_unit_id,
                    conversion_to_base: body.conversion_factor
                }, { transaction })
            }
        }

        await transaction.commit()
        resolve({
            err: 0,
            msg: 'Product updated successfully',
            data: true
        })
    } catch (error) {
        await transaction.rollback()
        reject(error)
    }
})

// SOFT DELETE PRODUCT
export const remove = (product_id) => new Promise(async (resolve, reject) => {
    try {
        // Soft delete: set is_active to false instead of destroying the record
        const [affectedRows] = await db.Product.update(
            { is_active: false },
            { where: { product_id, is_active: true } }
        )
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Product deleted successfully' : 'Product not found or already deleted',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// RESTORE PRODUCT (undo soft delete)
export const restore = (product_id) => new Promise(async (resolve, reject) => {
    try {
        const [affectedRows] = await db.Product.update(
            { is_active: true },
            { where: { product_id, is_active: false } }
        )
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Product restored successfully' : 'Product not found or already active',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// HARD DELETE PRODUCT (permanent deletion - use with caution)
export const hardDelete = (product_id) => new Promise(async (resolve, reject) => {
    try {
        const affectedRows = await db.Product.destroy({
            where: { product_id }
        })
        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 ? 'Product permanently deleted' : 'Product not found',
            data: affectedRows > 0
        })
    } catch (error) {
        reject(error)
    }
})

// TOGGLE PRODUCT STATUS (switch between active and inactive)
export const toggleStatus = (product_id) => new Promise(async (resolve, reject) => {
    try {
        // First, get the current status
        const product = await db.Product.findOne({
            where: { product_id },
            attributes: ['product_id', 'is_active', 'name']
        })

        if (!product) {
            resolve({
                err: 1,
                msg: 'Product not found',
                data: null
            })
            return
        }

        // Toggle the status
        const newStatus = !product.is_active
        const [affectedRows] = await db.Product.update(
            { is_active: newStatus },
            { where: { product_id } }
        )

        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0
                ? `Product ${newStatus ? 'activated' : 'deactivated'} successfully`
                : 'Failed to update product status',
            data: {
                product_id: product.product_id,
                name: product.name,
                is_active: newStatus
            }
        })
    } catch (error) {
        reject(error)
    }
})

// GET PRODUCTS BY STORE
export const getByStore = (store_id, include_inactive = false) => new Promise(async (resolve, reject) => {
    try {
        const inventories = await db.Inventory.findAll({
            where: { store_id },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    where: include_inactive ? {} : { is_active: true },
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
        const { store_id, search, category_id, supplier_id, include_inactive = false } = query || {}

        // Get all products
        let where = {}
        if (category_id) where.category_id = category_id
        if (supplier_id) where.supplier_id = supplier_id

        // By default, only show active products
        if (!include_inactive) {
            where.is_active = true
        }

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


// GET PRODUCT BY BARCODE WITH PRICING AND INVENTORY
// Trả về: product_id, name, sku, is_active, unit_id, unit_name, conversion_to_base,
// current_price (đã áp dụng pricing rule nếu có), tồn kho theo store
export const getByBarcode = (barcode, storeId) => new Promise(async (resolve, reject) => {
    try {
        if (!barcode || !storeId) {
            resolve({
                err: 1,
                msg: 'Missing barcode or storeId',
                data: null
            })
            return
        }

        // Normalize barcode: trim, loại bỏ khoảng trắng
        const normalizedBarcode = barcode.trim()

        // Bước 1: Tìm theo ProductUnit.barcode (ưu tiên)
        let productUnit = await db.ProductUnit.findOne({
            where: { barcode: normalizedBarcode },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'is_active', 'hq_price', 'base_unit_id'],
                    include: [
                        {
                            model: db.Unit,
                            as: 'baseUnit',
                            attributes: ['unit_id', 'name']
                        }
                    ]
                },
                {
                    model: db.Unit,
                    as: 'unit',
                    attributes: ['unit_id', 'name']
                }
            ]
        })

        // Bước 2: Nếu không tìm được theo barcode, thử tìm theo SKU
        if (!productUnit) {
            const product = await db.Product.findOne({
                where: { sku: normalizedBarcode, is_active: true },
                include: [
                    {
                        model: db.Unit,
                        as: 'baseUnit',
                        attributes: ['unit_id', 'name']
                    }
                ]
            })

            if (!product) {
                resolve({
                    err: 1,
                    msg: 'Không tìm thấy sản phẩm cho mã: ' + normalizedBarcode,
                    data: null
                })
                return
            }

            // Nếu tìm được theo SKU, dùng base unit làm default unit
            productUnit = {
                product_unit_id: null,
                product_id: product.product_id,
                unit_id: product.base_unit_id,
                conversion_to_base: 1,
                product: product,
                unit: product.baseUnit
            }
        }

        // Kiểm tra sản phẩm có is_active = true không
        if (!productUnit.product || !productUnit.product.is_active) {
            resolve({
                err: 1,
                msg: 'Sản phẩm đã bị vô hiệu hóa',
                data: null
            })
            return
        }

        // Bước 3: Tính giá bán hiện tại (áp dụng pricing rule nếu có)
        const product = productUnit.product
        let currentPrice = product.hq_price || 0

        // Kiểm tra có pricing rule đang hiệu lực cho store này không
        const activeRule = await db.PricingRule.findOne({
            where: {
                product_id: product.product_id,
                store_id: storeId,
                start_date: { [Op.lte]: new Date() },
                end_date: { [Op.gte]: new Date() }
            }
        })

        if (activeRule) {
            const basePrice = product.hq_price || 0
            if (activeRule.type === 'fixed_price') {
                currentPrice = activeRule.value
            } else if (activeRule.type === 'markup') {
                currentPrice = basePrice + basePrice * (activeRule.value / 100)
            } else if (activeRule.type === 'markdown') {
                currentPrice = basePrice - basePrice * (activeRule.value / 100)
            }
        }

        // Bước 4: Lấy tồn kho theo store (tính theo đơn vị cơ sở)
        const inventory = await db.Inventory.findOne({
            where: {
                product_id: product.product_id,
                store_id: storeId
            }
        })

        const baseQuantity = inventory ? inventory.stock : 0
        // Chuyển đổi tồn kho sang đơn vị được quét (chia cho conversion_to_base)
        const availableQuantity = productUnit.conversion_to_base > 0
            ? Math.floor(baseQuantity / productUnit.conversion_to_base)
            : 0

        // Chuẩn bị response
        resolve({
            err: 0,
            msg: 'OK',
            data: {
                product_id: product.product_id,
                name: product.name,
                sku: product.sku,
                is_active: product.is_active,
                product_unit_id: productUnit.product_unit_id,
                unit_id: productUnit.unit_id,
                unit_name: productUnit.unit?.name || 'Đơn vị',
                conversion_to_base: parseFloat(productUnit.conversion_to_base),
                current_price: parseFloat(currentPrice),
                hq_price: parseFloat(product.hq_price || 0),
                base_quantity: baseQuantity, // Tồn kho theo đơn vị cơ sở
                available_quantity: availableQuantity, // Tồn kho theo đơn vị được quét
                barcode: normalizedBarcode,
                matched_by: productUnit.product_unit_id ? 'barcode' : 'sku'
            }
        })
    } catch (error) {
        reject(error)
    }
})
