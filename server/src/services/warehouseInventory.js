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

/**
 * Get all warehouse inventory with filters
 */
export const getAllWarehouseInventoryService = async ({ page, limit, categoryId, status, search, supplierId }) => {
    try {
        const offset = (page - 1) * limit;

        const productWhere = {};
        if (search) {
            productWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } }
            ];
        }

        const includeConditions = [
            {
                model: db.Product,
                as: 'product',
                attributes: ['product_id', 'name', 'sku', 'description', 'hq_price', 'base_unit_id'],
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
                        attributes: ['supplier_id', 'name', 'contact'],
                        ...(supplierId && {
                            where: { supplier_id: supplierId }
                        })
                    },
                    {
                        model: db.Unit,
                        as: 'baseUnit',
                        attributes: ['unit_id', 'name', 'symbol']
                    }
                ]
            }
        ];

        const { count, rows } = await db.WarehouseInventory.findAndCountAll({
            include: includeConditions,
            limit,
            offset,
            order: [['updated_at', 'DESC']],
            distinct: true
        });

        const productIds = rows.map(item => item.product_id).filter(Boolean);
        const packageMetaMap = await buildPackageMetaMap(productIds);

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

            const packageMeta = itemData.product?.product_id
                ? packageMetaMap[itemData.product.product_id]
                : null;
            const packageConversion = packageMeta?.conversion_to_base || null;
            const packageUnitLabel = packageMeta?.unit ? (packageMeta.unit.name || packageMeta.unit.symbol) : null;
            const packageUnitId = packageMeta?.unit ? packageMeta.unit.unit_id : null;
            const stockInPackages = packageConversion
                ? Number((itemData.stock / packageConversion).toFixed(2))
                : null;

            // Add base_unit_label to product
            if (itemData.product && itemData.product.baseUnit) {
                itemData.product.base_unit_label = itemData.product.baseUnit.name || itemData.product.baseUnit.symbol;
            }

            return {
                ...itemData,
                stockStatus,
                stockValue: itemData.stock * (itemData.product?.hq_price || 0),
                package_conversion: packageConversion,
                package_unit_label: packageUnitLabel,
                package_unit_id: packageUnitId,
                stock_in_packages: stockInPackages
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
            msg: 'Get warehouse inventory successfully',
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
 * Get warehouse inventory detail by ID
 */
export const getWarehouseInventoryDetailService = async (inventoryId) => {
    try {
        const inventory = await db.WarehouseInventory.findByPk(inventoryId, {
            include: [
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
            return { err: 1, msg: 'Warehouse inventory not found' };
        }

        const itemData = inventory.toJSON();
        const packageMetaMap = await buildPackageMetaMap(
            itemData.product?.product_id ? [itemData.product.product_id] : []
        );
        const packageMeta = itemData.product?.product_id
            ? packageMetaMap[itemData.product.product_id]
            : null;
        const packageConversion = packageMeta?.conversion_to_base || null;
        const packageUnitLabel = packageMeta?.unit ? (packageMeta.unit.name || packageMeta.unit.symbol) : null;
        const packageUnitId = packageMeta?.unit ? packageMeta.unit.unit_id : null;
        const stockInPackages = packageConversion
            ? Number((itemData.stock / packageConversion).toFixed(2))
            : null;

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
            msg: 'Get warehouse inventory detail successfully',
            data: {
                ...itemData,
                stockStatus,
                stockValue: itemData.stock * (itemData.product?.hq_price || 0),
                package_conversion: packageConversion,
                package_unit_label: packageUnitLabel,
                package_unit_id: packageUnitId,
                stock_in_packages: stockInPackages
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get warehouse inventory statistics
 */
export const getWarehouseInventoryStatisticsService = async () => {
    try {
        const allInventory = await db.WarehouseInventory.findAll({
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'hq_price']
                }
            ]
        });

        let totalProducts = 0;
        let totalValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        allInventory.forEach(item => {
            const itemData = item.toJSON();
            totalProducts++;
            totalValue += itemData.stock * (itemData.product?.hq_price || 0);

            if (itemData.stock === 0) {
                outOfStockCount++;
            } else if (itemData.stock <= itemData.min_stock_level) {
                lowStockCount++;
            }
        });

        return {
            err: 0,
            msg: 'Get warehouse inventory statistics successfully',
            data: {
                totalProducts,
                totalValue,
                lowStockCount,
                outOfStockCount
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Update warehouse inventory settings
 */
export const updateWarehouseInventoryService = async ({ inventoryId, min_stock_level, reorder_point, location, notes }) => {
    try {
        const inventory = await db.WarehouseInventory.findByPk(inventoryId);

        if (!inventory) {
            return { err: 1, msg: 'Warehouse inventory not found' };
        }

        const updateData = {};
        if (min_stock_level !== undefined) updateData.min_stock_level = parseInt(min_stock_level);
        if (reorder_point !== undefined) updateData.reorder_point = parseInt(reorder_point);
        if (location !== undefined) updateData.location = location;
        if (notes !== undefined) updateData.notes = notes;

        await inventory.update(updateData);

        return {
            err: 0,
            msg: 'Update warehouse inventory successfully',
            data: inventory
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Adjust warehouse inventory stock
 */
export const adjustWarehouseStockService = async ({ inventoryId, adjustment, reason, adjustedBy }) => {
    try {
        const inventory = await db.WarehouseInventory.findByPk(inventoryId);

        if (!inventory) {
            return { err: 1, msg: 'Warehouse inventory not found' };
        }

        const newStock = inventory.stock + adjustment;

        if (newStock < 0) {
            return { err: 1, msg: 'Không thể giảm tồn kho xuống dưới 0' };
        }

        await inventory.update({
            stock: newStock,
            updated_at: new Date()
        });

        // TODO: Có thể tạo bảng WarehouseInventoryHistory để lưu lịch sử điều chỉnh
        // await db.WarehouseInventoryHistory.create({
        //     warehouse_inventory_id: inventoryId,
        //     adjustment,
        //     reason,
        //     adjusted_by: adjustedBy,
        //     stock_before: inventory.stock,
        //     stock_after: newStock
        // });

        return {
            err: 0,
            msg: 'Adjust warehouse stock successfully',
            data: inventory
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Create warehouse inventory (if product doesn't have inventory record)
 */
export const createWarehouseInventoryService = async ({ productId, stock = 0, min_stock_level = 0, reorder_point = 0, location, notes }) => {
    try {
        // Check if inventory already exists
        const existing = await db.WarehouseInventory.findOne({
            where: { product_id: productId }
        });

        if (existing) {
            return { err: 1, msg: 'Warehouse inventory already exists for this product' };
        }

        const inventory = await db.WarehouseInventory.create({
            product_id: productId,
            stock: parseInt(stock) || 0,
            min_stock_level: parseInt(min_stock_level) || 0,
            reorder_point: parseInt(reorder_point) || 0,
            location: location || null,
            notes: notes || null
        });

        return {
            err: 0,
            msg: 'Create warehouse inventory successfully',
            data: inventory
        };
    } catch (error) {
        throw error;
    }
};

