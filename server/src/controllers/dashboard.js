import * as dashboardService from '../services/dashboard';
import * as employeeService from '../services/employee';

// =====================================================
// DASHBOARD CONTROLLERS FOR STORE MANAGER
// =====================================================

// Get today's KPIs
export const getTodayKPIs = async (req, res) => {
    try {
        let storeId = req.query.store_id;

        // If Store Manager, get their store_id
        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getTodayKPIs(storeId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get revenue for last 7 days
export const getRevenueLast7Days = async (req, res) => {
    try {
        let storeId = req.query.store_id;

        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getRevenueLast7Days(storeId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get top selling products
export const getTopSellingProducts = async (req, res) => {
    try {
        let storeId = req.query.store_id;
        const limit = req.query.limit || 5;

        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getTopSellingProducts(storeId, limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get today's schedules
export const getTodaySchedules = async (req, res) => {
    try {
        let storeId = req.query.store_id;

        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getTodaySchedules(storeId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get employee statistics
export const getEmployeeStats = async (req, res) => {
    try {
        let storeId = req.query.store_id;

        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getEmployeeStats(storeId);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
    try {
        let storeId = req.query.store_id;
        const limit = req.query.limit || 5;

        if (req.user?.role === 'Store_Manager' && !storeId) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) {
                return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            }
            storeId = info.store_id;
        }

        if (!storeId) {
            return res.status(400).json({ err: 1, msg: 'store_id is required' });
        }

        const response = await dashboardService.getLowStockProducts(storeId, limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// =====================================================
// DASHBOARD CONTROLLERS FOR CEO
// =====================================================

// Get company-wide KPIs
export const getCompanyKPIs = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const response = await dashboardService.getCompanyKPIs();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get company revenue for last 30 days
export const getCompanyRevenueLast30Days = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const { year } = req.query;
        const response = await dashboardService.getCompanyRevenueLast30Days(year);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get company top products
export const getCompanyTopProducts = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const limit = req.query.limit || 10;
        const response = await dashboardService.getCompanyTopProducts(limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get revenue mix by category
export const getCompanyRevenueMix = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const { days } = req.query;
        const response = await dashboardService.getCompanyRevenueMix(days);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get store performance
export const getStorePerformance = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const response = await dashboardService.getStorePerformance();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get warehouse orders summary
export const getWarehouseOrdersSummary = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const response = await dashboardService.getWarehouseOrdersSummary();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get company low stock alerts
export const getCompanyLowStock = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const limit = req.query.limit || 10;
        const response = await dashboardService.getCompanyLowStock(limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get product sales per branch
export const getBranchProductSales = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const {
            store_id: storeId,
            period,
            year,
            month,
            limit
        } = req.query;

        const response = await dashboardService.getBranchProductSales({
            storeId: storeId ? Number(storeId) : null,
            period,
            year,
            month,
            limit
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get latest purchase orders
export const getRecentPurchaseOrders = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const { limit } = req.query;
        const response = await dashboardService.getRecentPurchaseOrders(limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get inventory overview
export const getInventoryOverview = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const response = await dashboardService.getInventoryOverview();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get recent branch orders
export const getRecentBranchOrders = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const { limit } = req.query;
        const response = await dashboardService.getRecentBranchOrders(limit);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

// Get branch orders summary
export const getBranchOrdersSummary = async (req, res) => {
    try {
        if (req.user?.role !== 'CEO') {
            return res.status(403).json({ err: 1, msg: 'Access denied. CEO role required.' });
        }

        const response = await dashboardService.getBranchOrdersSummary();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at dashboard controller: ' + error.message
        });
    }
};

