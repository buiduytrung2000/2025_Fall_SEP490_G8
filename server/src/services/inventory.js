import db from '../models';
import { Op } from 'sequelize';

// Get inventory by store_id (for store manager)
export const getInventoryByStore = (storeId) => new Promise(async (resolve, reject) => {
    try {
        if (!storeId) {
            return resolve({
                err: 1,
                msg: 'Missing store_id',
                data: []
            });
        }

        const inventories = await db.Inventory.findAll({
            where: { store_id: storeId },
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
        });

        const now = new Date();
        
        // Get all active pricing rules for this store
        const activeRules = await db.PricingRule.findAll({
            where: {
                store_id: storeId,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now }
            },
            nest: true
        });

        // Create a map of product_id -> active rule for quick lookup
        const ruleMap = {};
        activeRules.forEach(rule => {
            const rulePlain = rule.get ? rule.get({ plain: true }) : JSON.parse(JSON.stringify(rule));
            if (!ruleMap[rulePlain.product_id] || new Date(rulePlain.created_at) > new Date(ruleMap[rulePlain.product_id]?.created_at || 0)) {
                ruleMap[rulePlain.product_id] = rulePlain;
            }
        });

        const data = inventories.map(inv => {
            const invPlain = inv.get ? inv.get({ plain: true }) : JSON.parse(JSON.stringify(inv));
            const product = invPlain.product || {};
            
            const category = product.category ? {
                category_id: product.category.category_id,
                name: product.category.name
            } : null;

            const hqPrice = parseFloat(product.hq_price || 0);
            let currentPrice = hqPrice;
            const activeRule = ruleMap[product.product_id];

            // Calculate current price based on active rule
            if (activeRule) {
                if (activeRule.type === 'markup') {
                    currentPrice = hqPrice + parseFloat(activeRule.value);
                } else if (activeRule.type === 'markdown') {
                    currentPrice = hqPrice - parseFloat(activeRule.value);
                } else if (activeRule.type === 'fixed_price') {
                    currentPrice = parseFloat(activeRule.value);
                }
            }

            return {
                inventory_id: invPlain.inventory_id,
                store_id: invPlain.store_id,
                product_id: invPlain.product_id,
                stock: invPlain.stock,
                min_stock_level: invPlain.min_stock_level,
                reorder_point: invPlain.reorder_point,
                sku: product.sku || '',
                name: product.name || '',
                category: category ? category.name : '',
                unit: 'Cái', // Default unit, can be added to Product table later
                price: Math.round(currentPrice),
                status: invPlain.stock <= invPlain.min_stock_level ? 'Thiếu hàng' : 'Ổn định'
            };
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: data
        });
    } catch (error) {
        reject(error);
    }
});


export const getAllInventoryService = async ({ page, limit, storeId, categoryId, status, search }) => {
    try {
        const offset = (page - 1) * limit;
        
        const whereConditions = {};
        if (storeId) whereConditions.store_id = storeId;

        const productWhere = {};
        if (search) {
            productWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } }
            ];
        }

        const includeConditions = [
            {
                model: db.Store,
                as: 'store',
                attributes: ['store_id', 'name', 'address', 'phone']
            },
            {
                model: db.Product,
                as: 'product',
                attributes: ['product_id', 'name', 'sku', 'description', 'hq_price'],
                where: productWhere,
                include: [
                    {
                        model: db.Category,
                        as: 'category',
                        attributes: ['category_id', 'name'],
                        ...(categoryId && {
                            where: { category_id: categoryId }
                        })
                    },
                    {
                        model: db.Supplier,
                        as: 'supplier',
                        attributes: ['supplier_id', 'name', 'contact']
                    }
                ]
            }
        ];

        const { count, rows } = await db.Inventory.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
            order: [['updated_at', 'DESC']],
            distinct: true
        });

        const inventoryWithStatus = rows.map(item => {
            const itemData = item.toJSON();
            
            let stockStatus = 'normal';
            if (itemData.stock === 0) {
                stockStatus = 'out_of_stock';
            } else if (itemData.stock <= itemData.min_stock_level) {
                stockStatus = 'critical';
            } else if (itemData.stock <= itemData.reorder_point) {
                stockStatus = 'low';
            }

            return {
                ...itemData,
                stockStatus,
                stockValue: itemData.stock * (itemData.product?.hq_price || 0)
            };
        });

        let filteredInventory = inventoryWithStatus;
        if (status) {
            filteredInventory = inventoryWithStatus.filter(item => item.stockStatus === status);
        }

        const filteredCount = filteredInventory.length;
        const paginatedInventory = status ? filteredInventory : inventoryWithStatus;

        return {
            err: 0,
            msg: 'Get inventory successfully',
            data: {
                inventory: paginatedInventory,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil((status ? filteredCount : count) / limit),
                    totalItems: status ? filteredCount : count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get inventory detail by ID
 */
export const getInventoryDetailService = async (inventoryId) => {
    try {
        const inventory = await db.Inventory.findByPk(inventoryId, {
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address', 'phone', 'status']
                },
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'description', 'hq_price'],
                    include: [
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['category_id', 'name']
                        },
                        {
                            model: db.Supplier,
                            as: 'supplier',
                            attributes: ['supplier_id', 'name', 'contact', 'email']
                        }
                    ]
                }
            ]
        });

        if (!inventory) {
            return { err: 1, msg: 'Inventory not found' };
        }

        const itemData = inventory.toJSON();

        let stockStatus = 'normal';
        if (itemData.stock === 0) {
            stockStatus = 'out_of_stock';
        } else if (itemData.stock <= itemData.min_stock_level) {
            stockStatus = 'critical';
        } else if (itemData.stock <= itemData.reorder_point) {
            stockStatus = 'low';
        }

        return {
            err: 0,
            msg: 'Get inventory detail successfully',
            data: {
                ...itemData,
                stockStatus,
                stockValue: itemData.stock * (itemData.product?.hq_price || 0)
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get inventory statistics (for Warehouse)
 */
export const getInventoryStatisticsService = async ({ storeId }) => {
    try {
        const whereConditions = {};
        if (storeId) whereConditions.store_id = storeId;

        const inventoryItems = await db.Inventory.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['hq_price']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['name']
                }
            ]
        });

        let totalItems = 0;
        let totalValue = 0;
        let outOfStock = 0;
        let lowStock = 0;
        let criticalStock = 0;
        let normalStock = 0;

        const byStore = {};

        inventoryItems.forEach(item => {
            const stock = item.stock;
            const value = stock * (item.product?.hq_price || 0);
            
            totalItems += stock;
            totalValue += value;

            if (stock === 0) {
                outOfStock++;
            } else if (stock <= item.min_stock_level) {
                criticalStock++;
            } else if (stock <= item.reorder_point) {
                lowStock++;
            } else {
                normalStock++;
            }

            const storeName = item.store?.name || 'Unknown';
            if (!byStore[storeName]) {
                byStore[storeName] = { items: 0, value: 0 };
            }
            byStore[storeName].items += stock;
            byStore[storeName].value += value;
        });

        return {
            err: 0,
            msg: 'Get inventory statistics successfully',
            data: {
                totalProducts: inventoryItems.length,
                totalItems,
                totalValue: parseFloat(totalValue.toFixed(2)),
                stockStatus: {
                    normal: normalStock,
                    low: lowStock,
                    critical: criticalStock,
                    outOfStock: outOfStock
                },
                byStore: Object.entries(byStore).map(([name, data]) => ({
                    store: name,
                    items: data.items,
                    value: parseFloat(data.value.toFixed(2))
                }))
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get low stock items
 */
export const getLowStockItemsService = async ({ storeId, page, limit }) => {
    try {
        const offset = (page - 1) * limit;
        
        const whereConditions = {
            [Op.or]: [
                { stock: { [Op.lte]: db.sequelize.col('reorder_point') } },
                { stock: 0 }
            ]
        };
        
        if (storeId) whereConditions.store_id = storeId;

        const { count, rows } = await db.Inventory.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'hq_price'],
                    include: [
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['category_id', 'name']
                        }
                    ]
                }
            ],
            limit,
            offset,
            order: [['stock', 'ASC']]
        });

        const itemsWithStatus = rows.map(item => {
            const itemData = item.toJSON();
            let stockStatus = 'low';
            
            if (itemData.stock === 0) {
                stockStatus = 'out_of_stock';
            } else if (itemData.stock <= itemData.min_stock_level) {
                stockStatus = 'critical';
            }

            return {
                ...itemData,
                stockStatus,
                needReorder: itemData.reorder_point - itemData.stock
            };
        });

        return {
            err: 0,
            msg: 'Get low stock items successfully',
            data: {
                items: itemsWithStatus,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    limit
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

// =====================================================
// UPDATE SERVICES
// =====================================================

/**
 * Update inventory stock (for Store Manager)
 * GIỮ NGUYÊN logic cũ
 */
export const updateInventoryStock = (inventoryId, stock, minStockLevel, reorderPoint) => new Promise(async (resolve, reject) => {
    try {
        if (!inventoryId) {
            return resolve({
                err: 1,
                msg: 'Missing inventory_id'
            });
        }

        const updateData = {};
        if (stock !== undefined) updateData.stock = parseInt(stock);
        if (minStockLevel !== undefined) updateData.min_stock_level = parseInt(minStockLevel);
        if (reorderPoint !== undefined) updateData.reorder_point = parseInt(reorderPoint);

        const [updated] = await db.Inventory.update(updateData, {
            where: { inventory_id: inventoryId }
        });

        if (updated === 0) {
            return resolve({
                err: 1,
                msg: 'Inventory not found'
            });
        }

        const updatedInventory = await db.Inventory.findOne({
            where: { inventory_id: inventoryId },
            include: [
                {
                    model: db.Product,
                    as: 'product'
                }
            ],
            nest: true
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: updatedInventory
        });
    } catch (error) {
        reject(error);
    }
});

/**
 * Update inventory settings (for Warehouse)
 * CHỈ UPDATE min_stock_level và reorder_point
 */
export const updateInventoryService = async ({ inventoryId, min_stock_level, reorder_point }) => {
    try {
        const inventory = await db.Inventory.findByPk(inventoryId);

        if (!inventory) {
            return { err: 1, msg: 'Inventory not found' };
        }

        if (min_stock_level !== undefined && min_stock_level < 0) {
            return { err: 1, msg: 'Minimum stock level phải >= 0' };
        }

        if (reorder_point !== undefined && reorder_point < 0) {
            return { err: 1, msg: 'Reorder point phải >= 0' };
        }

        if (min_stock_level !== undefined && reorder_point !== undefined) {
            if (min_stock_level > reorder_point) {
                return { err: 1, msg: 'Minimum stock level không thể lớn hơn reorder point' };
            }
        }

        const updateData = { updated_at: new Date() };
        if (min_stock_level !== undefined) updateData.min_stock_level = min_stock_level;
        if (reorder_point !== undefined) updateData.reorder_point = reorder_point;

        await inventory.update(updateData);

        return {
            err: 0,
            msg: 'Cập nhật inventory thành công',
            data: inventory
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Manual stock adjustment (for Warehouse staff only)
 */
export const adjustStockService = async ({ inventoryId, adjustment, reason, adjustedBy }) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const inventory = await db.Inventory.findByPk(inventoryId, { transaction });

        if (!inventory) {
            await transaction.rollback();
            return { err: 1, msg: 'Inventory not found' };
        }

        const newStock = inventory.stock + adjustment;

        if (newStock < 0) {
            await transaction.rollback();
            return { err: 1, msg: `Không thể điều chỉnh. Stock hiện tại: ${inventory.stock}, Điều chỉnh: ${adjustment}` };
        }

        await inventory.update({
            stock: newStock,
            updated_at: new Date()
        }, { transaction });

        await transaction.commit();

        return {
            err: 0,
            msg: `Điều chỉnh stock thành công. Stock mới: ${newStock}`,
            data: {
                ...inventory.toJSON(),
                stock: newStock,
                adjustment,
                reason
            }
        };
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error adjusting stock:', error);
        throw error;
    }
};
