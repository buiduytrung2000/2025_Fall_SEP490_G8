import db from '../models';
import { Op } from 'sequelize';

/**
 * Create stock count report
 */
export const createStockCountReportService = async ({
    warehouse_inventory_id,
    product_id,
    system_stock,
    actual_stock,
    reason,
    notes,
    reported_by
}) => {
    try {
        const difference = actual_stock - system_stock;
        
        let report_type = 'normal';
        if (difference < 0) {
            report_type = 'shortage';
        } else if (difference > 0) {
            report_type = 'excess';
        }

        const report = await db.StockCountReport.create({
            warehouse_inventory_id,
            product_id,
            system_stock,
            actual_stock,
            difference,
            report_type,
            reason: reason || 'Kiểm kê tồn kho',
            notes,
            reported_by
        });

        return {
            err: 0,
            msg: 'Create stock count report successfully',
            data: report
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Create multiple stock count reports (batch)
 */
export const createBatchStockCountReportsService = async (reports) => {
    try {
        const reportsData = reports.map(report => {
            const difference = report.actual_stock - report.system_stock;
            let report_type = 'normal';
            if (difference < 0) {
                report_type = 'shortage';
            } else if (difference > 0) {
                report_type = 'excess';
            }

            return {
                warehouse_inventory_id: report.warehouse_inventory_id,
                product_id: report.product_id,
                system_stock: report.system_stock,
                actual_stock: report.actual_stock,
                difference,
                report_type,
                reason: report.reason || 'Kiểm kê tồn kho',
                notes: report.notes || null,
                reported_by: report.reported_by
            };
        });

        const createdReports = await db.StockCountReport.bulkCreate(reportsData);

        return {
            err: 0,
            msg: 'Create batch stock count reports successfully',
            data: createdReports
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all stock count reports with filters
 */
export const getAllStockCountReportsService = async ({
    page = 1,
    limit = 10,
    reportType,
    productId,
    startDate,
    endDate,
    search
}) => {
    try {
        const offset = (page - 1) * limit;

        const where = {};
        if (reportType) {
            where.report_type = reportType;
        }
        if (productId) {
            where.product_id = productId;
        }
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.created_at[Op.lte] = new Date(endDate);
            }
        }

        const productWhere = {};
        if (search) {
            productWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await db.StockCountReport.findAndCountAll({
            where,
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'base_unit_id'],
                    where: productWhere,
                    include: [
                        {
                            model: db.Unit,
                            as: 'baseUnit',
                            attributes: ['unit_id', 'name', 'symbol']
                        },
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['category_id', 'name']
                        }
                    ]
                },
                {
                    model: db.WarehouseInventory,
                    as: 'warehouseInventory',
                    attributes: ['warehouse_inventory_id', 'location']
                },
                {
                    model: db.User,
                    as: 'reporter',
                    attributes: ['user_id', 'username', 'full_name']
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true
        });

        // Bổ sung thông tin quy đổi ra đơn vị lớn (thùng) cho từng sản phẩm
        const plainRows = rows.map(r => (r.get ? r.get({ plain: true }) : r));
        const productIds = plainRows.map(r => r.product_id).filter(Boolean);

        let packageMetaMap = {};
        if (productIds.length) {
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

            productUnits.forEach(pu => {
                const plain = pu.get ? pu.get({ plain: true }) : pu;
                const conv = Number(plain.conversion_to_base || 0);
                if (!plain.product_id || conv <= 1) return; // chỉ lấy đơn vị lớn hơn đơn vị cơ sở
                const existing = packageMetaMap[plain.product_id];
                if (!existing || conv > existing.conversion_to_base) {
                    packageMetaMap[plain.product_id] = {
                        conversion_to_base: conv,
                        unit_label: plain.unit
                            ? (plain.unit.symbol || plain.unit.name)
                            : null
                    };
                }
            });
        }

        const enhancedRows = plainRows.map(row => {
            const meta = packageMetaMap[row.product_id];
            if (!meta || !meta.conversion_to_base) {
                return {
                    ...row,
                    package_conversion: null,
                    package_unit_label: null,
                    system_stock_packages: null,
                    actual_stock_packages: null,
                    difference_packages: null
                };
            }

            const conv = meta.conversion_to_base;
            const safeDiv = (value) => Number((Number(value || 0) / conv).toFixed(2));

            return {
                ...row,
                package_conversion: conv,
                package_unit_label: meta.unit_label,
                system_stock_packages: safeDiv(row.system_stock),
                actual_stock_packages: safeDiv(row.actual_stock),
                difference_packages: safeDiv(row.difference)
            };
        });

        return {
            err: 0,
            msg: 'Get stock count reports successfully',
            data: {
                reports: enhancedRows,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages: Math.ceil(count / limit)
                }
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get stock count report by ID
 */
export const getStockCountReportByIdService = async (reportId) => {
    try {
        const report = await db.StockCountReport.findByPk(reportId, {
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku', 'base_unit_id'],
                    include: [
                        {
                            model: db.Unit,
                            as: 'baseUnit',
                            attributes: ['unit_id', 'name', 'symbol']
                        },
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['category_id', 'name']
                        }
                    ]
                },
                {
                    model: db.WarehouseInventory,
                    as: 'warehouseInventory',
                    attributes: ['warehouse_inventory_id', 'location', 'stock']
                },
                {
                    model: db.User,
                    as: 'reporter',
                    attributes: ['user_id', 'username', 'full_name', 'email']
                }
            ]
        });

        if (!report) {
            return {
                err: 1,
                msg: 'Stock count report not found'
            };
        }

        return {
            err: 0,
            msg: 'Get stock count report successfully',
            data: report
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get stock count statistics
 */
export const getStockCountStatisticsService = async ({ startDate, endDate }) => {
    try {
        const where = {};
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.created_at[Op.lte] = new Date(endDate);
            }
        }

        const reports = await db.StockCountReport.findAll({
            where,
            attributes: ['report_type', 'difference']
        });

        let totalReports = 0;
        let shortageCount = 0;
        let excessCount = 0;
        let normalCount = 0;
        let totalShortage = 0;
        let totalExcess = 0;

        reports.forEach(report => {
            totalReports++;
            if (report.report_type === 'shortage') {
                shortageCount++;
                totalShortage += Math.abs(report.difference);
            } else if (report.report_type === 'excess') {
                excessCount++;
                totalExcess += report.difference;
            } else {
                normalCount++;
            }
        });

        return {
            err: 0,
            msg: 'Get stock count statistics successfully',
            data: {
                totalReports,
                shortageCount,
                excessCount,
                normalCount,
                totalShortage,
                totalExcess
            }
        };
    } catch (error) {
        throw error;
    }
};

