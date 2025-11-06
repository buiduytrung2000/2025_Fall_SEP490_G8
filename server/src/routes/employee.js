import express from 'express';
import verifyToken from '../middlewares/verifyToken';
import * as employeeController from '../controllers/employee';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// =====================================================
// EMPLOYEE ROUTES
// =====================================================

// Get all employees (with query params: store_id, role, status, search)
router.get('/employees', employeeController.getEmployees);

// Get employee by ID
router.get('/employees/:id', employeeController.getEmployeeById);

// Create new employee
router.post('/employees', employeeController.createEmployee);

// Update employee
router.put('/employees/:id', employeeController.updateEmployee);

// Delete/Deactivate employee
router.delete('/employees/:id', employeeController.deleteEmployee);

// Activate employee
router.put('/employees/:id/activate', employeeController.activateEmployee);

// Get employee statistics (with query params: store_id, role)
router.get('/employees/statistics', employeeController.getEmployeeStatistics);

// Get employees by store
router.get('/employees/store/:store_id', employeeController.getEmployeesByStore);

// Get employees by role
router.get('/employees/role/:role', employeeController.getEmployeesByRole);

export default router;
















