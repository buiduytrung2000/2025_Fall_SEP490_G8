import * as scheduleService from '../services/schedule';

// =====================================================
// SHIFT TEMPLATE CONTROLLERS
// =====================================================

// Get all shift templates
export const getShiftTemplates = async (req, res) => {
    try {
        const response = await scheduleService.getShiftTemplates();
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift template controller: ' + error.message
        });
    }
};

// Get shift template by ID
export const getShiftTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await scheduleService.getShiftTemplateById(id);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift template controller: ' + error.message
        });
    }
};

// Create shift template
export const createShiftTemplate = async (req, res) => {
    try {
        const data = req.body;
        const response = await scheduleService.createShiftTemplate(data);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift template controller: ' + error.message
        });
    }
};

// Update shift template
export const updateShiftTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const response = await scheduleService.updateShiftTemplate(id, data);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift template controller: ' + error.message
        });
    }
};

// =====================================================
// SCHEDULE CONTROLLERS
// =====================================================

// Get schedules
export const getSchedules = async (req, res) => {
    try {
        let { store_id, start_date, end_date } = req.query;

        // Allow providing only start_date: default end_date = start_date + 6 days
        if (start_date && !end_date) {
            const d = new Date(start_date);
            if (!isNaN(d)) {
                const e = new Date(d);
                e.setDate(e.getDate() + 6);
                end_date = e.toISOString().split('T')[0];
                req.query.end_date = end_date;
            }
        }

        if (!store_id || !start_date || !end_date) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: store_id, start_date, end_date'
            });
        }

        const response = await scheduleService.getSchedules(store_id, start_date, end_date);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get schedule by ID
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await scheduleService.getScheduleById(id);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get employee schedules
export const getEmployeeSchedules = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: start_date, end_date'
            });
        }

        const response = await scheduleService.getEmployeeSchedules(user_id, start_date, end_date);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get my schedules (current user)
export const getMySchedules = async (req, res) => {
    try {
        // Prefer authenticated user; fallback to explicit query for non-auth calls
        const authId = req.user?.id || req.user?.user_id;
        const requestedId = req.query.user_id ? parseInt(req.query.user_id) : undefined;
        const effectiveUserId = authId || requestedId;

        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            // Default to next 14 days if not provided
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 14);
            req.query.start_date = today.toISOString().split('T')[0];
            req.query.end_date = endDate.toISOString().split('T')[0];
        }

        if (!effectiveUserId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing user context: provide Authorization token or user_id'
            });
        }

        const response = await scheduleService.getEmployeeSchedules(effectiveUserId, req.query.start_date, req.query.end_date);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Create schedule
export const createSchedule = async (req, res) => {
    try {
        const data = {
            ...req.body,
            created_by: req.user?.user_id || req.user?.id
        };

        // Kiểm tra nếu ngày đã qua thì không cho phép tạo lịch
        if (data.work_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scheduleDate = new Date(data.work_date);
            scheduleDate.setHours(0, 0, 0, 0);
            
            if (scheduleDate < today) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Không thể tạo lịch cho ngày đã qua'
                });
            }
        }

        // Check for conflicts before creating
        const conflictCheck = await scheduleService.checkScheduleConflicts(
            data.user_id,
            data.work_date,
            data.shift_template_id
        );

        if (conflictCheck.data.has_conflicts) {
            return res.status(400).json({
                err: 1,
                msg: 'Schedule conflicts detected',
                data: conflictCheck.data
            });
        }

        const response = await scheduleService.createSchedule(data);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Update schedule
export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Get current schedule to check work_date
        const schedule = await scheduleService.getScheduleById(id);
        if (schedule.err !== 0 || !schedule.data) {
            return res.status(404).json(schedule);
        }

        // Safely access schedule data (handle both Sequelize instance and plain object)
        const scheduleData = schedule.data.get ? schedule.data.get({ plain: true }) : schedule.data;
        const workDate = data.work_date || scheduleData.work_date;

        // Kiểm tra nếu ngày đã qua thì không cho phép sửa
        if (workDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scheduleDate = new Date(workDate);
            scheduleDate.setHours(0, 0, 0, 0);
            
            if (scheduleDate < today) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Không thể sửa lịch của ngày đã qua'
                });
            }
        }

        // If updating user_id, work_date, or shift_template_id, check for conflicts
        if (data.user_id || data.work_date || data.shift_template_id) {
            const userId = data.user_id || scheduleData.user_id;
            const shiftTemplateId = data.shift_template_id || scheduleData.shift_template_id;

            if (!userId || !workDate || !shiftTemplateId) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Missing required schedule information for conflict check'
                });
            }

            const conflictCheck = await scheduleService.checkScheduleConflicts(
                userId,
                workDate,
                shiftTemplateId
            );

            if (conflictCheck && conflictCheck.data && conflictCheck.data.has_conflicts) {
                // Exclude current schedule from conflicts
                const relevantConflicts = (conflictCheck.data.conflicts || []).filter(
                    c => c.schedule_id !== parseInt(id)
                );

                if (relevantConflicts.length > 0) {
                    return res.status(400).json({
                        err: 1,
                        msg: 'Schedule conflicts detected',
                        data: {
                            has_conflicts: true,
                            conflicts: relevantConflicts
                        }
                    });
                }
            }
        }

        const response = await scheduleService.updateSchedule(id, data);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Delete schedule
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get schedule to check work_date before deleting
        const schedule = await scheduleService.getScheduleById(id);
        if (schedule.err !== 0 || !schedule.data) {
            return res.status(404).json(schedule);
        }

        // Safely access schedule data (handle both Sequelize instance and plain object)
        const scheduleData = schedule.data.get ? schedule.data.get({ plain: true }) : schedule.data;
        const workDate = scheduleData.work_date;

        // Kiểm tra nếu ngày đã qua thì không cho phép xóa
        if (workDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scheduleDate = new Date(workDate);
            scheduleDate.setHours(0, 0, 0, 0);
            
            if (scheduleDate < today) {
                return res.status(400).json({
                    err: 1,
                    msg: 'Không thể xóa lịch của ngày đã qua'
                });
            }
        }

        const response = await scheduleService.deleteSchedule(id);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get count of future schedules for an employee at a specific store
export const getFutureSchedulesCountByEmployeeAndStore = async (req, res) => {
    try {
        const { user_id, store_id } = req.query;

        if (!user_id || !store_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: user_id, store_id'
            });
        }

        const response = await scheduleService.getFutureSchedulesCountByEmployeeAndStore(
            parseInt(user_id),
            parseInt(store_id)
        );
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Delete future schedules for an employee at a specific store
export const deleteFutureSchedulesByEmployeeAndStore = async (req, res) => {
    try {
        const { user_id, store_id } = req.query;

        if (!user_id || !store_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: user_id, store_id'
            });
        }

        const response = await scheduleService.deleteFutureSchedulesByEmployeeAndStore(
            parseInt(user_id),
            parseInt(store_id)
        );
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get available shifts
export const getAvailableShifts = async (req, res) => {
    try {
        const { store_id, start_date, end_date } = req.query;

        if (!store_id || !start_date || !end_date) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: store_id, start_date, end_date'
            });
        }

        const response = await scheduleService.getAvailableShifts(store_id, start_date, end_date);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get available employees for a shift
export const getAvailableEmployees = async (req, res) => {
    try {
        const { store_id, work_date, shift_template_id, role } = req.query;

        if (!store_id || !work_date || !shift_template_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: store_id, work_date, shift_template_id'
            });
        }

        const response = await scheduleService.getAvailableEmployees(
            parseInt(store_id), work_date, parseInt(shift_template_id), role || 'Cashier'
        );
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Get schedule statistics
export const getScheduleStatistics = async (req, res) => {
    try {
        const { store_id, role } = req.query;

        if (!store_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameter: store_id'
            });
        }

        const response = await scheduleService.getScheduleStatistics(store_id, role);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// Check schedule conflicts
export const checkScheduleConflicts = async (req, res) => {
    try {
        const { user_id, work_date, shift_template_id } = req.body;

        if (!user_id || !work_date || !shift_template_id) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required parameters: user_id, work_date, shift_template_id'
            });
        }

        const response = await scheduleService.checkScheduleConflicts(user_id, work_date, shift_template_id);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at schedule controller: ' + error.message
        });
    }
};

// =====================================================
// SHIFT CHANGE REQUEST CONTROLLERS
// =====================================================

// Create shift change request
export const createShiftChangeRequest = async (req, res) => {
    try {
        const data = {
            ...req.body,
            from_user_id: req.body.from_user_id || req.user?.user_id || req.user?.id
        };

        const response = await scheduleService.createShiftChangeRequest(data);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

// Get shift change requests
export const getShiftChangeRequests = async (req, res) => {
    try {
        const filters = {};
        
        if (req.query.store_id) filters.store_id = req.query.store_id;
        if (req.query.from_user_id) filters.from_user_id = req.query.from_user_id;
        if (req.query.status) filters.status = req.query.status;

        const response = await scheduleService.getShiftChangeRequests(filters);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

// Get my shift change requests (current user)
export const getMyShiftChangeRequests = async (req, res) => {
    try {
        const { id } = req.user;
        const filters = {
            from_user_id: id
        };

        if (req.query.status) filters.status = req.query.status;

        const response = await scheduleService.getShiftChangeRequests(filters);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

// Get shift change request by ID
export const getShiftChangeRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await scheduleService.getShiftChangeRequestById(id);
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

// Approve/reject shift change request
export const reviewShiftChangeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, review_notes } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                err: 1,
                msg: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        const response = await scheduleService.updateShiftChangeRequestStatus(
            id,
            status,
            req.user?.user_id || req.user?.id,
            review_notes
        );

        // Thành công
        if (response.err === 0) {
            return res.status(200).json(response);
        }

        // Lỗi dữ liệu/validation (ví dụ trùng ca, vi phạm ràng buộc)
        if (response.err === 1) {
            return res.status(400).json(response);
        }

        // Các lỗi khác: coi như không tìm thấy
        return res.status(404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

// Cancel shift change request (by the requester)
export const cancelShiftChangeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.user_id || req.user?.id;

        // First, check if the request belongs to the current user
        const request = await scheduleService.getShiftChangeRequestById(id);
        if (request.err !== 0 || !request.data) {
            return res.status(404).json({
                err: 1,
                msg: 'Shift change request not found'
            });
        }

        const requestData = request.data.get ? request.data.get({ plain: true }) : request.data;
        if (requestData.from_user_id !== userId) {
            return res.status(403).json({
                err: 1,
                msg: 'You can only cancel your own requests'
            });
        }

        if (requestData.status !== 'pending') {
            return res.status(400).json({
                err: 1,
                msg: 'Only pending requests can be cancelled'
            });
        }

        const response = await scheduleService.updateShiftChangeRequestStatus(
            id,
            'cancelled',
            userId,
            'Cancelled by requester'
        );
        return res.status(response.err === 0 ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at shift change request controller: ' + error.message
        });
    }
};

