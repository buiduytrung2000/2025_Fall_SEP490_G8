// src/pages/Employee/MySchedule.js
import React, { useState, useEffect, useMemo } from 'react';
import { getSchedules, getStaff } from '../../api/mockApi';
import { useAuth } from '../../contexts/AuthContext'; // Dùng để biết ai đang đăng nhập

// Import các component từ Material-UI (MUI)
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Box, CircularProgress, IconButton
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

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
const shiftNames = ['Ca Sáng (06:00 - 14:00)', 'Ca Tối (14:00 - 22:00)'];
// --- HẾT HÀM HELPER ---

const MySchedule = () => {
    const [currentDate, setCurrentDate] = useState(new Date('2025-10-23T10:00:00')); // Tuần 43
    const [schedule, setSchedule] = useState({});
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const { user } = useAuth(); // Lấy thông tin user đang đăng nhập
    const [myStaffId, setMyStaffId] = useState(null);

    // Tính toán các biến ngày tháng
    const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
    const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)), [startOfWeek]);
    
    const staffMap = useMemo(() => {
        return staffList.reduce((acc, staff) => {
            acc[staff.id] = staff.name;
            return acc;
        }, {});
    }, [staffList]);

    // useEffect để tải dữ liệu
    useEffect(() => {
        setLoading(true);
        Promise.all([getSchedules(startOfWeek), getStaff()])
            .then(([scheduleData, staffData]) => {
                setSchedule(scheduleData);
                setStaffList(staffData);

                // Tìm ID của nhân viên đang đăng nhập
                const currentUser = staffData.find(staff => staff.name === user.name);
                if (currentUser) {
                    setMyStaffId(currentUser.id);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [startOfWeek, user.name]); // Thêm user.name vào dependencies

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
                <IconButton onClick={handlePrevWeek}><ChevronLeft /></IconButton>
                <Typography variant="h6" sx={{ mx: 2 }}>
                    Tuần {getWeekNumber(currentDate)} ({formatDate(startOfWeek)} - {formatDate(endOfWeek)})
                </Typography>
                <IconButton onClick={handleNextWeek}><ChevronRight /></IconButton>
            </Box>
            
            {/* --- Bảng lịch --- */}
            <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <Table sx={{ minWidth: 650, borderCollapse: 'collapse' }} aria-label="schedule table">
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', border: '1px solid #e0e0e0', width: '150px' }}>
                                    CA LÀM VIỆC
                                </TableCell>
                                {weekDays.map((day, index) => (
                                    <TableCell key={index} align="center" sx={{ fontWeight: 'bold', fontSize: '1rem', border: '1px solid #e0e0e0' }}>
                                        {weekDayNames[index]} ({formatDate(day)})
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shiftNames.map(shiftName => (
                                <TableRow key={shiftName}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 500, border: '1px solid #e0e0e0' }}>
                                        {shiftName}
                                    </TableCell>
                                    
                                    {weekDays.map((day) => {
                                        const dayKey = day.toISOString().split('T')[0];
                                        const shiftData = schedule[dayKey] ? schedule[dayKey][shiftName] : null;
                                        
                                        // Kiểm tra xem ca này có phải của tôi không
                                        const isMyShift = (shiftData && shiftData.employeeId === myStaffId);

                                        return (
                                            <TableCell 
                                                key={dayKey} 
                                                align="center" 
                                                sx={{ 
                                                    border: '1px solid #e0e0e0', 
                                                    p: 2,
                                                    // Đánh dấu ca của mình
                                                    backgroundColor: isMyShift ? '#e7f0ff' : 'inherit',
                                                    fontWeight: isMyShift ? 'bold' : 'normal',
                                                    color: isMyShift ? '#0a58ca' : 'inherit'
                                                }}
                                            >
                                                {isMyShift ? "CÓ LỊCH" : "-"}
                                            </TableCell>
                                        );
                                    })}
                                 </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Box>
    );
};

export default MySchedule;