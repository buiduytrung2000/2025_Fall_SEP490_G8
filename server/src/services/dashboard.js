import db from '../models';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';

// =====================================================
// DASHBOARD SERVICES FOR STORE MANAGER
// =====================================================

// Get today's KPIs (revenue, orders, new customers)
export const getTodayKPIs = (storeId) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's revenue and orders - use findOne for aggregation
        const todayStats = await db.Transaction.findOne({
            where: {
                store_id: storeId,
                status: 'completed',
                created_at: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('transaction_id')), 'orderCount'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalRevenue']
            ],
            raw: true
        });

        const todayRevenue = parseFloat(todayStats?.totalRevenue || 0);
        const todayOrders = parseInt(todayStats?.orderCount || 0);

        // New customers today
        const newCustomers = await db.Customer.count({
            where: {
                created_at: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        const result = {
            todayRevenue: todayRevenue || 0,
            todayOrders: todayOrders || 0,
            newCustomers: newCustomers || 0
        };

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get revenue for last 7 days
export const getRevenueLast7Days = (storeId) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const transactions = await db.Transaction.findAll({
            where: {
                store_id: storeId,
                status: 'completed',
                created_at: {
                    [Op.gte]: sevenDaysAgo,
                    [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'revenue']
            ],
            group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
            raw: true
        });

        // Create a map for all 7 days
        const daysMap = {};
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(sevenDaysAgo);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            daysMap[dateStr] = {
                name: dayName,
                DoanhThu: 0
            };
        }

        // Fill in actual revenue
        transactions.forEach(t => {
            // DATE() function returns a string in format 'YYYY-MM-DD', not a Date object
            const dateStr = typeof t.date === 'string' ? t.date : (t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date));
            if (daysMap[dateStr]) {
                daysMap[dateStr].DoanhThu = parseFloat(t.revenue || 0);
            }
        });

        const result = Object.values(daysMap);

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get top selling products
export const getTopSellingProducts = (storeId, limit = 5) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Use raw query for better aggregation support
        const query = `
            SELECT 
                ti.product_id,
                p.name,
                SUM(ti.quantity) as totalSold,
                SUM(ti.subtotal) as totalRevenue
            FROM TransactionItem ti
            INNER JOIN Transaction t ON ti.transaction_id = t.transaction_id
            INNER JOIN Product p ON ti.product_id = p.product_id
            WHERE t.store_id = :storeId
                AND t.status = 'completed'
                AND t.created_at >= :startDate
            GROUP BY ti.product_id, p.name
            ORDER BY totalRevenue DESC
            LIMIT :limit
        `;

        const results = await db.sequelize.query(query, {
            replacements: {
                storeId: storeId,
                startDate: thirtyDaysAgo,
                limit: parseInt(limit)
            },
            type: Sequelize.QueryTypes.SELECT
        });

        const result = results.map((item) => ({
            id: item.product_id,
            name: item.name || 'Unknown Product',
            sold: parseInt(item.totalSold || 0),
            revenue: parseFloat(item.totalRevenue || 0)
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get today's schedules
export const getTodaySchedules = (storeId) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const schedules = await db.Schedule.findAll({
            where: {
                store_id: storeId,
                work_date: todayStr,
                status: 'confirmed'
            },
            include: [
                {
                    model: db.User,
                    as: 'employee',
                    attributes: ['user_id', 'username', 'email']
                },
                {
                    model: db.ShiftTemplate,
                    as: 'shiftTemplate',
                    attributes: ['shift_template_id', 'name', 'start_time', 'end_time']
                }
            ],
            order: [[{ model: db.ShiftTemplate, as: 'shiftTemplate' }, 'start_time', 'ASC']],
            raw: false
        });

        const result = schedules.map(s => ({
            schedule_id: s.schedule_id,
            shift_name: s.shiftTemplate?.name || '',
            start_time: s.shiftTemplate?.start_time || '',
            end_time: s.shiftTemplate?.end_time || '',
            employee_name: s.employee?.username || 'Chưa phân công'
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get employee statistics
export const getEmployeeStats = (storeId) => new Promise(async (resolve, reject) => {
    try {
        const totalEmployees = await db.User.count({
            where: {
                store_id: storeId,
                role: { [Op.in]: ['Cashier', 'Store_Manager'] }
            }
        });

        const activeEmployees = await db.User.count({
            where: {
                store_id: storeId,
                role: { [Op.in]: ['Cashier', 'Store_Manager'] },
                status: 'active'
            }
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: {
                total: totalEmployees,
                active: activeEmployees
            }
        });
    } catch (error) {
        reject(error);
    }
});

// Get low stock products
export const getLowStockProducts = (storeId, limit = 5) => new Promise(async (resolve, reject) => {
    try {
        const lowStockItems = await db.Inventory.findAll({
            where: {
                store_id: storeId,
                stock: {
                    [Op.lte]: Sequelize.col('min_stock_level')
                }
            },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku']
                }
            ],
            order: [['stock', 'ASC']],
            limit: parseInt(limit),
            raw: false
        });

        const result = lowStockItems.map(item => ({
            product_id: item.product_id,
            name: item.product?.name || 'Unknown',
            sku: item.product?.sku || '',
            stock: item.stock,
            min_stock_level: item.min_stock_level
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// =====================================================
// DASHBOARD SERVICES FOR CEO (COMPANY-WIDE)
// =====================================================

// Get company-wide KPIs (all stores)
export const getCompanyKPIs = () => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Today's stats
        const todayStats = await db.Transaction.findOne({
            where: {
                status: 'completed',
                created_at: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('transaction_id')), 'orderCount'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalRevenue']
            ],
            raw: true
        });

        // This month's stats
        const monthStats = await db.Transaction.findOne({
            where: {
                status: 'completed',
                created_at: {
                    [Op.gte]: thisMonth,
                    [Op.lt]: nextMonth
                }
            },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('transaction_id')), 'orderCount'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalRevenue']
            ],
            raw: true
        });

        // All time stats
        const allTimeStats = await db.Transaction.findOne({
            where: {
                status: 'completed'
            },
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('transaction_id')), 'orderCount'],
                [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalRevenue']
            ],
            raw: true
        });

        // New customers today
        const newCustomersToday = await db.Customer.count({
            where: {
                created_at: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        // Total stores
        const totalStores = await db.Store.count({
            where: { status: 'active' }
        });

        // Warehouse orders stats
        const totalWarehouseOrders = await db.Order.count();
        const pendingWarehouseOrders = await db.Order.count({
            where: { status: 'pending' }
        });

        // Calculate total amount from OrderItems
        const warehouseTotalQuery = `
            SELECT COALESCE(SUM(oi.subtotal), 0) as totalAmount
            FROM \`Order\` o
            INNER JOIN OrderItem oi ON o.order_id = oi.order_id
        `;
        const warehouseTotalResult = await db.sequelize.query(warehouseTotalQuery, {
            type: Sequelize.QueryTypes.SELECT
        });
        const warehouseTotalAmount = parseFloat(warehouseTotalResult[0]?.totalAmount || 0);

        const result = {
            today: {
                revenue: parseFloat(todayStats?.totalRevenue || 0),
                orders: parseInt(todayStats?.orderCount || 0),
                newCustomers: newCustomersToday
            },
            thisMonth: {
                revenue: parseFloat(monthStats?.totalRevenue || 0),
                orders: parseInt(monthStats?.orderCount || 0)
            },
            allTime: {
                revenue: parseFloat(allTimeStats?.totalRevenue || 0),
                orders: parseInt(allTimeStats?.orderCount || 0)
            },
            stores: {
                total: totalStores
            },
            warehouseOrders: {
                total: totalWarehouseOrders,
                pending: pendingWarehouseOrders,
                totalAmount: warehouseTotalAmount
            }
        };

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get company-wide revenue for last 30 days
export const getCompanyRevenueLast30Days = (year = null) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetYear = Number(year) || today.getFullYear();
        const startMonth = new Date(targetYear, 0, 1);
        const endMonth = new Date(targetYear + 1, 0, 1);

        const query = `
            SELECT 
                YEAR(created_at) as year,
                MONTH(created_at) as month,
                SUM(total_amount) as revenue
            FROM Transaction
            WHERE status = 'completed'
                AND created_at >= :startDate
                AND created_at < :endDate
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY YEAR(created_at), MONTH(created_at)
        `;

        const rows = await db.sequelize.query(query, {
            replacements: {
                startDate: startMonth,
                endDate: endMonth
            },
            type: Sequelize.QueryTypes.SELECT
        });

        const revenueMap = rows.reduce((acc, row) => {
            const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
            acc[key] = parseFloat(row.revenue || 0);
            return acc;
        }, {});

        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date(targetYear, i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push({
                year: date.getFullYear(),
                label: `T${date.getMonth() + 1}`,
                name: `Tháng ${date.getMonth() + 1}`,
                DoanhThu: revenueMap[key] || 0
            });
        }

        const result = months;

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get top selling products company-wide
export const getCompanyTopProducts = (limit = 10) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const query = `
            SELECT 
                ti.product_id,
                p.name,
                p.sku,
                SUM(ti.quantity) as totalSold,
                SUM(ti.subtotal) as totalRevenue
            FROM TransactionItem ti
            INNER JOIN Transaction t ON ti.transaction_id = t.transaction_id
            INNER JOIN Product p ON ti.product_id = p.product_id
            WHERE t.status = 'completed'
                AND t.created_at >= :startDate
            GROUP BY ti.product_id, p.name, p.sku
            ORDER BY totalRevenue DESC
            LIMIT :limit
        `;

        const results = await db.sequelize.query(query, {
            replacements: {
                startDate: thirtyDaysAgo,
                limit: parseInt(limit)
            },
            type: Sequelize.QueryTypes.SELECT
        });

        const result = results.map((item) => ({
            id: item.product_id,
            name: item.name || 'Unknown Product',
            sku: item.sku || '',
            sold: parseInt(item.totalSold || 0),
            revenue: parseFloat(item.totalRevenue || 0)
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get revenue mix by product category
export const getCompanyRevenueMix = (days = 30) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lookbackDays = Number(days) > 0 ? Number(days) : 30;
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (lookbackDays - 1));

        const query = `
            SELECT 
                COALESCE(c.category_id, 0) as category_id,
                COALESCE(c.name, 'Khác') as category_name,
                COALESCE(SUM(ti.subtotal), 0) as totalRevenue
            FROM TransactionItem ti
            INNER JOIN Transaction t ON ti.transaction_id = t.transaction_id
            LEFT JOIN Product p ON ti.product_id = p.product_id
            LEFT JOIN Category c ON p.category_id = c.category_id
            WHERE t.status = 'completed'
                AND t.created_at >= :startDate
            GROUP BY category_id, category_name
            ORDER BY totalRevenue DESC
        `;

        const rows = await db.sequelize.query(query, {
            replacements: { startDate },
            type: Sequelize.QueryTypes.SELECT
        });

        const totalRevenue = rows.reduce((sum, row) => sum + parseFloat(row.totalRevenue || 0), 0);

        const result = rows.map(row => {
            const revenue = parseFloat(row.totalRevenue || 0);
            return {
                category_id: row.category_id,
                name: row.category_name,
                revenue,
                percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
            };
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get store performance
export const getStorePerformance = () => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const query = `
            SELECT 
                s.store_id,
                s.name as store_name,
                COUNT(DISTINCT t.transaction_id) as total_orders,
                SUM(t.total_amount) as total_revenue,
                AVG(t.total_amount) as avg_order_value
            FROM Store s
            LEFT JOIN Transaction t ON s.store_id = t.store_id 
                AND t.status = 'completed'
                AND t.created_at >= :startDate
            WHERE s.status = 'active'
            GROUP BY s.store_id, s.name
            ORDER BY total_revenue DESC
        `;

        const results = await db.sequelize.query(query, {
            replacements: {
                startDate: thirtyDaysAgo
            },
            type: Sequelize.QueryTypes.SELECT
        });

        const result = results.map((item) => ({
            store_id: item.store_id,
            name: item.store_name,
            orders: parseInt(item.total_orders || 0),
            revenue: parseFloat(item.total_revenue || 0),
            avgOrderValue: parseFloat(item.avg_order_value || 0)
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

// Get warehouse orders summary
export const getWarehouseOrdersSummary = () => new Promise(async (resolve, reject) => {
    try {
        const query = `
            SELECT 
                o.status,
                COUNT(DISTINCT o.order_id) as count,
                COALESCE(SUM(oi.subtotal), 0) as totalAmount
            FROM \`Order\` o
            LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
            GROUP BY o.status
        `;

        const results = await db.sequelize.query(query, {
            type: Sequelize.QueryTypes.SELECT
        });

        const summary = {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            total: 0,
            totalAmount: 0
        };

        results.forEach(row => {
            const count = parseInt(row.count || 0);
            const amount = parseFloat(row.totalAmount || 0);
            summary[row.status] = count;
            summary.total += count;
            summary.totalAmount += amount;
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: summary
        });
    } catch (error) {
        reject(error);
    }
});

// Get low stock alerts (warehouse + stores)
export const getCompanyLowStock = (limit = 10) => new Promise(async (resolve, reject) => {
    try {
        // Warehouse inventory
        const warehouseLowStock = await db.WarehouseInventory.findAll({
            where: {
                base_quantity: {
                    [Op.lte]: Sequelize.col('min_stock_level')
                }
            },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku']
                }
            ],
            order: [['base_quantity', 'ASC']],
            limit: parseInt(limit),
            raw: false
        });

        const result = warehouseLowStock.map(item => ({
            product_id: item.product_id,
            name: item.product?.name || 'Unknown',
            sku: item.product?.sku || '',
            stock: item.base_quantity,
            min_stock_level: item.min_stock_level,
            location: 'Warehouse',
            location_detail: item.location || 'N/A'
        }));

        resolve({
            err: 0,
            msg: 'OK',
            data: result
        });
    } catch (error) {
        reject(error);
    }
});

