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

// Update inventory stock
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

