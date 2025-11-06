import express from 'express';
import verifyToken from '../middlewares/verifyToken';
import * as scheduleController from '../controllers/schedule';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// =====================================================
// SHIFT TEMPLATE ROUTES
// =====================================================
router.get('/shift-templates', scheduleController.getShiftTemplates);
router.get('/shift-templates/:id', scheduleController.getShiftTemplateById);
router.post('/shift-templates', scheduleController.createShiftTemplate);
router.put('/shift-templates/:id', scheduleController.updateShiftTemplate);

// =====================================================
// SCHEDULE ROUTES
// =====================================================

// Get schedules (with query params: store_id, start_date, end_date)
router.get('/schedules', scheduleController.getSchedules);

// Get available shifts (with query params: store_id, start_date, end_date)
router.get('/schedules/available', scheduleController.getAvailableShifts);
// Get available employees for a shift (store_id, work_date, shift_template_id, role)
router.get('/schedules/available-employees', scheduleController.getAvailableEmployees);

// Get employee schedules (with query params: start_date, end_date)
router.get('/schedules/employee/:user_id', scheduleController.getEmployeeSchedules);

// Get my schedules (current user)
router.get('/schedules/my-schedules', scheduleController.getMySchedules);

// Get schedule by ID
router.get('/schedules/:id', scheduleController.getScheduleById);

// Create schedule
router.post('/schedules', scheduleController.createSchedule);

// Update schedule
router.put('/schedules/:id', scheduleController.updateSchedule);

// Delete schedule
router.delete('/schedules/:id', scheduleController.deleteSchedule);

// Get schedule statistics (with query params: store_id, role)
router.get('/schedules/statistics', scheduleController.getScheduleStatistics);

// Check schedule conflicts
router.post('/schedules/check-conflicts', scheduleController.checkScheduleConflicts);

// =====================================================
// SHIFT CHANGE REQUEST ROUTES
// =====================================================

// Create shift change request
router.post('/shift-change-requests', scheduleController.createShiftChangeRequest);

// Get shift change requests (with optional query params: store_id, from_user_id, status)
router.get('/shift-change-requests', scheduleController.getShiftChangeRequests);

// Get my shift change requests (current user)
router.get('/shift-change-requests/my-requests', scheduleController.getMyShiftChangeRequests);

// Get shift change request by ID
router.get('/shift-change-requests/:id', scheduleController.getShiftChangeRequestById);

// Review (approve/reject) shift change request
router.put('/shift-change-requests/:id/review', scheduleController.reviewShiftChangeRequest);

export default router;

