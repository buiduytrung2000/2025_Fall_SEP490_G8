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

