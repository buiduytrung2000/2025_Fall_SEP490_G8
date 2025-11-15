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

