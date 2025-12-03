import * as employeeService from '../services/employee';
import bcrypt from 'bcryptjs';

// =====================================================
// EMPLOYEE CONTROLLERS
// =====================================================

// Get all employees with filters
export const getEmployees = async (req, res) => {
    try {
        const { store_id, role, status, search, page, limit } = req.query;
        
        const filters = {};
        if (store_id) filters.store_id = store_id;
        if (role) filters.role = role;
        if (status) filters.status = status;
        if (search) filters.search = search;

        // Scope by manager's store
        if (req.user?.role === 'Store_Manager') {
            const currentUserId = req.user?.user_id || req.user?.id;
            const info = await employeeService.getStoreInfoByUserId(currentUserId);
            if (!info?.store_id) return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            filters.store_id = info.store_id;
        }

        const pagination = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10
        };

        const response = await employeeService.getEmployees(filters, pagination);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await employeeService.getEmployeeById(id);
        if (req.user?.role === 'Store_Manager' && response?.data) {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (response.data.store_id !== info.store_id) {
                return res.status(403).json({ err: 1, msg: 'Forbidden: cross-store access' });
            }
        }
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Create new employee
export const createEmployee = async (req, res) => {
    try {
        const { username, password, name, email, phone, address, role, store_id, status } = req.body;

        // Validation
        if (!username || !password || !name || !role) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields: username, password, name, role'
            });
        }

        // Validate role
        const validRoles = ['CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                err: 1,
                msg: 'Invalid role. Must be one of: CEO, Store_Manager, Cashier, Warehouse, Supplier'
            });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(12));

        const data = {
            username,
            password: hashedPassword,
            full_name: name,
            email,
            phone,
            address,
            role,
            store_id: store_id || null,
            status: status || 'active'
        };

        // Managers can only create within their store
        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (!info?.store_id) return res.status(403).json({ err: 1, msg: 'Manager has no store assigned' });
            data.store_id = info.store_id;
        }

        const response = await employeeService.createEmployee(data);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Update employee
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.name) {
            data.full_name = data.name;
            delete data.name;
        }

        // If password is being updated, hash it
        if (data.password) {
            data.password = bcrypt.hashSync(data.password, bcrypt.genSaltSync(12));
        }

        // Validate role if being updated
        if (data.role) {
            const validRoles = ['CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'];
            if (!validRoles.includes(data.role)) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Invalid role. Must be one of: CEO, Store_Manager, Cashier, Warehouse, Supplier'
                });
            }
        }

        // Don't allow updating username (it's unique)
        if (data.username) {
            delete data.username;
        }

        // Managers can only update employees in their store
        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            const target = await employeeService.getEmployeeById(id);
            if (!target?.data || target.data.store_id !== info.store_id) {
                return res.status(403).json({ err: 1, msg: 'Forbidden: cross-store update' });
            }
            if (data.store_id && data.store_id !== info.store_id) delete data.store_id;
        }

        const response = await employeeService.updateEmployee(id, data);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Delete/Deactivate employee
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query; // If permanent=true, hard delete, else soft delete (deactivate)

        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            const target = await employeeService.getEmployeeById(id);
            if (!target?.data || target.data.store_id !== info.store_id) {
                return res.status(403).json({ err: 1, msg: 'Forbidden: cross-store delete' });
            }
        }

        if (permanent === 'true') {
            const response = await employeeService.hardDeleteEmployee(id);
            return res.status(response.err === 0 ? 200 : 404).json(response);
        } else {
            // Soft delete - set status to inactive
            const response = await employeeService.updateEmployee(id, { status: 'inactive' });
            return res.status(response.err === 0 ? 200 : 404).json(response);
        }
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Activate employee
export const activateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            const target = await employeeService.getEmployeeById(id);
            if (!target?.data || target.data.store_id !== info.store_id) {
                return res.status(403).json({ err: 1, msg: 'Forbidden: cross-store activate' });
            }
        }
        const response = await employeeService.updateEmployee(id, { status: 'active' });
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Get employee statistics
export const getEmployeeStatistics = async (req, res) => {
    try {
        const { store_id, role } = req.query;

        const filters = {};
        if (store_id) filters.store_id = store_id;
        if (role) filters.role = role;

        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            filters.store_id = info.store_id;
        }

        const response = await employeeService.getEmployeeStatistics(filters);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Get employees by store
export const getEmployeesByStore = async (req, res) => {
    try {
        const { store_id } = req.params;
        const { status, role } = req.query;

        const filters = { store_id };
        if (status) filters.status = status;
        if (role) filters.role = role;

        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            if (parseInt(store_id) !== info.store_id) {
                return res.status(403).json({ err: 1, msg: 'Forbidden: cross-store access' });
            }
        }

        const response = await employeeService.getEmployees(filters, { page: 1, limit: 1000 });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Get employees by role
export const getEmployeesByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const { store_id, status } = req.query;

        const filters = { role };
        if (store_id) filters.store_id = store_id;
        if (status) filters.status = status;

        if (req.user?.role === 'Store_Manager') {
            const info = await employeeService.getStoreInfoByUserId(req.user?.user_id || req.user?.id);
            filters.store_id = info.store_id;
        }

        const response = await employeeService.getEmployees(filters, { page: 1, limit: 1000 });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

// Get all stores
export const getAllStores = async (req, res) => {
    try {
        const response = await employeeService.getAllStores();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

