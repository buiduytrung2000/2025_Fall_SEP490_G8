import db from '../models';
import { Op } from 'sequelize';

const buildPackageMetaMap = async (productIds = []) => {
    if (!productIds.length) return {};

    const productUnits = await db.ProductUnit.findAll({
        where: { product_id: productIds },
        include: [
            {
                model: db.Unit,
                as: 'unit',
                attributes: ['unit_id', 'name', 'symbol']
            }
        ],
        order: [['conversion_to_base', 'DESC']]
    });

    const metaMap = {};
    productUnits.forEach((pu) => {
        const plain = pu.get ? pu.get({ plain: true }) : JSON.parse(JSON.stringify(pu));
        const conversion = Number(plain.conversion_to_base) || 0;
        if (!plain.product_id) return;
        if (!metaMap[plain.product_id] || conversion > metaMap[plain.product_id].conversion_to_base) {
            metaMap[plain.product_id] = {
                conversion_to_base: conversion,
                unit: plain.unit
                    ? {
                        unit_id: plain.unit.unit_id,
                        name: plain.unit.name,
                        symbol: plain.unit.symbol
                    }
                    : null
            };
        }
    });

    return metaMap;
};

// Get inventory by store_id (for store manager)
// Hiển thị toàn bộ sản phẩm trong danh mục sản phẩm,
// những sản phẩm chưa có bản ghi tồn kho sẽ có stock = 0.
export const getInventoryByStore = (storeId) => new Promise(async (resolve, reject) => {
    try {
        if (!storeId) {
            return resolve({
                err: 1,
                msg: 'Missing store_id',
                data: []
            });
        }

        // 1. Lấy toàn bộ sản phẩm đang active
        const products = await db.Product.findAll({
            where: { is_active: true },
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
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
                    attributes: ['supplier_id', 'name', 'contact']
                }
            ],
            nest: true
        });

        if (!products.length) {
            return resolve({ err: 0, msg: 'OK', data: [] });
        }

        // 2. Lấy các bản ghi tồn kho hiện có của cửa hàng này
        const inventories = await db.Inventory.findAll({
            where: { store_id: storeId },
            raw: true
        });
        const inventoryMap = {};
        inventories.forEach(inv => {
            if (inv.product_id) inventoryMap[inv.product_id] = inv;
        });

        const now = new Date();
        const productIds = products.map(p => p.product_id);
        const packageMetaMap = await buildPackageMetaMap(productIds);

        // 3. Lấy pricing rule đang active cho cửa hàng
        const activeRules = await db.PricingRule.findAll({
            where: {
                store_id: storeId,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now }
            },
            nest: true
        });

        const ruleMap = {};
        activeRules.forEach(rule => {
            const rulePlain = rule.get ? rule.get({ plain: true }) : JSON.parse(JSON.stringify(rule));
            if (
                !ruleMap[rulePlain.product_id] ||
                new Date(rulePlain.created_at) > new Date(ruleMap[rulePlain.product_id]?.created_at || 0)
            ) {
                ruleMap[rulePlain.product_id] = rulePlain;
            }
        });

        // 4. Kết hợp danh sách sản phẩm với tồn kho (nếu có), thiếu thì stock = 0
        const data = products.map(prod => {
            const product = prod.get ? prod.get({ plain: true }) : JSON.parse(JSON.stringify(prod));

            const invPlain = inventoryMap[product.product_id] || {
                inventory_id: null,
                store_id: storeId,
                product_id: product.product_id,
                stock: 0,
                min_stock_level: 0,
                reorder_point: 0
            };

            const category = product.category
                ? { category_id: product.category.category_id, name: product.category.name }
                : null;
            const supplier = product.supplier
                ? {
                      supplier_id: product.supplier.supplier_id,
                      name: product.supplier.name,
                      contact: product.supplier.contact
                  }
                : null;

            const latestImportPrice = parseFloat(product.latest_import_price || 0);
            const hqPrice = parseFloat(product.hq_price || 0);

            let currentPrice = hqPrice;
            const activeRule = ruleMap[product.product_id];
            if (activeRule) {
                if (activeRule.type === 'markup') {
                    currentPrice = hqPrice + parseFloat(activeRule.value);
                } else if (activeRule.type === 'markdown') {
                    currentPrice = hqPrice - parseFloat(activeRule.value);
                } else if (activeRule.type === 'fixed_price') {
                    currentPrice = parseFloat(activeRule.value);
                }
            }

            const packageMeta = product.product_id ? packageMetaMap[product.product_id] : null;
            const packageConversion = packageMeta?.conversion_to_base || null;
            const packageUnitLabel = packageMeta?.unit ? (packageMeta.unit.symbol || packageMeta.unit.name) : null;
            const packagePrice =
                latestImportPrice > 0 && packageConversion && packageConversion > 0
                    ? Math.round(latestImportPrice * packageConversion)
                    : latestImportPrice > 0
                    ? Math.round(latestImportPrice)
                    : 0;

            const stock = Number(invPlain.stock || 0);
            const minStock = Number(invPlain.min_stock_level || 0);

            return {
                inventory_id: invPlain.inventory_id,
                store_id: invPlain.store_id,
                product_id: product.product_id,
                stock,
                min_stock_level: invPlain.min_stock_level,
                reorder_point: invPlain.reorder_point,
                sku: product.sku || '',
                name: product.name || '',
                is_perishable: !!product.is_perishable,
                category: category ? category.name : '',
                supplier,
                unit: 'Cái',
                price: latestImportPrice || 0,
                latest_import_price: latestImportPrice || 0,
                package_conversion: packageConversion,
                package_unit: packageUnitLabel,
                package_price: packagePrice || 0,
                status: stock <= minStock ? 'Thiếu hàng' : 'Ổn định',
                current_price: currentPrice
            };
        });

        resolve({
            err: 0,
            msg: 'OK',
            data
        });
    } catch (error) {
        reject(error);
    }
});


export const getAllInventoryService = async ({ page, limit, storeId, categoryId, status, search }) => {
    try {
        const offset = (page - 1) * limit;

        const productWhere = {};
        if (search) {
            productWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } }
            ];
        }

        // 1. Lấy toàn bộ sản phẩm (catalog) thỏa điều kiện tìm kiếm / danh mục
        const products = await db.Product.findAll({
            where: { is_active: true, ...productWhere },
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
        });

        if (!products.length) {
            return {
                err: 0,
                msg: 'Get inventory successfully',
                data: {
                    inventory: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        limit
                    }
                }
            };
        }

        const productIds = products.map(p => p.product_id);

        // 2. Lấy các bản ghi tồn kho hiện có (theo store nếu có)
        const whereConditions = {};
        if (storeId) whereConditions.store_id = storeId;
        whereConditions.product_id = { [Op.in]: productIds };

        const inventories = await db.Inventory.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address', 'phone']
                }
            ]
        });

        const inventoryMap = {};
        inventories.forEach(item => {
            const plain = item.toJSON();
            inventoryMap[plain.product_id] = plain;
        });

        // 3. Kết hợp sản phẩm + tồn kho, sản phẩm chưa có tồn kho => stock = 0
        const combined = products.map(prod => {
            const product = prod.toJSON();
            const inv = inventoryMap[product.product_id] || {
                inventory_id: null,
                store_id: storeId || null,
                stock: 0,
                min_stock_level: 0,
                reorder_point: 0,
                store: storeId
                    ? inventories[0]?.store || null
                    : null
            };

            const stock = Number(inv.stock || 0);
            let stockStatus = 'normal';
            if (stock === 0) stockStatus = 'out_of_stock';
            else if (stock <= Number(inv.min_stock_level || 0)) stockStatus = 'critical';
            else if (stock <= Number(inv.reorder_point || 0)) stockStatus = 'low';

            return {
                ...inv,
                product,
                stock,
                stockStatus,
                stockValue: stock * (product.hq_price || 0)
            };
        });

        // 4. Lọc theo trạng thái nếu có
        let filteredInventory = combined;
        if (status) {
            filteredInventory = combined.filter(item => item.stockStatus === status);
        }

        const totalItems = filteredInventory.length;
        const paginatedInventory = filteredInventory.slice(offset, offset + limit);

        return {
            err: 0,
            msg: 'Get inventory successfully',
            data: {
                inventory: paginatedInventory,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
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


// Get inventory by product_id
export const getInventoryByProduct = (productId) => new Promise(async (resolve, reject) => {
    try {
        // 1. Get inventory from all stores
        const storeInventories = await db.Inventory.findAll({
            where: { product_id: productId },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['name']
                }
            ],
            raw: true,
            nest: true
        });

        // 2. Get inventory from the main warehouse
        const warehouseInventory = await db.WarehouseInventory.findOne({
            where: { product_id: productId },
            raw: true
        });

        const formattedResponse = [];

        // Format store inventories
        storeInventories.forEach(item => {
            formattedResponse.push({
                location_type: 'Store',
                location_name: item.store.name,
                stock: item.stock,
                min_stock_level: item.min_stock_level,
                reorder_point: item.reorder_point
            });
        });

        // Format warehouse inventory
        if (warehouseInventory) {
            formattedResponse.push({
                location_type: 'Warehouse',
                location_name: 'Kho tổng',
                stock: warehouseInventory.stock,
                min_stock_level: warehouseInventory.min_stock_level,
                reorder_point: warehouseInventory.reorder_point
            });
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: formattedResponse
        });

    } catch (error) {
        reject(error);
    }
});