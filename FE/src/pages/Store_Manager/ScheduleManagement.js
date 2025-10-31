// src/pages/Manager/ScheduleManagement.js
// GHI ĐÈ TOÀN BỘ FILE NÀY

import React, { useState, useEffect, useMemo } from 'react';
import { getSchedules, getStaff } from '../../api/mockApi';
import ChangeShiftModal from './ChangeShiftModal';
// KHÔNG import useNavigate nữa

// Import các component từ Material-UI (MUI)
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Typography, Box, CircularProgress, IconButton, Tooltip, Chip
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, AddCircleOutline
} from '@mui/icons-material';

// --- HÀM HELPER VỀ NGÀY THÁNG (Giữ nguyên) ---
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
const getMonthYear = (date) => {
  return date.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }).toUpperCase();
};
const weekDayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const shiftNames = ['Ca Sáng (06:00 - 14:00)', 'Ca Tối (14:00 - 22:00)'];
// --- HẾT HÀM HELPER ---


const ScheduleManagement = () => {
  const [currentDate] = useState(new Date('2025-10-23T10:00:00')); // Tuần 43 (hardcode demo)
  const [schedule, setSchedule] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // Các hook useMemo giữ nguyên để tính toán ngày
  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)), [startOfWeek]);
  const staffMap = useMemo(() => {
    return staffList.reduce((acc, staff) => { acc[staff.id] = staff.name; return acc; }, {});
  }, [staffList]);

  // useEffect để tải dữ liệu (giữ nguyên)
  useEffect(() => {
    setLoading(true);
    Promise.all([getSchedules(startOfWeek), getStaff()])
      .then(([scheduleData, staffData]) => {
        setSchedule(scheduleData);
        setStaffList(staffData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [startOfWeek]);

  // --- Hàm xử lý Modal (Logic y hệt trước, không đổi) ---
  const handleOpenModal = (dayKey, shiftName, shiftData) => {
    setSelectedShift({ dayKey, shiftName, employeeId: shiftData ? shiftData.employeeId : '' });
    setShowModal(true);
  };
  const handleCloseModal = () => setShowModal(false);
  const handleSaveShift = (newEmployeeId) => {
    const { dayKey, shiftName } = selectedShift;
    setSchedule(prevSchedule => ({
      ...prevSchedule,
      [dayKey]: {
        ...prevSchedule[dayKey],
        [shiftName]: {
          ...prevSchedule[dayKey][shiftName],
          employeeId: newEmployeeId,
          status: 'Confirmed'
        }
      }
    }));
    handleCloseModal();
  };

  // --- THAY ĐỔI: Tắt chức năng các nút bấm ---
  const handleSaveSchedule = () => {
    console.log("Chức năng 'Lưu' chưa được kích hoạt.");
  };
  const handleAddStaffClick = () => {
    console.log("Chức năng 'Thêm Nhân viên' chưa được kích hoạt.");
  };

  return (
    <Box sx={{ px: { xs: 1, md: 4 }, py: 3 }}>
      {/* Tiêu đề và subtitle */}
      <Typography variant="h4" fontWeight={700} mb={1} letterSpacing={1}>
        Quản lý lịch làm việc
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Theo dõi, phân công lịch cho nhân viên cửa hàng – thao tác trực quan, dễ nhìn!
      </Typography>

      {/* Thanh chọn tuần (có thể nâng cấp chuyển tuần sau) */}
      <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
        <Tooltip title="Tuần trước" arrow><span><IconButton disabled><ChevronLeft /></IconButton></span></Tooltip>
        <Typography variant="h6" sx={{ mx: 2 }}>
          Tuần 43 ({formatDate(startOfWeek)} - {formatDate(endOfWeek)})
        </Typography>
        <Tooltip title="Tuần sau" arrow><span><IconButton disabled><ChevronRight /></IconButton></span></Tooltip>
      </Box>

      {/* Bảng lịch hiện đại */}
      <TableContainer component={Paper} sx={{ boxShadow: 5, borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <Table sx={{ minWidth: 900, bgcolor: '#fcfcfc',
            '& .MuiTableCell-root': {
              border: '1.5px solid #dde6ed',
              borderRadius: 2,
            },
            '& .MuiTableHead-root .MuiTableCell-root': {
              background: '#ecf4fa',
              fontWeight: 800,
              letterSpacing: 1,
            },
          }}
          aria-label="schedule table">
            <TableHead>
              <TableRow>
                <TableCell align="center">
                  Ca làm việc
                </TableCell>
                {weekDays.map((day, index) => (
                  <TableCell key={index} align="center">
                    {weekDayNames[index]}<br />({formatDate(day)})
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shiftNames.map(shiftName => (
                <TableRow hover key={shiftName}>
                  <TableCell align="left" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>{shiftName}</TableCell>
                  {weekDays.map((day) => {
                    const dayKey = day.toISOString().split('T')[0];
                    const shiftData = schedule[dayKey] ? schedule[dayKey][shiftName] : null;
                    const employeeName = shiftData ? (staffMap[shiftData.employeeId] || 'Trống') : 'Trống';
                    const status = shiftData ? shiftData.status : 'Empty';
                    let chipColor = 'default', chipLabel = '';
                    if (!shiftData || employeeName === 'Trống') { chipColor = 'default'; chipLabel = 'Chưa phân'; }
                    else if (status === 'Confirmed') { chipColor = 'success'; chipLabel = 'Đã xác nhận'; }
                    else { chipColor = 'warning'; chipLabel = 'Nháp'; }

                    // Phân biệt button và tooltip
                    const isEmpty = !shiftData || employeeName === 'Trống';
                    const btnLabel = isEmpty ? 'Thêm' : 'Đổi nhân viên';
                    const btnColor = isEmpty ? 'primary' : 'warning';
                    const tooltip = isEmpty
                      ? 'Thêm nhân viên cho ca này'
                      : `Đổi người trực ca (${employeeName})`;
                    return (
                      <TableCell key={dayKey} align="center">
                        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1} width="100%">
                            <Typography fontWeight={500} variant="body1" noWrap sx={{ maxWidth: 108, flex: 1, textAlign: 'right' }}>
                              {employeeName}
                            </Typography>
                            <Chip size="small" color={chipColor} label={chipLabel} variant={chipColor === 'default' ? 'outlined' : 'filled'} />
                          </Box>
                          <Tooltip title={tooltip} arrow>
                            <Button
                              variant={isEmpty ? "contained" : "outlined"}
                              color={btnColor}
                              size="small"
                              sx={{ borderRadius: 2, minWidth: 36, px: 1, py: 0.3, mt: 0.5, fontWeight: 700, boxShadow: 0 }}
                              onClick={() => handleOpenModal(dayKey, shiftName, shiftData)}
                              startIcon={<AddCircleOutline />}
                            >
                              {btnLabel}
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Modal chọn nhân viên/Chỉnh ca */}
      {staffList.length > 0 && (
        <ChangeShiftModal
          show={showModal}
          onHide={handleCloseModal}
          onSave={handleSaveShift}
          shiftInfo={selectedShift}
          staffList={staffList.filter(s => s.role === 'Cashier')}
        />
      )}
      {/*
        Ghi chú phát triển:
        - Đã đổi UI: bảng hiện đại, chip trạng thái, nút thêm đẹp hơn.
        - Modal/phân ca giữ nguyên logic, chỉ đổi style. Có thể tuỳ biến thêm filter, multi-user, tìm kiếm nếu cần.
      */}
    </Box>
  );
};

export default ScheduleManagement;