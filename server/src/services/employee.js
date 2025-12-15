import db from '../models';
import { Op } from 'sequelize';

// =====================================================
// EMPLOYEE SERVICES
// =====================================================

// Get all employees with filters and pagination
export const getEmployees = (filters = {}, pagination = { page: 1, limit: 10 }) => new Promise(async (resolve, reject) => {
    try {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        const whereClause = {};

        // Apply filters
        if (filters.store_id) whereClause.store_id = filters.store_id;
        if (filters.role) whereClause.role = filters.role;
        if (filters.status) whereClause.status = filters.status;

        // Search functionality (search in username, name, email)
        if (filters.search) {
            whereClause[Op.or] = [
                { username: { [Op.like]: `%${filters.search}%` } },
                { name: { [Op.like]: `%${filters.search}%` } },
                { email: { [Op.like]: `%${filters.search}%` } }
            ];
        }

        const { count, rows } = await db.User.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address'],
                    required: false
                }
            ],
            // Select only existing columns (now includes phone & address)
            attributes: ['user_id', 'username', 'email', 'phone', 'address', 'full_name', 'role', 'store_id', 'status', 'created_at', 'updated_at'],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            raw: false
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        reject(error);
    }
});

// Get store_id and role by user id
export const getStoreInfoByUserId = (userId) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({
            where: { user_id: userId },
            attributes: ['user_id', 'role', 'store_id'],
            raw: true
        });
        resolve(user);
    } catch (error) {
        reject(error);
    }
});

// Get employee by ID
export const getEmployeeById = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.User.findOne({
            where: { user_id: id },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address'],
                    required: false
                },
                {
                    model: db.Schedule,
                    as: 'schedules',
                    required: false,
                    limit: 10,
                    order: [['work_date', 'DESC']],
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        }
                    ]
                }
            ],
            attributes: ['user_id', 'username', 'email', 'phone', 'address', 'full_name', 'role', 'store_id', 'status', 'created_at', 'updated_at'],
            raw: false
        });

        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Employee not found',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Create new employee
export const createEmployee = (data) => new Promise(async (resolve, reject) => {
    try {
        // Check if username already exists
        const existingUser = await db.User.findOne({
            where: { username: data.username }
        });

        if (existingUser) {
            resolve({
                err: 1,
                msg: 'Username already exists',
                data: null
            });
            return;
        }

        // Check if email already exists (if provided)
        if (data.email) {
            const existingEmail = await db.User.findOne({
                where: { email: data.email }
            });

            if (existingEmail) {
                resolve({
                    err: 1,
                    msg: 'Email already exists',
                    data: null
                });
                return;
            }
        }

        const response = await db.User.create(data);
        
        // Get created user without password
        const createdUser = await db.User.findOne({
            where: { user_id: response.user_id },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address'],
                    required: false
                }
            ],
            attributes: ['user_id', 'username', 'email', 'phone', 'address', 'full_name', 'role', 'store_id', 'status', 'created_at', 'updated_at'],
            raw: false
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: createdUser
        });
    } catch (error) {
        reject(error);
    }
});

// Update employee
export const updateEmployee = (id, data) => new Promise(async (resolve, reject) => {
    try {
        // Check if employee exists
        const existingEmployee = await db.User.findOne({
            where: { user_id: id }
        });

        if (!existingEmployee) {
            resolve({
                err: 1,
                msg: 'Employee not found',
                data: null
            });
            return;
        }

        // Check if email is being updated and already exists (if provided)
        if (data.email && data.email !== existingEmployee.email) {
            const existingEmail = await db.User.findOne({
                where: { 
                    email: data.email,
                    user_id: { [Op.ne]: id }
                }
            });

            if (existingEmail) {
                resolve({
                    err: 1,
                    msg: 'Email already exists',
                    data: null
                });
                return;
            }
        }

        const [updated] = await db.User.update(data, {
            where: { user_id: id }
        });

        if (updated > 0) {
            const updatedEmployee = await db.User.findOne({
                where: { user_id: id },
                include: [
                    {
                        model: db.Store,
                        as: 'store',
                        attributes: ['store_id', 'name', 'address'],
                        required: false
                    }
                ],
                attributes: ['user_id', 'username', 'email', 'phone', 'address', 'full_name', 'role', 'store_id', 'status', 'created_at', 'updated_at'],
                raw: false
            });

            resolve({
                err: 0,
                msg: 'OK',
                data: updatedEmployee
            });
        } else {
            resolve({
                err: 1,
                msg: 'Employee not found',
                data: null
            });
        }
    } catch (error) {
        reject(error);
    }
});

// Hard delete employee (permanent delete)
export const hardDeleteEmployee = (id) => new Promise(async (resolve, reject) => {
    try {
        // Check if employee has associated schedules
        const schedulesCount = await db.Schedule.count({
            where: { user_id: id }
        });

        if (schedulesCount > 0) {
            resolve({
                err: 1,
                msg: 'Cannot delete employee with existing schedules. Please deactivate instead.',
                data: null
            });
            return;
        }

        const deleted = await db.User.destroy({
            where: { user_id: id }
        });

        resolve({
            err: deleted > 0 ? 0 : 1,
            msg: deleted > 0 ? 'OK' : 'Employee not found',
            data: deleted
        });
    } catch (error) {
        reject(error);
    }
});

// Get employee statistics
export const getEmployeeStatistics = (filters = {}) => new Promise(async (resolve, reject) => {
    try {
        const whereClause = {};

        if (filters.store_id) whereClause.store_id = filters.store_id;
        if (filters.role) whereClause.role = filters.role;

        // Get total employees
        const totalEmployees = await db.User.count({ where: whereClause });

        // Get employees by status
        const activeEmployees = await db.User.count({
            where: { ...whereClause, status: 'active' }
        });

        const inactiveEmployees = await db.User.count({
            where: { ...whereClause, status: 'inactive' }
        });

        const suspendedEmployees = await db.User.count({
            where: { ...whereClause, status: 'suspended' }
        });

        // Get employees by role
        const employeesByRole = await db.User.findAll({
            where: whereClause,
            attributes: [
                'role',
                [db.sequelize.fn('COUNT', db.sequelize.col('user_id')), 'count']
            ],
            group: ['role'],
            raw: true
        });

        // Get employees by store (if store_id not specified)
        let employeesByStore = [];
        if (!filters.store_id) {
            const storeStats = await db.User.findAll({
                attributes: [
                    'store_id',
                    [db.sequelize.fn('COUNT', db.sequelize.col('User.user_id')), 'count']
                ],
                group: ['store_id'],
                raw: true
            });

            // Get store names
            const storeIds = storeStats.map(stat => stat.store_id).filter(id => id !== null);
            const stores = await db.Store.findAll({
                where: { store_id: { [Op.in]: storeIds } },
                attributes: ['store_id', 'name'],
                raw: true
            });

            employeesByStore = storeStats.map(stat => {
                const store = stores.find(s => s.store_id === stat.store_id);
                return {
                    store_id: stat.store_id,
                    store_name: store ? store.name : 'No Store',
                    count: parseInt(stat.count)
                };
            });
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: {
                total: totalEmployees,
                by_status: {
                    active: activeEmployees,
                    inactive: inactiveEmployees,
                    suspended: suspendedEmployees
                },
                by_role: employeesByRole.map(item => ({
                    role: item.role,
                    count: parseInt(item.count)
                })),
                by_store: employeesByStore
            }
        });
    } catch (error) {
        reject(error);
    }
});

// Get all stores
export const getAllStores = () => new Promise(async (resolve, reject) => {
    try {
        const stores = await db.Store.findAll({
            where: { status: 'active' },
            attributes: ['store_id', 'name', 'address', 'phone'],
            order: [['name', 'ASC']],
            raw: true
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: stores
        });
    } catch (error) {
        reject(error);
    }
});

