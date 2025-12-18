import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Divider,
    RadioGroup,
    FormControlLabel,
    Radio,
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import {
    SwapHoriz,
    Send,
    Cancel,
    CalendarToday,
    Person,
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, DangerButton, Icon } from '../../components/common';
import {
    getMySchedules,
    getShiftTemplates,
    createShiftChangeRequest,
    getMyShiftChangeRequests,
    getSchedules,
    cancelShiftChangeRequest,
} from '../../api/scheduleApi';
import { fetchEmployeeById } from '../../api/employeeApi';
import { useAuth } from '../../contexts/AuthContext';

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
};

const getStatusColor = (status) => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'approved':
            return 'success';
        case 'rejected':
            return 'error';
        case 'cancelled':
            return 'default';
        default:
            return 'default';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'pending':
            return 'Đang chờ';
        case 'approved':
            return 'Đã duyệt';
        case 'rejected':
            return 'Đã từ chối';
        case 'cancelled':
            return 'Đã hủy';
        default:
            return status;
    }
};

const getRequestTypeLabel = (type) => {
    switch (type) {
        case 'swap':
            return 'Đổi ca';
        case 'give_away':
            return 'Nhường ca';
        case 'take_over':
            return 'Nhận ca';
        default:
            return type;
    }
};

const ShiftChangeRequest = () => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [mySchedules, setMySchedules] = useState([]);
    const [shiftTemplates, setShiftTemplates] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [storeId, setStoreId] = useState(null);
    const [availableSchedules, setAvailableSchedules] = useState([]);
    const [allPossibleShifts, setAllPossibleShifts] = useState([]); 
    const [selectedWeek, setSelectedWeek] = useState('');
    const [filterDate, setFilterDate] = useState(''); // Lọc lịch theo ngày

    // Form state
    const [formData, setFormData] = useState({
        request_type: 'swap',
        from_schedule_id: '',
        to_schedule_id: '',
        to_user_id: '',
        reason: '',
        // Mặc định cho phép chọn ca cụ thể để đổi
        swap_option: 'manual',
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            
           
            const empRes = await fetchEmployeeById(user.id);
            const myStoreId = empRes?.data?.store_id || empRes?.data?.store?.store_id;
            if (!myStoreId) {
                ToastNotification.error('Không tìm thấy thông tin cửa hàng');
                setLoading(false);
                return;
            }
            setStoreId(myStoreId);

            // Get current date range (next 30 days)
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30); // lấy lùi 30 ngày
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 60); // và tới 60 ngày tiếp theo
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            // Load schedules, shift templates, and requests
            const [schedulesRes, templatesRes, requestsRes] = await Promise.all([
                getMySchedules(startStr, endStr),
                getShiftTemplates(),
                getMyShiftChangeRequests(),
            ]);

            if (schedulesRes) {
                const arr = Array.isArray(schedulesRes)
                    ? schedulesRes
                    : schedulesRes.data?.rows || schedulesRes.data?.list || schedulesRes.data || schedulesRes.schedules || schedulesRes.items || [];
                console.log('[ShiftChangeRequest] getMySchedules raw:', schedulesRes);
                console.log('[ShiftChangeRequest] parsed mySchedules length:', Array.isArray(arr) ? arr.length : 0);
                setMySchedules(Array.isArray(arr) ? arr : []);
            } else {
                console.warn('[ShiftChangeRequest] getMySchedules returned empty/falsey');
            }

            let templates = [];
            if (templatesRes?.err === 0) {
                templates = templatesRes.data || [];
                setShiftTemplates(templates);
            }

            if (requestsRes?.err === 0) {
                setRequests(requestsRes.data || []);
            }

            // Load all schedules in store to build complete list
            if (myStoreId) {
                const allSchedulesRes = await getSchedules(myStoreId, startStr, endStr);
                if (allSchedulesRes?.err === 0) {
                    const allSchedules = allSchedulesRes.data || [];
                    
                    // Filter out current user's schedules for available schedules
                    const available = allSchedules.filter((s) => {
                        const scheduleData = s.get ? s.get({ plain: true }) : s;
                        const scheduleUserId = scheduleData.user_id || scheduleData.employee?.user_id;
                        const scheduleStatus = scheduleData.status;
                        return scheduleUserId !== user.id && scheduleStatus === 'confirmed';
                    });
                    setAvailableSchedules(available);

                    // Tạo danh sách tất cả các ca có thể có (kể cả trống)
                    const allPossible = [];
                    
                    // Tạo tất cả các ca từ templates và dates
                    const startDate = new Date(startStr);
                    const endDate = new Date(endStr);
                    
                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        templates.forEach((template) => {
                            // Tìm xem ca này đã có schedule chưa
                            const existingSchedule = allSchedules.find((s) => {
                                const scheduleData = s.get ? s.get({ plain: true }) : s;
                                return scheduleData.work_date === dateStr && 
                                       (scheduleData.shift_template_id === template.shift_template_id || 
                                        scheduleData.shift_template_id === template.id);
                            });
                            
                            if (existingSchedule) {
                                const scheduleData = existingSchedule.get ? existingSchedule.get({ plain: true }) : existingSchedule;
                                // Chỉ thêm nếu không phải ca của user hiện tại
                                if ((scheduleData.user_id || scheduleData.employee?.user_id) !== user.id) {
                                    allPossible.push({
                                        schedule_id: scheduleData.schedule_id,
                                        work_date: dateStr,
                                        shift_template_id: template.shift_template_id || template.id,
                                        user_id: scheduleData.user_id || scheduleData.employee?.user_id,
                                        employee: scheduleData.employee || {},
                                        shiftTemplate: template,
                                        is_empty: false,
                                    });
                                }
                            } else {
                                // Ca trống - chưa có schedule
                                allPossible.push({
                                    schedule_id: null,
                                    work_date: dateStr,
                                    shift_template_id: template.shift_template_id || template.id,
                                    user_id: null,
                                    employee: null,
                                    shiftTemplate: template,
                                    is_empty: true,
                                });
                            }
                        });
                    }
                    
                    setAllPossibleShifts(allPossible);
                }
            }
        } catch (error) {
            ToastNotification.error('Không thể tải dữ liệu');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Helpers for grouping by week
    const getWeekStart = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = d.getDay(); // 0 Sun ... 6 Sat
        const diff = (day === 0 ? -6 : 1) - day; // move to Monday
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);
        return monday.toISOString().split('T')[0];
    };

    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    const weekOptions = useMemo(() => {
        // Chỉ cho phép chọn 4 tuần: 1 tuần hiện tại và 3 tuần trong tương lai
        const today = new Date();
        const currentWeekStart = getWeekStart(today.toISOString().split('T')[0]);
        
        const weeks = [];
        // Thêm tuần hiện tại
        weeks.push(currentWeekStart);
        
        // Thêm 3 tuần tiếp theo
        for (let i = 1; i <= 3; i++) {
            const nextWeek = new Date(currentWeekStart);
            nextWeek.setDate(nextWeek.getDate() + (i * 7));
            weeks.push(nextWeek.toISOString().split('T')[0]);
        }
        
        return weeks;
    }, []);

    const handleOpenDialog = async (schedule = null) => {
        if (schedule) {
            setFormData({
                request_type: 'swap',
                from_schedule_id: schedule.schedule_id,
                to_schedule_id: '',
                to_user_id: '',
                reason: '',
                swap_option: 'manual',
            });
        } else {
            setFormData({
                request_type: 'swap',
                from_schedule_id: '',
                to_schedule_id: '',
                to_user_id: '',
                reason: '',
                swap_option: 'manual',
            });
        }
        setSelectedWeek('');
        setOpenDialog(true);
        
        // Reload all possible shifts when dialog opens
        if (storeId && shiftTemplates.length > 0) {
            try {
                const today = new Date();
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 30);
                const startStr = today.toISOString().split('T')[0];
                const endStr = endDate.toISOString().split('T')[0];
                
                const allSchedulesRes = await getSchedules(storeId, startStr, endStr);
                if (allSchedulesRes?.err === 0) {
                    const allSchedules = allSchedulesRes.data || [];
                    
                    // Filter available schedules (có nhân viên khác)
                    const available = allSchedules.filter((s) => {
                        const scheduleData = s.get ? s.get({ plain: true }) : s;
                        const scheduleUserId = scheduleData.user_id || scheduleData.employee?.user_id;
                        const scheduleStatus = scheduleData.status;
                        return scheduleUserId !== user.id && scheduleStatus === 'confirmed';
                    });
                    setAvailableSchedules(available);

                    // Tạo danh sách tất cả các ca (kể cả trống)
                    const allPossible = [];
                    const startDate = new Date(startStr);
                    const endDateObj = new Date(endStr);
                    
                    for (let d = new Date(startDate); d <= endDateObj; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        shiftTemplates.forEach((template) => {
                            const existingSchedule = allSchedules.find((s) => {
                                const scheduleData = s.get ? s.get({ plain: true }) : s;
                                return scheduleData.work_date === dateStr && 
                                       (scheduleData.shift_template_id === template.shift_template_id || 
                                        scheduleData.shift_template_id === template.id);
                            });
                            
                            if (existingSchedule) {
                                const scheduleData = existingSchedule.get ? existingSchedule.get({ plain: true }) : existingSchedule;
                                if ((scheduleData.user_id || scheduleData.employee?.user_id) !== user.id) {
                                    allPossible.push({
                                        schedule_id: scheduleData.schedule_id,
                                        work_date: dateStr,
                                        shift_template_id: template.shift_template_id || template.id,
                                        user_id: scheduleData.user_id || scheduleData.employee?.user_id,
                                        employee: scheduleData.employee || {},
                                        shiftTemplate: template,
                                        is_empty: false,
                                    });
                                }
                            } else {
                                // Ca trống
                                allPossible.push({
                                    schedule_id: null,
                                    work_date: dateStr,
                                    shift_template_id: template.shift_template_id || template.id,
                                    user_id: null,
                                    employee: null,
                                    shiftTemplate: template,
                                    is_empty: true,
                                });
                            }
                        });
                    }
                    
                    setAllPossibleShifts(allPossible);
                }
            } catch (error) {
                console.error('Error loading available schedules:', error);
            }
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({
            request_type: 'swap',
            from_schedule_id: '',
            to_schedule_id: '',
            to_user_id: '',
            reason: '',
            swap_option: 'auto',
        });
    };

    const handleSubmit = async () => {
        if (!formData.from_schedule_id) {
            ToastNotification.error('Vui lòng chọn ca muốn đổi');
            return;
        }

        // Không cho phép tạo yêu cầu đổi ca cho ca của ngày hôm nay
        const fromSchedule = mySchedules.find((s) => s.schedule_id === parseInt(formData.from_schedule_id));
        if (fromSchedule) {
            const workDateStr = (fromSchedule.work_date || fromSchedule.workDate || '').slice(0, 10);
            const todayStr = new Date().toISOString().split('T')[0];
            if (workDateStr === todayStr) {
                ToastNotification.error('Không thể tạo yêu cầu đổi ca cho ca làm việc trong ngày hôm nay');
                return;
            }
        }

        // Kiểm tra nếu chọn option "manual" thì phải chọn ca/nhân viên
        if (formData.request_type === 'swap' && formData.swap_option === 'manual' && !formData.to_schedule_id) {
            ToastNotification.error('Vui lòng chọn ca muốn đổi với');
            return;
        }

        if ((formData.request_type === 'give_away' || formData.request_type === 'take_over') && formData.swap_option === 'manual' && !formData.to_user_id) {
            ToastNotification.error('Vui lòng chọn nhân viên');
            return;
        }

        try {
            const requestData = {
                store_id: storeId,
                from_schedule_id: formData.from_schedule_id,
                request_type: formData.request_type,
                reason: formData.reason || null,
            };

            // Chỉ thêm to_schedule_id hoặc to_user_id nếu chọn option manual
            if (formData.swap_option === 'manual') {
                if (formData.request_type === 'swap' && formData.to_schedule_id) {
                    // Nếu là ca trống (bắt đầu bằng "empty-"), gửi thông tin ca trống
                    if (formData.to_schedule_id.toString().startsWith('empty-')) {
                        // Parse thông tin từ format: "empty-{work_date}-{shift_template_id}"
                        // work_date format: YYYY-MM-DD (có 2 dấu -)
                        const str = formData.to_schedule_id.toString();
                        const match = str.match(/^empty-(.+)-(\d+)$/);
                        if (match) {
                            const workDate = match[1]; // YYYY-MM-DD
                            const shiftTemplateId = match[2];
                            // Gửi thông tin ca trống để quản lý tạo schedule mới
                            requestData.to_work_date = workDate;
                            requestData.to_shift_template_id = parseInt(shiftTemplateId);
                        }
                    } else {
                        requestData.to_schedule_id = parseInt(formData.to_schedule_id);
                    }
                } else if ((formData.request_type === 'give_away' || formData.request_type === 'take_over') && formData.to_user_id) {
                    requestData.to_user_id = parseInt(formData.to_user_id);
                }
            }

            const res = await createShiftChangeRequest(requestData);
            if (res.err === 0) {
                ToastNotification.success('Gửi yêu cầu thành công');
                handleCloseDialog();
                loadData();
            } else {
                ToastNotification.error(res.msg || 'Gửi yêu cầu thất bại');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra khi gửi yêu cầu');
            console.error(error);
        }
    };

    const selectedSchedule = useMemo(() => {
        return mySchedules.find((s) => s.schedule_id === parseInt(formData.from_schedule_id));
    }, [formData.from_schedule_id, mySchedules]);

    // Default pick first shift of the selected week (for current employee)
    useEffect(() => {
        if (!openDialog) return;
        if (formData.from_schedule_id) return; // user already picked
        // prefer selectedWeek; fallback to current week
        const todayKey = new Date().toISOString().split('T')[0];
        const weekStart = selectedWeek || getWeekStart(todayKey);
        const candidates = mySchedules
            .filter((s) => {
                // Chỉ lấy các ca có thể đổi (không phải absent hoặc checked_out)
                const canSwap = s.attendance_status !== 'absent' && s.attendance_status !== 'checked_out';
                return canSwap && getWeekStart(s.work_date || s.workDate) === weekStart;
            })
            .sort((a, b) => {
                const da = (a.work_date || a.workDate) || '';
                const db = (b.work_date || b.workDate) || '';
                if (da < db) return -1;
                if (da > db) return 1;
                const ta = a.shift_template_id || a.shiftTemplateId || 0;
                const tb = b.shift_template_id || b.shiftTemplateId || 0;
                return ta - tb;
            });
        if (candidates.length > 0) {
            setFormData((prev) => ({ ...prev, from_schedule_id: candidates[0].schedule_id }));
        }
    }, [openDialog, selectedWeek, mySchedules]);

    // Auto-sync selectedWeek with the week of the selected 'from' schedule
    useEffect(() => {
        if (!formData.from_schedule_id) return;
        const s = mySchedules.find((it) => it.schedule_id === parseInt(formData.from_schedule_id));
        if (!s) return;
        const wd = (s.work_date || s.workDate);
        const wStart = getWeekStart(wd);
        if (wStart && selectedWeek !== wStart) {
            setSelectedWeek(wStart);
        }
    }, [formData.from_schedule_id, mySchedules]);

    // Ensure a default selectedWeek exists when opening dialog or weeks load
    useEffect(() => {
        if (!openDialog) return;
        if (selectedWeek) return;
        const todayKey = new Date().toISOString().split('T')[0];
        const currentWeek = getWeekStart(todayKey);
        // Prefer week of currently selected 'from' schedule
        if (formData.from_schedule_id) {
            const s = mySchedules.find((it) => it.schedule_id === parseInt(formData.from_schedule_id));
            const wd = s && (s.work_date || s.workDate);
            const wStart = wd && getWeekStart(wd);
            if (wStart && weekOptions.includes(wStart)) {
                setSelectedWeek(wStart);
                return;
            }
        }
        // Else prefer current week if in list, fallback to first option
        if (weekOptions.includes(currentWeek)) setSelectedWeek(currentWeek);
        else if (weekOptions.length) setSelectedWeek(weekOptions[0]);
    }, [openDialog, weekOptions, formData.from_schedule_id, mySchedules]);

    const getScheduleLabel = (schedule) => {
        // Handle both Sequelize instances and plain objects
        const scheduleData = schedule.get ? schedule.get({ plain: true }) : schedule;
        const shiftTemplateId = scheduleData.shift_template_id || scheduleData.shiftTemplateId || scheduleData.shiftTemplate?.shift_template_id || scheduleData.shiftTemplate?.id;
        const template = scheduleData.shiftTemplate || shiftTemplates.find(
            (t) => t.shift_template_id === shiftTemplateId || t.id === shiftTemplateId
        );
        const workDate = scheduleData.work_date || scheduleData.workDate;
        const date = workDate ? formatDate(workDate) : '';
        const time = template
            ? `${formatTime(template.start_time)} - ${formatTime(template.end_time)}`
            : '';
        const employee = scheduleData.employee || {};
        const employeeId = scheduleData.user_id || scheduleData.userId || employee?.user_id || employee?.userId;
        const employeeName = employee.username || employee.email || (employeeId ? `NV#${employeeId}` : '');
        
        if (scheduleData.is_empty) {
            return `${date} - ${template?.name || 'Ca'} (${time}) - [Ca trống]`;
        }
        return `${date} - ${template?.name || 'Ca'} (${time})${employeeName ? ` - ${employeeName}` : ''}`;
    };

// Hiển thị option ca làm rõ ràng hơn (2 dòng + chip trạng thái)
const renderShiftOption = (shift, shiftTemplates) => {
    const scheduleData = shift.get ? shift.get({ plain: true }) : shift;
    const workDate = scheduleData.work_date || scheduleData.workDate;
    const shiftTemplateId =
        scheduleData.shift_template_id ||
        scheduleData.shiftTemplateId ||
        scheduleData.shiftTemplate?.shift_template_id ||
        scheduleData.shiftTemplate?.id;
    const template =
        scheduleData.shiftTemplate ||
        shiftTemplates.find((t) => t.shift_template_id === shiftTemplateId || t.id === shiftTemplateId);

    const dateLabel = workDate ? formatDate(workDate) : 'N/A';
    const timeLabel = template ? `${formatTime(template.start_time)} - ${formatTime(template.end_time)}` : 'N/A';
    const isEmpty = scheduleData.is_empty || !scheduleData.user_id;
    const employee = scheduleData.employee || {};
    const employeeName =
        employee.username ||
        employee.email ||
        scheduleData.user_id ||
        (scheduleData.userId ? `NV#${scheduleData.userId}` : '');

    return (
        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.25}>
            <Typography variant="body2" fontWeight={600}>
                {dateLabel} - {template?.name || 'Ca'} ({timeLabel})
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" color="text.secondary">
                    {isEmpty ? 'Ca trống' : employeeName}
                </Typography>
                <Chip
                    size="small"
                    label={isEmpty ? 'Ca trống' : 'Đã có nhân viên'}
                    color={isEmpty ? 'default' : 'info'}
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};

    // Ưu tiên hiển thị các ca chưa điểm danh lên trước
    // Chỉ cho phép đổi ca từ ngày mai trở đi (không cho đổi ca hôm nay)
    const sortedMySchedules = useMemo(() => {
        const priority = (status) => {
            // Chưa điểm danh hoặc không có trạng thái -> ưu tiên cao nhất
            if (!status || status === 'not_checked_in') return 0;
            return 1;
        };

        const todayStr = new Date().toISOString().split('T')[0];

        const baseList = [...mySchedules]
            .filter((s) => {
                const d = (s.work_date || s.workDate || '').slice(0, 10);
                // Chỉ lấy ca có ngày > hôm nay
                return d && d > todayStr;
            })
            .sort((a, b) => {
                const pa = priority(a.attendance_status);
                const pb = priority(b.attendance_status);
                if (pa !== pb) return pa - pb;
                // fallback theo ngày và ca để ổn định
                const da = a.work_date || a.workDate || '';
                const db = b.work_date || b.workDate || '';
                if (da !== db) return da.localeCompare(db);
                return (a.shift_template_id || 0) - (b.shift_template_id || 0);
            });
        // Nếu có chọn ngày filter, chỉ hiển thị ca đúng ngày đó
        if (filterDate) {
            return baseList.filter((s) => {
                const d = (s.work_date || s.workDate || '').slice(0, 10);
                return d === filterDate;
            });
        }
        return baseList;
    }, [mySchedules, filterDate]);

    // Định nghĩa cột cho bảng lịch làm việc
    const scheduleColumns = useMemo(() => [
        {
            accessorKey: 'index',
            header: 'STT',
            size: 60,
            Cell: ({ row }) => row.index + 1,
        },
        {
            accessorKey: 'work_date',
            header: 'Ngày',
            size: 120,
            Cell: ({ cell }) => formatDate(cell.getValue()),
        },
        {
            accessorKey: 'shift_template_id',
            header: 'Ca làm việc',
            size: 150,
            Cell: ({ row }) => {
                const schedule = row.original;
                const template = shiftTemplates.find(
                    (t) =>
                        t.shift_template_id === schedule.shift_template_id ||
                        t.id === schedule.shift_template_id
                );
                return template?.name || 'N/A';
            },
        },
        {
            accessorKey: 'time',
            header: 'Thời gian',
            size: 150,
            Cell: ({ row }) => {
                const schedule = row.original;
                const template = shiftTemplates.find(
                    (t) =>
                        t.shift_template_id === schedule.shift_template_id ||
                        t.id === schedule.shift_template_id
                );
                return template
                    ? `${formatTime(template.start_time)} - ${formatTime(template.end_time)}`
                    : 'N/A';
            },
        },
        {
            accessorKey: 'attendance_status',
            header: 'Trạng thái',
            size: 180,
            Cell: ({ row }) => {
                const schedule = row.original;
                const status = schedule.attendance_status;
                if (status) {
                    const label =
                        status === 'checked_in' ? 'Đã check-in (Đang làm việc)' :
                        status === 'checked_out' ? 'Đã kết ca' :
                        status === 'absent' ? 'Vắng mặt' :
                        'Chưa điểm danh';
                    const color =
                        status === 'checked_in' ? 'info' :
                        status === 'checked_out' ? 'success' :
                        status === 'absent' ? 'error' :
                        'default';
                    const variant = status !== 'not_checked_in' && status !== 'absent' ? 'filled' : 'outlined';
                    return (
                        <Chip
                            label={label}
                            size="small"
                            color={color}
                            variant={variant}
                        />
                    );
                } else {
                    return (
                        <Chip
                            label="Chưa điểm danh"
                            size="small"
                            color="default"
                            variant="outlined"
                        />
                    );
                }
            },
        },
    ], [shiftTemplates]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Yêu cầu đổi lịch làm việc
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Gửi yêu cầu đổi ca, nhường ca hoặc nhận ca từ nhân viên khác
            </Typography>

            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label="Lịch của tôi" />
                <Tab label="Yêu cầu đã gửi" />
            </Tabs>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {tabValue === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                                <Typography variant="h6">Lịch làm việc của tôi (30 ngày tới)</Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="Lọc theo ngày"
                                        InputLabelProps={{ shrink: true }}
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                    />
                                    {filterDate && (
                                        <SecondaryButton
                                            size="small"
                                            onClick={() => setFilterDate('')}
                                        >
                                            Xóa lọc
                                        </SecondaryButton>
                                    )}
                                </Box>
                            </Box>

                            {mySchedules.length === 0 ? (
                                <Alert severity="info">Bạn chưa có lịch làm việc nào</Alert>
                            ) : (
                                <MaterialReactTable
                                    columns={scheduleColumns}
                                    data={sortedMySchedules}
                                    enableRowActions
                                    positionActionsColumn="last"
                                    enableColumnActions={false}
                                    enableColumnFilters={false}
                                    enableSorting={true}
                                    enableTopToolbar={false}
                                    enableBottomToolbar={true}
                                    enablePagination={true}
                                    muiTableContainerProps={{
                                        sx: { maxHeight: '70vh' }
                                    }}
                                    muiTablePaperProps={{
                                        elevation: 0,
                                        sx: { boxShadow: 'none' }
                                    }}
                                    renderRowActions={({ row }) => {
                                        const schedule = row.original;
                                        const canSwap = schedule.attendance_status !== 'absent' && schedule.attendance_status !== 'checked_out';
                                        
                                        return (
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {canSwap ? (
                                                    <SecondaryButton
                                                        size="small"
                                                        startIcon={<Icon name="SwapHoriz" />}
                                                        onClick={() => handleOpenDialog(schedule)}
                                                    >
                                                        Đổi ca
                                                    </SecondaryButton>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', alignSelf: 'center' }}>
                                                        Không thể đổi
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    }}
                                    localization={{
                                        noRecordsToDisplay: 'Bạn chưa có lịch làm việc nào'
                                    }}
                                    initialState={{
                                        pagination: { pageSize: 10, pageIndex: 0 },
                                    }}
                                />
                            )}
                        </Box>
                    )}

                    {tabValue === 1 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Yêu cầu đã gửi ({requests.length})
                            </Typography>

                            {requests.length === 0 ? (
                                <Alert severity="info">Bạn chưa gửi yêu cầu nào</Alert>
                            ) : (
                                <Grid container spacing={2}>
                                    {requests.map((request) => {
                                        const fromSchedule = request.fromSchedule || {};
                                        const toSchedule = request.toSchedule || {};
                                        const fromTemplate = fromSchedule.shiftTemplate || {};
                                        const toTemplate = toSchedule.shiftTemplate || {};

                                        return (
                                            <Grid item xs={12} md={6} key={request.request_id}>
                                                <Card>
                                                    <CardContent>
                                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                                            <Typography variant="h6" fontWeight="bold">
                                                                {getRequestTypeLabel(request.request_type)}
                                                            </Typography>
                                                            <Chip
                                                                label={getStatusLabel(request.status)}
                                                                color={getStatusColor(request.status)}
                                                                size="small"
                                                            />
                                                        </Box>

                                                        <Divider sx={{ my: 2 }} />

                                                        <Box mb={2}>
                                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                Ca muốn đổi:
                                                            </Typography>
                                                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                                <CalendarToday fontSize="small" />
                                                                <Typography variant="body2">
                                                                    {formatDate(fromSchedule.work_date || '')} -{' '}
                                                                    {fromTemplate.name || 'N/A'} (
                                                                    {fromTemplate.start_time
                                                                        ? `${formatTime(fromTemplate.start_time)} - ${formatTime(fromTemplate.end_time)}`
                                                                        : 'N/A'}
                                                                    )
                                                                </Typography>
                                                            </Box>
                                                            {fromSchedule.attendance_status && (
                                                                <Box mt={1}>
                                                                    <Chip
                                                                        label={
                                                                            fromSchedule.attendance_status === 'checked_in' ? 'Đã check-in (Đang làm việc)' :
                                                                            fromSchedule.attendance_status === 'checked_out' ? 'Đã kết ca' :
                                                                            fromSchedule.attendance_status === 'absent' ? 'Vắng mặt' :
                                                                            'Chưa điểm danh'
                                                                        }
                                                                        size="small"
                                                                        color={
                                                                            fromSchedule.attendance_status === 'checked_in' ? 'info' :
                                                                            fromSchedule.attendance_status === 'checked_out' ? 'success' :
                                                                            fromSchedule.attendance_status === 'absent' ? 'error' :
                                                                            'default'
                                                                        }
                                                                        variant={fromSchedule.attendance_status !== 'not_checked_in' && fromSchedule.attendance_status !== 'absent' ? 'filled' : 'outlined'}
                                                                    />
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        {request.request_type === 'swap' && toSchedule.work_date && (
                                                            <Box mb={2}>
                                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                    Đổi với ca:
                                                                </Typography>
                                                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                                    <CalendarToday fontSize="small" />
                                                                    <Typography variant="body2">
                                                                        {formatDate(toSchedule.work_date)} -{' '}
                                                                        {toTemplate.name || 'N/A'} (
                                                                        {toTemplate.start_time
                                                                            ? `${formatTime(toTemplate.start_time)} - ${formatTime(toTemplate.end_time)}`
                                                                            : 'N/A'}
                                                                        )
                                                                    </Typography>
                                                                </Box>
                                                                {toSchedule.attendance_status && (
                                                                    <Box mt={1}>
                                                                        <Chip
                                                                            label={
                                                                                toSchedule.attendance_status === 'checked_in' ? 'Đã check-in (Đang làm việc)' :
                                                                                toSchedule.attendance_status === 'checked_out' ? 'Đã kết ca' :
                                                                                toSchedule.attendance_status === 'absent' ? 'Vắng mặt' :
                                                                                'Chưa điểm danh'
                                                                            }
                                                                            size="small"
                                                                            color={
                                                                                toSchedule.attendance_status === 'checked_in' ? 'info' :
                                                                                toSchedule.attendance_status === 'checked_out' ? 'success' :
                                                                                toSchedule.attendance_status === 'absent' ? 'error' :
                                                                                'default'
                                                                            }
                                                                            variant={toSchedule.attendance_status !== 'not_checked_in' && toSchedule.attendance_status !== 'absent' ? 'filled' : 'outlined'}
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        )}

                                                        {(request.request_type === 'give_away' ||
                                                            request.request_type === 'take_over') &&
                                                            request.toUser && (
                                                                <Box mb={2}>
                                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                        {request.request_type === 'give_away' ? 'Nhường cho' : 'Nhận từ'}:
                                                                    </Typography>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Person fontSize="small" />
                                                                        <Typography variant="body2">
                                                                            {request.toUser.username || request.toUser.email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            )}

                                                        {request.reason && (
                                                            <Box mb={2}>
                                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                    Lý do:
                                                                </Typography>
                                                                <Typography variant="body2">{request.reason}</Typography>
                                                            </Box>
                                                        )}

                                                        {request.review_notes && (
                                                            <Box mb={2}>
                                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                    Ghi chú từ quản lý:
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {request.review_notes}
                                                                </Typography>
                                                            </Box>
                                                        )}

                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Gửi lúc: {request.requested_at ? new Date(request.requested_at).toLocaleString('vi-VN') : 'N/A'}
                                                            </Typography>
                                                            {request.status === 'pending' && (
                                                                <DangerButton
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<Icon name="Cancel" />}
                                                                    onClick={async () => {
                                                                        if (window.confirm('Bạn có chắc muốn hủy yêu cầu này?')) {
                                                                            try {
                                                                                const res = await cancelShiftChangeRequest(request.request_id);
                                                                                if (res.err === 0) {
                                                                                    ToastNotification.success('Hủy yêu cầu thành công');
                                                                                    loadData();
                                                                                } else {
                                                                                    ToastNotification.error(res.msg || 'Hủy yêu cầu thất bại');
                                                                                }
                                                                            } catch (error) {
                                                                                ToastNotification.error('Có lỗi xảy ra khi hủy yêu cầu');
                                                                                console.error(error);
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    Hủy
                                                                </DangerButton>
                                                            )}
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Box>
                    )}
                </>
            )}

            {/* Create Request Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <SwapHoriz />
                        <Typography variant="h6">Tạo yêu cầu đổi ca</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Loại yêu cầu</InputLabel>
                            <Select
                                value={formData.request_type}
                                label="Loại yêu cầu"
                                onChange={(e) =>
                                    setFormData({ ...formData, request_type: e.target.value, to_schedule_id: '', to_user_id: '' })
                                }
                            >
                                <MenuItem value="swap">Đổi ca (Swap)</MenuItem>
                                <MenuItem value="give_away">Nhường ca (Give Away)</MenuItem>
                                <MenuItem value="take_over">Nhận ca (Take Over)</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel id="from-shift-label">Chọn ca muốn đổi *</InputLabel>
                            <Select
                                labelId="from-shift-label"
                                id="from-shift-select"
                                value={formData.from_schedule_id || ''}
                                displayEmpty
                                label="Chọn ca muốn đổi *"
                                onChange={(e) => setFormData({ ...formData, from_schedule_id: e.target.value })}
                            >
                                <MenuItem disabled value="">
                                    Chọn một ca của bạn...
                                </MenuItem>
                                {(() => {
                                    // Lọc bỏ các ca hôm nay và các ca đã vắng mặt / đã kết ca
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    const availableSchedules = mySchedules.filter((schedule) => {
                                        const d = (schedule.work_date || schedule.workDate || '').slice(0, 10);
                                        const notTodayOrPast = d && d > todayStr;
                                        const notFinished =
                                            schedule.attendance_status !== 'absent' &&
                                            schedule.attendance_status !== 'checked_out';
                                        return notTodayOrPast && notFinished;
                                    });
                                    
                                    if (availableSchedules.length === 0) {
                                        return (
                                            <MenuItem disabled value="__empty">
                                                Không có ca nào có thể đổi trong 30 ngày tới
                                            </MenuItem>
                                        );
                                    }
                                    
                                    return availableSchedules.map((schedule, idx) => (
                                        <MenuItem key={schedule.schedule_id || idx} value={schedule.schedule_id}>
                                            {getScheduleLabel(schedule)}
                                        </MenuItem>
                                    ));
                                })()}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {(() => {
                                    const availableSchedules = mySchedules.filter(
                                        (schedule) => schedule.attendance_status !== 'absent' && schedule.attendance_status !== 'checked_out'
                                    );
                                    return `Tìm thấy ${availableSchedules.length} ca có thể đổi trong 30 ngày tới`;
                                })()}
                            </Typography>
                        </FormControl>

                        {formData.request_type === 'swap' && (
                            <>
                                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Chọn cách đổi ca:
                                    </Typography>
                                    <RadioGroup
                                        value={formData.swap_option}
                                        onChange={(e) => setFormData({ ...formData, swap_option: e.target.value, to_schedule_id: '' })}
                                        row
                                    >
                                        <FormControlLabel value="manual" control={<Radio />} label="Chọn ca muốn đổi" />
                                        <FormControlLabel value="auto" control={<Radio />} label="Để quản lý tự phân công" />
                                    </RadioGroup>
                                </FormControl>

                                {formData.swap_option === 'manual' && (
                                    <>
                                        <FormControl fullWidth sx={{ mb: 2 }}>
                                            <InputLabel id="week-label">Chọn tuần</InputLabel>
                                            <Select
                                                labelId="week-label"
                                                value={selectedWeek}
                                                label="Chọn tuần"
                                                onChange={(e) => { setSelectedWeek(e.target.value); setFormData({ ...formData, to_schedule_id: '' }); }}
                                            >
                                                {weekOptions.length === 0 ? (
                                                    <MenuItem disabled value="">
                                                        Chưa có tuần nào trong phạm vi
                                                    </MenuItem>
                                                ) : (
                                                    weekOptions.map((w) => {
                                                        const monday = new Date(w);
                                                        const end = new Date(monday);
                                                        end.setDate(end.getDate() + 6);
                                                        const weekNo = getWeekNumber(monday);
                                                        const label = `Tuần ${weekNo} (${formatDate(monday)} - ${formatDate(end)})`;
                                                        return (
                                                            <MenuItem key={w} value={w}>{label}</MenuItem>
                                                        );
                                                    })
                                                )}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth sx={{ mb: 2 }} disabled={!selectedWeek}>
                                            <InputLabel>Chọn ca muốn đổi với *</InputLabel>
                                            <Select
                                                value={formData.to_schedule_id || ''}
                                                label="Chọn ca muốn đổi với *"
                                                onChange={(e) => setFormData({ ...formData, to_schedule_id: e.target.value || null })}
                                            >
                                                {!selectedWeek ? (
                                                    <MenuItem disabled value="">
                                                        Vui lòng chọn tuần trước
                                                    </MenuItem>
                                                ) : (
                                                    allPossibleShifts
                                                        .filter((shift) => getWeekStart(shift.work_date || shift.workDate) === selectedWeek)
                                                        .map((shift, index) => {
                                                            const key = shift.schedule_id || `empty-${shift.work_date}-${shift.shift_template_id}-${index}`;
                                                            const value = shift.schedule_id || `empty-${shift.work_date}-${shift.shift_template_id}`;
                                                            return (
                                                                <MenuItem key={key} value={value}>
                                                                    {renderShiftOption(shift, shiftTemplates)}
                                                                </MenuItem>
                                                            );
                                                        })
                                                )}
                                            </Select>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                Danh sách bao gồm cả ca trống và ca đã có nhân viên. Hãy chọn tuần trước.
                                            </Typography>
                                        </FormControl>
                                    </>
                                )}
                            </>
                        )}

                        {formData.request_type === 'give_away' && (
                            <>
                                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Chọn cách nhường ca:
                                    </Typography>
                                    <RadioGroup
                                        value={formData.swap_option}
                                        onChange={(e) => setFormData({ ...formData, swap_option: e.target.value, to_user_id: '' })}
                                        row
                                    >
                                        <FormControlLabel value="auto" control={<Radio />} label="Để quản lý tự phân công" />
                                        <FormControlLabel value="manual" control={<Radio />} label="Chọn nhân viên nhận ca" />
                                    </RadioGroup>
                                </FormControl>

                                {formData.swap_option === 'manual' && (
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Chọn nhân viên nhận ca *</InputLabel>
                                        <Select
                                            value={formData.to_user_id}
                                            label="Chọn nhân viên nhận ca *"
                                            onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                                        >
                                            {(() => {
                                                const uniqueEmployees = availableSchedules.reduce((acc, schedule) => {
                                                    const scheduleData = schedule.get ? schedule.get({ plain: true }) : schedule;
                                                    const userId = scheduleData.user_id || scheduleData.employee?.user_id;
                                                    const employee = scheduleData.employee || {};
                                                    if (userId && !acc.find((u) => u.user_id === userId)) {
                                                        acc.push({
                                                            user_id: userId,
                                                            username: employee.username || `NV#${userId}`,
                                                            email: employee.email,
                                                        });
                                                    }
                                                    return acc;
                                                }, []);
                                                
                                                if (uniqueEmployees.length === 0) {
                                                    return (
                                                        <MenuItem disabled value="">
                                                            Không có nhân viên nào
                                                        </MenuItem>
                                                    );
                                                }
                                                
                                                return uniqueEmployees.map((emp) => (
                                                    <MenuItem key={emp.user_id} value={emp.user_id}>
                                                        {emp.username} {emp.email ? `(${emp.email})` : ''}
                                                    </MenuItem>
                                                ));
                                            })()}
                                        </Select>
                                    </FormControl>
                                )}
                            </>
                        )}

                        {formData.request_type === 'take_over' && (
                            <>
                                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Chọn cách nhận ca:
                                    </Typography>
                                    <RadioGroup
                                        value={formData.swap_option}
                                        onChange={(e) => setFormData({ ...formData, swap_option: e.target.value, to_user_id: '' })}
                                        row
                                    >
                                        <FormControlLabel value="auto" control={<Radio />} label="Để quản lý tự phân công" />
                                        <FormControlLabel value="manual" control={<Radio />} label="Chọn nhân viên nhường ca" />
                                    </RadioGroup>
                                </FormControl>

                                {formData.swap_option === 'manual' && (
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Chọn nhân viên nhường ca *</InputLabel>
                                        <Select
                                            value={formData.to_user_id}
                                            label="Chọn nhân viên nhường ca *"
                                            onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                                        >
                                            {(() => {
                                                const uniqueEmployees = availableSchedules.reduce((acc, schedule) => {
                                                    const scheduleData = schedule.get ? schedule.get({ plain: true }) : schedule;
                                                    const userId = scheduleData.user_id || scheduleData.employee?.user_id;
                                                    const employee = scheduleData.employee || {};
                                                    if (userId && !acc.find((u) => u.user_id === userId)) {
                                                        acc.push({
                                                            user_id: userId,
                                                            username: employee.username || `NV#${userId}`,
                                                            email: employee.email,
                                                        });
                                                    }
                                                    return acc;
                                                }, []);
                                                
                                                if (uniqueEmployees.length === 0) {
                                                    return (
                                                        <MenuItem disabled value="">
                                                            Không có nhân viên nào
                                                        </MenuItem>
                                                    );
                                                }
                                                
                                                return uniqueEmployees.map((emp) => (
                                                    <MenuItem key={emp.user_id} value={emp.user_id}>
                                                        {emp.username} {emp.email ? `(${emp.email})` : ''}
                                                    </MenuItem>
                                                ));
                                            })()}
                                        </Select>
                                    </FormControl>
                                )}
                            </>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Lý do (tùy chọn)"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            sx={{ mb: 2 }}
                            placeholder="Nhập lý do bạn muốn đổi ca..."
                        />

                        {selectedSchedule && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    <strong>Ca đã chọn:</strong> {getScheduleLabel(selectedSchedule)}
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={handleCloseDialog}>Hủy</SecondaryButton>
                    <PrimaryButton onClick={handleSubmit} startIcon={<Icon name="Send" />}>
                        Gửi yêu cầu
                    </PrimaryButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ShiftChangeRequest;

