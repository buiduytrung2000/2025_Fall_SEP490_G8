import * as stockCountReportService from '../services/stockCountReport';

/**
 * Create stock count report
 * POST /api/v1/stock-count-reports
 */
export const createStockCountReport = async (req, res) => {
    try {
        const {
            warehouse_inventory_id,
            product_id,
            system_stock,
            actual_stock,
            reason,
            notes
        } = req.body;

        if (!warehouse_inventory_id || !product_id || system_stock === undefined || actual_stock === undefined) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields: warehouse_inventory_id, product_id, system_stock, actual_stock'
            });
        }

        const response = await stockCountReportService.createStockCountReportService({
            warehouse_inventory_id,
            product_id,
            system_stock: parseInt(system_stock),
            actual_stock: parseInt(actual_stock),
            reason,
            notes,
            reported_by: req.user.user_id
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at stock count report controller: ' + error.message
        });
    }
};

/**
 * Create multiple stock count reports (batch)
 * POST /api/v1/stock-count-reports/batch
 */
export const createBatchStockCountReports = async (req, res) => {
    try {
        const { reports } = req.body;

        if (!reports || !Array.isArray(reports) || reports.length === 0) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing or invalid reports array'
            });
        }

        // Validate each report
        for (const report of reports) {
            if (!report.warehouse_inventory_id || !report.product_id || 
                report.system_stock === undefined || report.actual_stock === undefined) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Each report must have: warehouse_inventory_id, product_id, system_stock, actual_stock'
                });
            }
        }

        const reportsWithUser = reports.map(report => ({
            ...report,
            system_stock: parseInt(report.system_stock),
            actual_stock: parseInt(report.actual_stock),
            reported_by: req.user.user_id
        }));

        const response = await stockCountReportService.createBatchStockCountReportsService(reportsWithUser);

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at stock count report controller: ' + error.message
        });
    }
};

/**
 * Get all stock count reports with filters
 * GET /api/v1/stock-count-reports
 */
export const getAllStockCountReports = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            reportType,
            productId,
            startDate,
            endDate,
            search
        } = req.query;

        const response = await stockCountReportService.getAllStockCountReportsService({
            page: parseInt(page),
            limit: parseInt(limit),
            reportType,
            productId,
            startDate,
            endDate,
            search
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at stock count report controller: ' + error.message
        });
    }
};

/**
 * Get stock count report by ID
 * GET /api/v1/stock-count-reports/:reportId
 */
export const getStockCountReportById = async (req, res) => {
    try {
        const { reportId } = req.params;

        if (!reportId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing report ID'
            });
        }

        const response = await stockCountReportService.getStockCountReportByIdService(reportId);

        if (response.err === 1) {
            return res.status(404).json(response);
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at stock count report controller: ' + error.message
        });
    }
};

/**
 * Get stock count statistics
 * GET /api/v1/stock-count-reports/statistics
 */
export const getStockCountStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const response = await stockCountReportService.getStockCountStatisticsService({
            startDate,
            endDate
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at stock count report controller: ' + error.message
        });
    }
};

