import db from '../models';
import { Op } from 'sequelize';

// =====================================================
// SHIFT TEMPLATE SERVICES
// =====================================================

// Get all shift templates
export const getShiftTemplates = () => new Promise(async (resolve, reject) => {
    try {
        const response = await db.ShiftTemplate.findAll({
            where: { is_active: true },
            order: [['start_time', 'ASC']],
            raw: true
        });
        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Get shift template by ID
export const getShiftTemplateById = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.ShiftTemplate.findOne({
            where: { shift_template_id: id },
            raw: true
        });
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Shift template not found',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Create shift template
export const createShiftTemplate = (data) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.ShiftTemplate.create(data);
        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Update shift template
export const updateShiftTemplate = (id, data) => new Promise(async (resolve, reject) => {
    try {
        const [updated] = await db.ShiftTemplate.update(data, {
            where: { shift_template_id: id }
        });
        resolve({
            err: updated > 0 ? 0 : 1,
            msg: updated > 0 ? 'OK' : 'Shift template not found',
            data: updated > 0 ? await db.ShiftTemplate.findOne({ where: { shift_template_id: id }, raw: true }) : null
        });
    } catch (error) {
        reject(error);
    }
});

// =====================================================
// SCHEDULE SERVICES
// =====================================================

// Get schedules by store and date range
export const getSchedules = (storeId, startDate, endDate) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Schedule.findAll({
            where: {
                store_id: storeId,
                work_date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: db.User,
                    as: 'employee',
                    attributes: ['user_id', 'username', 'email', 'role']
                },
                {
                    model: db.ShiftTemplate,
                    as: 'shiftTemplate',
                    attributes: ['shift_template_id', 'name', 'start_time', 'end_time']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['user_id', 'username']
                }
            ],
            order: [['work_date', 'ASC'], [{ model: db.ShiftTemplate, as: 'shiftTemplate' }, 'start_time', 'ASC']],
            raw: false
        });
        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Get schedule by ID
export const getScheduleById = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Schedule.findOne({
            where: { schedule_id: id },
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
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                }
            ],
            raw: false
        });
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Schedule not found',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Get schedules for a specific employee
export const getEmployeeSchedules = (userId, startDate, endDate) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Schedule.findAll({
            where: {
                user_id: userId,
                work_date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: db.ShiftTemplate,
                    as: 'shiftTemplate',
                    attributes: ['shift_template_id', 'name', 'start_time', 'end_time']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address']
                }
            ],
            order: [['work_date', 'ASC'], [{ model: db.ShiftTemplate, as: 'shiftTemplate' }, 'start_time', 'ASC']],
            raw: false
        });
        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Create schedule
export const createSchedule = (data) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.Schedule.create(data);
        const schedule = await db.Schedule.findOne({
            where: { schedule_id: response.schedule_id },
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
            raw: false
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: schedule
        });
    } catch (error) {
        // Log chi tiết lỗi để debug
        console.error('Error creating schedule:', error);
        // Nếu là lỗi unique constraint, trả về message rõ ràng hơn
        if (error.name === 'SequelizeUniqueConstraintError') {
            reject(new Error('Unique constraint violation: Schedule already exists for this store, shift, and date. Please remove the unique index from database.'));
        } else {
            reject(error);
        }
    }
});

// Update schedule
export const updateSchedule = (id, data) => new Promise(async (resolve, reject) => {
    try {
        const [updated] = await db.Schedule.update(data, {
            where: { schedule_id: id }
        });

        if (updated > 0) {
            const schedule = await db.Schedule.findOne({
                where: { schedule_id: id },
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
                raw: false
            });
            resolve({
                err: 0,
                msg: 'OK',
                data: schedule
            });
        } else {
            resolve({
                err: 1,
                msg: 'Schedule not found',
                data: null
            });
        }
    } catch (error) {
        reject(error);
    }
});

// Delete schedule
export const deleteSchedule = (id) => new Promise(async (resolve, reject) => {
    try {
        const deleted = await db.Schedule.destroy({
            where: { schedule_id: id }
        });
        resolve({
            err: deleted > 0 ? 0 : 1,
            msg: deleted > 0 ? 'OK' : 'Schedule not found',
            data: deleted
        });
    } catch (error) {
        reject(error);
    }
});

// Get available shifts (unassigned shifts)
export const getAvailableShifts = (storeId, startDate, endDate) => new Promise(async (resolve, reject) => {
    try {
        // Get all active shift templates
        const shiftTemplates = await db.ShiftTemplate.findAll({
            where: { is_active: true },
            raw: true
        });

        // Get all scheduled shifts in the date range
        const scheduled = await db.Schedule.findAll({
            where: {
                store_id: storeId,
                work_date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: ['shift_template_id', 'work_date'],
            raw: true
        });

        // Create a set of scheduled (store_id, shift_template_id, work_date) combinations
        const scheduledSet = new Set(
            scheduled.map(s => `${s.shift_template_id}_${s.work_date}`)
        );

        // Generate all possible combinations and filter out scheduled ones
        const available = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            for (const template of shiftTemplates) {
                const key = `${template.shift_template_id}_${dateStr}`;
                if (!scheduledSet.has(key)) {
                    available.push({
                        work_date: dateStr,
                        shift_template_id: template.shift_template_id,
                        shift_name: template.name,
                        start_time: template.start_time,
                        end_time: template.end_time
                    });
                }
            }
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: available
        });
    } catch (error) {
        reject(error);
    }
});

// Get schedule statistics for employees
export const getScheduleStatistics = (storeId, role = null) => new Promise(async (resolve, reject) => {
    try {
        const whereClause = { store_id: storeId };
        if (role) {
            whereClause.role = role;
        }

        const users = await db.User.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Schedule,
                    as: 'schedules',
                    required: false,
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['start_time', 'end_time']
                        }
                    ],
                    where: {
                        work_date: {
                            [Op.gte]: db.sequelize.literal('DATE_SUB(CURDATE(), INTERVAL 30 DAY)')
                        }
                    },
                    required: false
                }
            ],
            raw: false
        });

        const statistics = users.map(user => {
            const schedules = user.schedules || [];
            let totalHours = 0;

            schedules.forEach(schedule => {
                const start = new Date(`2000-01-01 ${schedule.shiftTemplate.start_time}`);
                let end = new Date(`2000-01-01 ${schedule.shiftTemplate.end_time}`);
                
                // Handle overnight shifts
                if (end < start) {
                    end = new Date(`2000-01-02 ${schedule.shiftTemplate.end_time}`);
                }
                
                const hours = (end - start) / (1000 * 60 * 60);
                totalHours += hours;
            });

            return {
                user_id: user.user_id,
                username: user.username,
                total_work_days: new Set(schedules.map(s => s.work_date)).size,
                total_shifts: schedules.length,
                total_hours: Math.round(totalHours * 100) / 100,
                confirmed_shifts: schedules.filter(s => s.status === 'confirmed').length,
                draft_shifts: schedules.filter(s => s.status === 'draft').length
            };
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: statistics
        });
    } catch (error) {
        reject(error);
    }
});

// Check for schedule conflicts
export const checkScheduleConflicts = (userId, workDate, shiftTemplateId) => new Promise(async (resolve, reject) => {
    try {
        // Bỏ check trùng ca - cho phép gán bất kỳ nhân viên nào cho bất kỳ ca nào
        resolve({
            err: 0,
            msg: 'No conflicts',
            data: {
                has_conflicts: false,
                conflicts: []
            }
        });
    } catch (error) {
        reject(error);
    }
});

// Get available employees for a specific shift (not overlapping on that date/time)
export const getAvailableEmployees = (storeId, workDate, shiftTemplateId, role = 'Cashier') => new Promise(async (resolve, reject) => {
    try {
        // Bỏ check trùng ca - trả về tất cả nhân viên trong store và role
        const employees = await db.User.findAll({
            where: { store_id: storeId, role },
            attributes: ['user_id', 'username', 'email'],
            raw: true
        });

        resolve({ err: 0, msg: 'OK', data: employees });
    } catch (error) {
        reject(error);
    }
});

// =====================================================
// SHIFT CHANGE REQUEST SERVICES
// =====================================================

// Create shift change request
export const createShiftChangeRequest = (data) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.ShiftChangeRequest.create(data);
        const request = await db.ShiftChangeRequest.findOne({
            where: { request_id: response.request_id },
            include: [
                {
                    model: db.Schedule,
                    as: 'fromSchedule',
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'fromUser',
                    attributes: ['user_id', 'username', 'email']
                }
            ],
            raw: false
        });
        resolve({
            err: 0,
            msg: 'OK',
            data: request
        });
    } catch (error) {
        reject(error);
    }
});

// Get shift change requests
export const getShiftChangeRequests = (filters = {}) => new Promise(async (resolve, reject) => {
    try {
        const whereClause = {};
        
        if (filters.store_id) whereClause.store_id = filters.store_id;
        if (filters.from_user_id) whereClause.from_user_id = filters.from_user_id;
        if (filters.status) whereClause.status = filters.status;

        const response = await db.ShiftChangeRequest.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Schedule,
                    as: 'fromSchedule',
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        },
                        {
                            model: db.User,
                            as: 'employee',
                            attributes: ['user_id', 'username']
                        }
                    ]
                },
                {
                    model: db.Schedule,
                    as: 'toSchedule',
                    required: false,
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        },
                        {
                            model: db.User,
                            as: 'employee',
                            attributes: ['user_id', 'username']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'fromUser',
                    attributes: ['user_id', 'username', 'email']
                },
                {
                    model: db.User,
                    as: 'toUser',
                    required: false,
                    attributes: ['user_id', 'username', 'email']
                },
                {
                    model: db.User,
                    as: 'reviewer',
                    required: false,
                    attributes: ['user_id', 'username']
                }
            ],
            order: [['requested_at', 'DESC']],
            raw: false
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Get shift change request by ID
export const getShiftChangeRequestById = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.ShiftChangeRequest.findOne({
            where: { request_id: id },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name']
                },
                {
                    model: db.Schedule,
                    as: 'fromSchedule',
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        }
                    ]
                },
                {
                    model: db.Schedule,
                    as: 'toSchedule',
                    required: false,
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'fromUser',
                    attributes: ['user_id', 'username', 'email']
                },
                {
                    model: db.User,
                    as: 'toUser',
                    required: false,
                    attributes: ['user_id', 'username', 'email']
                },
                {
                    model: db.User,
                    as: 'reviewer',
                    required: false,
                    attributes: ['user_id', 'username']
                }
            ],
            raw: false
        });
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Shift change request not found',
            data: response
        });
    } catch (error) {
        reject(error);
    }
});

// Update shift change request status (approve/reject)
export const updateShiftChangeRequestStatus = (id, status, reviewerId, reviewNotes = null) => new Promise(async (resolve, reject) => {
    try {
        const request = await db.ShiftChangeRequest.findOne({
            where: { request_id: id },
            include: [
                {
                    model: db.Schedule,
                    as: 'fromSchedule'
                },
                {
                    model: db.Schedule,
                    as: 'toSchedule',
                    required: false
                }
            ],
            raw: false
        });

        if (!request) {
            resolve({
                err: 1,
                msg: 'Shift change request not found',
                data: null
            });
            return;
        }

        if (status === 'approved') {
            // If approved, swap the users in schedules
            const fromSchedule = request.fromSchedule;
            const toSchedule = request.toSchedule;

            if (request.request_type === 'swap' && toSchedule) {
                // Swap: exchange users between two schedules
                const tempUserId = fromSchedule.user_id;
                await fromSchedule.update({ user_id: toSchedule.user_id });
                await toSchedule.update({ user_id: tempUserId });
            } else if (request.request_type === 'give_away' && request.to_user_id) {
                // Give away: transfer the shift to another user
                await fromSchedule.update({ user_id: request.to_user_id });
            } else if (request.request_type === 'take_over') {
                // Take over: request.to_user_id should be the one taking over
                if (request.to_user_id) {
                    await fromSchedule.update({ user_id: request.to_user_id });
                }
            }
        }

        // Update request status
        await request.update({
            status: status,
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            review_notes: reviewNotes
        });

        const updatedRequest = await db.ShiftChangeRequest.findOne({
            where: { request_id: id },
            include: [
                {
                    model: db.Schedule,
                    as: 'fromSchedule',
                    include: [
                        {
                            model: db.ShiftTemplate,
                            as: 'shiftTemplate',
                            attributes: ['name', 'start_time', 'end_time']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'reviewer',
                    attributes: ['user_id', 'username']
                }
            ],
            raw: false
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: updatedRequest
        });
    } catch (error) {
        reject(error);
    }
});

