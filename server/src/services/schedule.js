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

// Tự động đánh dấu vắng mặt cho các schedule quá thời gian ca mà chưa điểm danh
export const markAbsentSchedules = () => new Promise(async (resolve, reject) => {
    try {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        console.log('=== markAbsentSchedules ===');
        console.log('Giờ hiện tại:', now.toISOString(), '|', now.toLocaleString('vi-VN'));
        console.log('Ngày hôm nay (00:00:00):', today.toISOString());
        
        // Lấy tất cả schedules hôm nay và các ngày trước chưa check-in
        const schedules = await db.Schedule.findAll({
            where: {
                work_date: { [Op.lte]: today },
                attendance_status: 'not_checked_in',
                status: 'confirmed'
            },
            include: [
                {
                    model: db.ShiftTemplate,
                    as: 'shiftTemplate',
                    attributes: ['shift_template_id', 'start_time', 'end_time'],
                    required: true
                }
            ],
            raw: false
        });
        
        let updatedCount = 0;
        
        for (const schedule of schedules) {
            const workDate = new Date(schedule.work_date);
            const shiftTemplate = schedule.shiftTemplate;
            
            if (!shiftTemplate) continue;
            
            // Parse thời gian bắt đầu ca
            const [startHour, startMinute] = shiftTemplate.start_time.split(':').map(Number);
            const shiftStartTime = new Date(workDate);
            shiftStartTime.setHours(startHour, startMinute, 0, 0);
            
            // Parse thời gian kết thúc ca
            const [endHour, endMinute] = shiftTemplate.end_time.split(':').map(Number);
            const shiftEndTime = new Date(workDate);
            shiftEndTime.setHours(endHour, endMinute, 0, 0);
            
            // Xử lý ca qua đêm (end_time < start_time)
            const isNightShift = shiftEndTime < shiftStartTime;
            if (isNightShift) {
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            }
            
            // Kiểm tra xem có đang trong ca không (quan trọng cho ca đêm)
            const isInShift = now >= shiftStartTime && now <= shiftEndTime;
            
            // Đánh vắng nếu:
            // 1. Quá ngày làm việc (work_date < today) - nhưng phải kiểm tra ca đêm
            // 2. Hoặc đã quá thời gian kết thúc ca VÀ không đang trong ca
            
            const workDateOnly = new Date(workDate);
            workDateOnly.setHours(0, 0, 0, 0);
            const isPastWorkDate = workDateOnly < today;
            
            console.log(`\nSchedule ID: ${schedule.schedule_id}, Work Date: ${schedule.work_date}`);
            console.log(`  Shift: ${shiftTemplate.start_time} - ${shiftTemplate.end_time} (Night: ${isNightShift})`);
            console.log(`  Shift Start: ${shiftStartTime.toISOString()} | ${shiftStartTime.toLocaleString('vi-VN')}`);
            console.log(`  Shift End: ${shiftEndTime.toISOString()} | ${shiftEndTime.toLocaleString('vi-VN')}`);
            console.log(`  Now: ${now.toISOString()} | ${now.toLocaleString('vi-VN')}`);
            console.log(`  isInShift: ${isInShift}, isPastWorkDate: ${isPastWorkDate}`);
            
            // Với ca đêm: nếu work_date = yesterday và đang trong ca (ví dụ: 03:00 sáng), không đánh vắng
            if (isPastWorkDate && isNightShift) {
                // Kiểm tra xem có phải ca đêm hôm qua không
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                
                console.log(`  Yesterday: ${yesterday.toISOString()}, workDateOnly: ${workDateOnly.toISOString()}`);
                
                // Nếu work_date = yesterday và đang trong ca đêm, không đánh vắng
                if (workDateOnly.getTime() === yesterday.getTime() && isInShift) {
                    // Đang trong ca đêm hôm qua, không đánh vắng
                    console.log(`  → SKIP: Đang trong ca đêm hôm qua, không đánh vắng`);
                    continue;
                }
            }
            
            // Đánh vắng nếu:
            // - Quá ngày làm việc (và không phải ca đêm đang diễn ra)
            // - Hoặc đã quá thời gian kết thúc ca và không đang trong ca
            const isPastShiftEnd = now > shiftEndTime && !isInShift;
            console.log(`  isPastShiftEnd: ${isPastShiftEnd}`);
            
            if (isPastWorkDate || isPastShiftEnd) {
                console.log(`  → MARK AS ABSENT`);
                await schedule.update({ attendance_status: 'absent' });
                updatedCount++;
            } else {
                console.log(`  → KEEP (chưa đến thời gian đánh vắng)`);
            }
        }
        
        console.log(`\n=== Tổng kết: Đánh vắng ${updatedCount} schedule(s) ===\n`);
        
        resolve({
            err: 0,
            msg: 'OK',
            data: { updated_count: updatedCount }
        });
    } catch (error) {
        console.error('Error marking absent schedules:', error);
        reject(error);
    }
});

// Get schedules by store and date range
export const getSchedules = (storeId, startDate, endDate) => new Promise(async (resolve, reject) => {
    try {
        // Tự động đánh dấu vắng mặt trước khi query
        await markAbsentSchedules();
        
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
                    attributes: ['user_id', 'username', 'email', 'role', 'full_name']
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
                },
                {
                    model: db.Shift,
                    as: 'shifts',
                    attributes: ['shift_id', 'opened_at', 'closed_at', 'status'],
                    required: false
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
        // Tự động đánh dấu vắng mặt trước khi query
        await markAbsentSchedules();
        
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
                },
                {
                    model: db.Shift,
                    as: 'shifts',
                    attributes: ['shift_id', 'opened_at', 'closed_at', 'status', 'late_minutes', 'note'],
                    required: false,
                    limit: 1,
                    order: [['opened_at', 'DESC']]
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

// Get count of future schedules for an employee at a specific store
// NOTE: Only counts schedules with work_date >= today (future schedules)
// Past schedules are not counted as they are kept for historical records
export const getFutureSchedulesCountByEmployeeAndStore = (userId, storeId) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Only count future schedules (work_date >= today)
        // Past schedules are not counted as they are preserved
        const count = await db.Schedule.count({
            where: {
                user_id: userId,
                store_id: storeId,
                work_date: {
                    [Op.gte]: todayStr  // Only future dates
                }
            }
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: { count }
        });
    } catch (error) {
        reject(error);
    }
});

// Delete future schedules for an employee at a specific store
// NOTE: Only deletes schedules with work_date >= today (future schedules)
// Past schedules (work_date < today) are kept for historical records
export const deleteFutureSchedulesByEmployeeAndStore = (userId, storeId) => new Promise(async (resolve, reject) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Only delete future schedules (work_date >= today)
        // Past schedules are preserved to show historical records
        const deleted = await db.Schedule.destroy({
            where: {
                user_id: userId,
                store_id: storeId,
                work_date: {
                    [Op.gte]: todayStr  // Only future dates, past dates are kept
                }
            }
        });

        resolve({
            err: 0,
            msg: 'OK',
            data: { deletedCount: deleted }
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
            
            if (!fromSchedule) {
                resolve({
                    err: 1,
                    msg: 'From schedule not found',
                    data: null
                });
                return;
            }

            // Get request data (handle both Sequelize instance and plain object)
            const requestData = request.get ? request.get({ plain: true }) : request;
            const toSchedule = request.toSchedule;

            if (requestData.request_type === 'swap') {
                if (toSchedule) {
                    // Khi đổi ca: thêm nhân viên vào ca mới thay vì swap
                    const fromUserId = fromSchedule.user_id;
                    if (toSchedule.user_id) {
                        // Ca đã có nhân viên: tạo Schedule mới cho nhân viên muốn đổi ca
                        // Giữ nguyên toSchedule và nhân viên hiện tại
                        await db.Schedule.create({
                            store_id: toSchedule.store_id,
                            user_id: fromUserId,
                            shift_template_id: toSchedule.shift_template_id,
                            work_date: toSchedule.work_date,
                            status: 'confirmed',
                            attendance_status: 'not_checked_in',
                            created_by: reviewerId
                        });
                        // Xóa nhân viên khỏi ca cũ (hoặc set status = draft)
                        await fromSchedule.update({ user_id: null, status: 'draft' });
                    } else {
                        // To schedule is empty, just move user and keep the old schedule record
                        await toSchedule.update({ user_id: fromUserId, status: 'confirmed' });
                        await fromSchedule.update({ user_id: null, status: 'draft' });
                    }
                } else if (requestData.to_work_date && requestData.to_shift_template_id) {
                    // Swap với ca trống - tìm schedule ở ca trống (nếu có)
                    try {
                        // Validate dữ liệu
                        if (!fromSchedule.store_id) {
                            throw new Error('Store ID is missing from fromSchedule');
                        }
                        if (!fromSchedule.user_id) {
                            throw new Error('User ID is missing from fromSchedule');
                        }
                        if (!requestData.to_shift_template_id) {
                            throw new Error('Shift template ID is missing');
                        }
                        if (!requestData.to_work_date) {
                            throw new Error('Work date is missing');
                        }
                        if (!reviewerId) {
                            throw new Error('Reviewer ID is missing');
                        }

                        const toShiftTemplateId = parseInt(requestData.to_shift_template_id);
                        const toWorkDate = requestData.to_work_date;
                        const fromUserId = fromSchedule.user_id;

                        // Kiểm tra xem đã có schedule ở ca trống chưa (có thể có schedule nhưng user_id = null)
                        const existingSchedule = await db.Schedule.findOne({
                            where: {
                                store_id: fromSchedule.store_id,
                                shift_template_id: toShiftTemplateId,
                                work_date: toWorkDate
                            }
                        });

                        if (existingSchedule) {
                            // Đã có schedule ở ca trống
                            if (existingSchedule.user_id && existingSchedule.user_id === fromUserId) {
                                // Cùng user, cùng ca - giữ lại fromSchedule nhưng làm trống user
                                await fromSchedule.update({ user_id: null, status: 'draft' });
                            } else if (existingSchedule.user_id) {
                                // Đã có nhân viên khác - tạo Schedule mới thay vì swap
                                // Giữ nguyên existingSchedule và nhân viên hiện tại
                                await db.Schedule.create({
                                    store_id: fromSchedule.store_id,
                                    user_id: fromUserId,
                                    shift_template_id: toShiftTemplateId,
                                    work_date: toWorkDate,
                                    status: 'confirmed',
                                    attendance_status: 'not_checked_in',
                                    created_by: reviewerId
                                });
                                // Xóa nhân viên khỏi ca cũ
                                await fromSchedule.update({ user_id: null, status: 'draft' });
                            } else {
                                // Schedule trống (user_id = null) - chỉ cần gán user
                                await existingSchedule.update({ user_id: fromUserId, status: 'confirmed' });
                                await fromSchedule.update({ user_id: null, status: 'draft' });
                            }
                        } else {
                            // Chưa có schedule - tạo mới
                            // Nhưng kiểm tra xem có trùng với fromSchedule không
                            if (fromSchedule.shift_template_id === toShiftTemplateId && 
                                fromSchedule.work_date === toWorkDate) {
                                // Cùng ca - giữ lại fromSchedule nhưng làm trống user
                                await fromSchedule.update({ user_id: null, status: 'draft' });
                            } else {
                                // Khác ca - tạo schedule mới
                                const scheduleData = {
                                    store_id: fromSchedule.store_id,
                                    user_id: fromUserId,
                                    shift_template_id: toShiftTemplateId,
                                    work_date: toWorkDate,
                                    status: 'confirmed',
                                    created_by: reviewerId
                                };

                                const newSchedule = await db.Schedule.create(scheduleData);
                                // Sau khi tạo ca mới, giải phóng ca cũ thay vì xóa
                                await fromSchedule.update({ user_id: null, status: 'draft' });
                            }
                        }
                    } catch (createError) {
                        throw new Error('Failed to process empty shift swap: ' + (createError.message || createError.toString()));
                    }
                } else {
                    // Swap nhưng không có to_schedule và không có thông tin ca trống
                    // Để quản lý tự phân công - giữ lại record và giải phóng user
                    await fromSchedule.update({ user_id: null, status: 'draft' });
                }
            } else if (requestData.request_type === 'give_away' && requestData.to_user_id) {
                // Give away: transfer the shift to another user
                await fromSchedule.update({ user_id: requestData.to_user_id });
            } else if (requestData.request_type === 'take_over') {
                // Take over: request.to_user_id should be the one taking over
                if (requestData.to_user_id) {
                    await fromSchedule.update({ user_id: requestData.to_user_id });
                } else {
                    // Take over nhưng không có to_user_id - để quản lý tự phân công
                    await fromSchedule.update({ user_id: null, status: 'draft' });
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
        // Nếu lỗi là ValidationError/UniqueConstraintError của Sequelize
        // thì trả về err = 1 với message thân thiện, tránh vỡ 500 ở controller
        if (error && (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError')) {
            // Lấy message chi tiết nhất nếu có
            const firstError = Array.isArray(error.errors) && error.errors.length > 0 ? error.errors[0].message : null;

            let friendlyMsg = firstError || 'Không thể duyệt yêu cầu do vi phạm ràng buộc dữ liệu.';

            // Mapping message constraint sang tiếng Việt dễ hiểu hơn
            if (friendlyMsg.includes('unique_schedule_user_shift_date')) {
                friendlyMsg = 'Nhân viên đã có lịch trùng ngày và ca làm việc này, không thể duyệt yêu cầu đổi ca.';
            }

            resolve({
                err: 1,
                msg: friendlyMsg,
                data: null
            });
            return;
        }

        // Các lỗi khác giữ nguyên để controller xử lý (500)
        reject(error);
    }
});
