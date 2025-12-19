// src/pages/Employee/MySchedule.js
import React, { useState, useEffect, useMemo } from 'react';
import { getMySchedules, getShiftTemplates } from '../../api/scheduleApi';

// Import các component từ Material-UI (MUI)
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Box, CircularProgress, Chip, Tooltip
} from '@mui/material';
import { ActionButton, Icon } from '../../components/common';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';

// --- HÀM HELPER VỀ NGÀY THÁNG (Copy từ ScheduleManagement) ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};
const formatDate = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
};
const weekDayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

const fallbackShiftTemplates = [
    { id: 'default-morning', label: 'Ca Sáng (06:00 - 14:00)' },
    { id: 'default-afternoon', label: 'Ca Chiều (14:00 - 22:00)' },
    { id: 'default-night', label: 'Ca Đêm (22:00 - 06:00)' }
];

const formatShiftLabel = (template) => {
    if (!template) return '';
    const start = template.start_time ? template.start_time.slice(0, 5) : '??';
    const end = template.end_time ? template.end_time.slice(0, 5) : '??';
    return `${template.name || 'Ca'} (${start} - ${end})`;
};
const toLocalDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
// --- HẾT HÀM HELPER ---

const MySchedule = () => {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [schedule, setSchedule] = useState({});
    const [shiftTemplates, setShiftTemplates] = useState(fallbackShiftTemplates);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tính toán các biến ngày tháng
    const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
    const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)), [startOfWeek]);
    
    // Build schedule grid: { [date]: { [shiftTemplateId]: { mine: true } } }

    useEffect(() => {
        let mounted = true;

        getShiftTemplates()
            .then(res => {
                if (!mounted) return;
                if (res && res.err === 0) {
                    const templates = (res.data || []).map(t => ({
                        id: String(t.shift_template_id),
                        label: formatShiftLabel(t)
                    }));
                    if (templates.length) {
                        setShiftTemplates(templates);
                    }
                }
            })
            .catch(() => {
                // Giữ fallback nếu lỗi
            });

        return () => {
            mounted = false;
        };
    }, []);

    // useEffect để tải dữ liệu
    useEffect(() => {
        const start = toLocalDateKey(startOfWeek);
        const end = toLocalDateKey(endOfWeek);
        setLoading(true);
        getMySchedules(start, end)
            .then(res => {
                if (res && res.err === 0) {
                    const rows = res.data || [];
                    const grid = {};
                    const scheduleTemplates = new Map();
                    rows.forEach(r => {
                        const dateKey = r.work_date;
                        const templateId = String(r.shift_template_id || r.shiftTemplate?.shift_template_id || '');
                        if (!grid[dateKey]) grid[dateKey] = {};
                        if (templateId) {
                            // Lấy thông tin shift (thời gian làm việc) từ shifts array
                            const shift = r.shifts && r.shifts.length > 0 ? r.shifts[0] : null;
                            let workMinutes = null;
                            if (shift?.opened_at && shift?.closed_at) {
                                const opened = new Date(shift.opened_at);
                                const closed = new Date(shift.closed_at);
                                if (!isNaN(opened.getTime()) && !isNaN(closed.getTime()) && closed > opened) {
                                    workMinutes = Math.floor((closed - opened) / 60000);
                                }
                            }
                            
                            grid[dateKey][templateId] = { 
                                mine: true,
                                attendance_status: r.attendance_status || 'not_checked_in',
                                schedule_id: r.schedule_id,
                                work_minutes: workMinutes
                            };
                            if (r.shiftTemplate) {
                                scheduleTemplates.set(templateId, formatShiftLabel(r.shiftTemplate));
                            }
                        }
                    });
                    if (scheduleTemplates.size) {
                        setShiftTemplates(prev => {
                            const existingIds = new Set(prev.map(t => t.id));
                            const additions = [];
                            scheduleTemplates.forEach((label, id) => {
                                if (!existingIds.has(id)) {
                                    additions.push({ id, label });
                                }
                            });
                            return additions.length ? [...prev, ...additions] : prev;
                        });
                    }
                    setSchedule(grid);
                    setError(null);
                } else {
                    setShiftTemplates(prev => prev.length ? prev : fallbackShiftTemplates);
                    setSchedule({});
                    setError(res?.msg || 'Không thể tải lịch làm việc.');
                }
            })
            .catch(() => {
                setShiftTemplates(prev => prev.length ? prev : fallbackShiftTemplates);
                setSchedule({});
                setError('Có lỗi xảy ra khi tải lịch làm việc.');
            })
            .finally(() => setLoading(false));
    }, [startOfWeek, endOfWeek]);

    const hasSchedules = useMemo(() => {
        return shiftTemplates.some(shift => {
            return weekDays.some(day => {
                const dayKey = toLocalDateKey(day);
                return !!(schedule[dayKey] && schedule[dayKey][shift.id]);
            });
        });
    }, [shiftTemplates, weekDays, schedule]);

    // --- Hàm cho các nút bấm (cho phép xem tuần khác) ---
    const handlePrevWeek = () => {
        setCurrentDate(addDays(currentDate, -7));
    };
    const handleNextWeek = () => {
        setCurrentDate(addDays(currentDate, 7));
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 2 }}>
                Lịch làm việc của tôi
            </Typography>

            {/* --- Bộ chọn tuần --- */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                <ActionButton
                  icon={<Icon name="ArrowBack" />}
                  onClick={handlePrevWeek}
                />
                <Typography variant="h6" sx={{ mx: 2 }}>
                    Tuần {getWeekNumber(currentDate)} ({formatDate(startOfWeek)} - {formatDate(endOfWeek)})
                </Typography>
                <ActionButton
                  icon={<Icon name="ArrowForward" />}
                  onClick={handleNextWeek}
                />
            </Box>
            
            {/* --- Bảng lịch --- */}
            <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {!hasSchedules && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="body1">
                                    {error || 'Bạn chưa có lịch làm việc trong tuần này.'}
                                </Typography>
                            </Box>
                        )}
                        <Table sx={{ minWidth: 650, borderCollapse: 'collapse' }} aria-label="schedule table">
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', border: '1px solid #e0e0e0', width: '150px' }}>
                                        CA LÀM VIỆC
                                    </TableCell>
                                    {weekDays.map((day, index) => (
                                        <TableCell
                                            key={index}
                                            align="center"
                                            sx={{ fontWeight: 'bold', fontSize: '1rem', border: '1px solid #e0e0e0' }}
                                        >
                                            {weekDayNames[index]} ({formatDate(day)})
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shiftTemplates.map(shift => (
                                    <TableRow key={shift.id}>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 500, border: '1px solid #e0e0e0' }}>
                                            {shift.label}
                                        </TableCell>

                                        {weekDays.map(day => {
                                            const dayKey = toLocalDateKey(day);
                                            const shiftData = schedule[dayKey] ? schedule[dayKey][shift.id] : null;
                                            const isMyShift = !!shiftData;
                                            const attendanceStatus = shiftData?.attendance_status || 'not_checked_in';
                                            const workMinutes = shiftData?.work_minutes || null;

                                            // Hàm lấy label và màu cho trạng thái điểm danh
                                            const getAttendanceInfo = (status) => {
                                                switch (status) {
                                                    case 'checked_in':
                                                        return { label: 'Đã check-in (Đang làm việc)', color: 'info' };
                                                    case 'checked_out':
                                                        return { label: 'Đã kết ca', color: 'success' };
                                                    case 'absent':
                                                        return { label: 'Vắng mặt', color: 'error' };
                                                    case 'not_checked_in':
                                                    default:
                                                        return { label: 'Chưa điểm danh', color: 'default' };
                                                }
                                            };

                                            // Format số phút làm việc thành giờ - phút
                                            const formatWorkTime = (minutes) => {
                                                if (!minutes || minutes <= 0) return null;
                                                const hours = Math.floor(minutes / 60);
                                                const mins = minutes % 60;
                                                return hours > 0 
                                                    ? `${hours} giờ ${mins} phút`
                                                    : `${mins} phút`;
                                            };

                                            const attendanceInfo = getAttendanceInfo(attendanceStatus);
                                            const workTimeText = formatWorkTime(workMinutes);

                                            return (
                                                <TableCell
                                                    key={dayKey}
                                                    align="center"
                                                    sx={{
                                                        border: '1px solid #e0e0e0',
                                                        p: 2,
                                                        backgroundColor: isMyShift ? '#e7f0ff' : 'inherit',
                                                        fontWeight: isMyShift ? 'bold' : 'normal',
                                                        color: isMyShift ? '#0a58ca' : 'inherit'
                                                    }}
                                                >
                                                    {isMyShift ? (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                CÓ LỊCH
                                                            </Typography>
                                                            <Tooltip title={attendanceInfo.label} arrow>
                                                                <Chip
                                                                    icon={attendanceStatus !== 'not_checked_in' && attendanceStatus !== 'absent' ? <CheckCircle /> : <RadioButtonUnchecked />}
                                                                    label={
                                                                        attendanceStatus === 'checked_in' ? 'Đang làm việc' :
                                                                        attendanceStatus === 'checked_out' ? 'Đã kết ca' :
                                                                        attendanceStatus === 'absent' ? 'Vắng mặt' :
                                                                        'Chưa điểm danh'
                                                                    }
                                                                    size="small"
                                                                    color={attendanceInfo.color}
                                                                    variant={attendanceStatus !== 'not_checked_in' && attendanceStatus !== 'absent' ? 'filled' : 'outlined'}
                                                                    sx={{ height: 22, fontSize: '0.7rem' }}
                                                                />
                                                            </Tooltip>
                                                            {attendanceStatus === 'checked_out' && workTimeText && (
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        color: 'success.main', 
                                                                        fontWeight: 600,
                                                                        fontSize: '0.65rem',
                                                                        mt: 0.5
                                                                    }}
                                                                >
                                                                    Thời gian làm: {workTimeText}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    ) : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </TableContainer>
        </Box>
    );
};

export default MySchedule;