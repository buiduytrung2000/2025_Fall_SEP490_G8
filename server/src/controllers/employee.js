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
        const { username, password, name, email, phone, role, store_id, status } = req.body;

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
            name,
            email,
            phone,
            role,
            store_id: store_id || null,
            status: status || 'active'
        };

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

        const response = await employeeService.getEmployees(filters, { page: 1, limit: 1000 });
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at employee controller: ' + error.message
        });
    }
};

