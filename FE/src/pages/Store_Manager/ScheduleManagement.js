// src/pages/Manager/ScheduleManagement.js
// GHI ĐÈ TOÀN BỘ FILE NÀY

import React, { useState, useEffect, useMemo } from 'react';
import { getSchedules as apiGetSchedules, getShiftTemplates, createSchedule, updateSchedule, getAvailableEmployees } from '../../api/scheduleApi';
import { fetchEmployees, fetchEmployeeById } from '../../api/employeeApi';
import ChangeShiftModal from './ChangeShiftModal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
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
// Will be replaced by templates from backend
const defaultShiftNames = ['Ca Sáng (06:00 - 14:00)', 'Ca Tối (14:00 - 22:00)'];
// --- HẾT HÀM HELPER ---


const ScheduleManagement = () => {
  const [currentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({}); // { [date]: { [templateId]: { schedule_id, user_id, status } } }
  const [staffList, setStaffList] = useState([]); // employees in store (cashiers)
  const [shiftTemplatesData, setShiftTemplatesData] = useState([]); // raw templates
  const [shiftNames, setShiftNames] = useState(defaultShiftNames);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const { user } = useAuth();

  // Các hook useMemo giữ nguyên để tính toán ngày
  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)), [startOfWeek]);
  const staffMap = useMemo(() => {
    return staffList.reduce((acc, staff) => { acc[staff.id] = staff.name; return acc; }, {});
  }, [staffList]);

  const formatShiftName = (t) => `${t.name} (${t.start_time?.slice(0,5)} - ${t.end_time?.slice(0,5)})`;

  // useEffect để tải dữ liệu (giữ nguyên)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // 1) find manager's store
        const me = await fetchEmployeeById(user.id);
        const myStoreId = me?.data?.store_id || me?.data?.store?.store_id;
        if (!myStoreId) {
          toast.error('Manager chưa gán cửa hàng');
          setLoading(false);
          return;
        }
        setStoreId(myStoreId);

        // 2) fetch shift templates and employees of store
        const [tplRes, empRes] = await Promise.all([
          getShiftTemplates(),
          fetchEmployees({ store_id: myStoreId, role: 'Cashier', limit: 200 })
        ]);
        const templates = (tplRes?.data || []);
        setShiftTemplatesData(templates);
        setShiftNames(templates.length ? templates.map(formatShiftName) : defaultShiftNames);

        const employees = (empRes?.data || []).map(u => ({ id: u.user_id, name: u.name || u.username }));
        setStaffList(employees);

        // 3) fetch schedules for this week
        const start = startOfWeek.toISOString().split('T')[0];
        const end = endOfWeek.toISOString().split('T')[0];
        const schRes = await apiGetSchedules(myStoreId, start, end);
        const rows = schRes?.data || [];
        const grid = {};
        rows.forEach(r => {
          const dateKey = r.work_date;
          if (!grid[dateKey]) grid[dateKey] = {};
          grid[dateKey][r.shift_template_id] = {
            schedule_id: r.schedule_id,
            user_id: r.user_id,
            status: r.status,
          };
        });
        setSchedule(grid);
      } catch (e) {
        toast.error('Tải dữ liệu lịch thất bại');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [startOfWeek]);

  // --- Hàm xử lý Modal (Logic y hệt trước, không đổi) ---
  const handleOpenModal = async (dayKey, templateId, shiftData) => {
    setSelectedShift({ dayKey, templateId, employeeId: shiftData ? shiftData.user_id : '' , scheduleId: shiftData?.schedule_id});
    // fetch available employees for this slot
    try {
      if (storeId) {
        const res = await getAvailableEmployees(storeId, dayKey, templateId, 'Cashier');
        const list = (res?.data || []).map(u => ({ id: u.user_id, name: u.username, role: 'Cashier' }));
        setAvailableStaff(list);
      }
    } catch {}
    setShowModal(true);
  };
  const handleCloseModal = () => setShowModal(false);
  const handleSaveShift = async (newEmployeeId) => {
    const { dayKey, templateId, scheduleId } = selectedShift;
    try {
      if (!storeId) return;
      if (scheduleId) {
        const res = await updateSchedule(scheduleId, { user_id: newEmployeeId, status: 'confirmed' });
        if (res.err === 0) toast.success('Cập nhật ca thành công');
        else toast.error(res.msg || 'Cập nhật ca thất bại');
      } else {
        const res = await createSchedule({
          store_id: storeId,
          user_id: newEmployeeId,
          shift_template_id: templateId,
          work_date: dayKey,
          status: 'confirmed'
        });
        if (res.err === 0) toast.success('Tạo ca thành công');
        else toast.error(res.msg || 'Tạo ca thất bại');
      }
      // locally update
      setSchedule(prev => ({
        ...prev,
        [dayKey]: { ...(prev[dayKey] || {}), [templateId]: { schedule_id: scheduleId || (prev[dayKey]?.[templateId]?.schedule_id) , user_id: newEmployeeId, status: 'confirmed' } }
      }));
    } finally {
      handleCloseModal();
    }
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
                    const tpl = shiftTemplatesData.find(t => formatShiftName(t) === shiftName);
                    const templateId = tpl?.shift_template_id || tpl?.id;
                    const shiftData = schedule[dayKey] ? schedule[dayKey][templateId] : null;
                    const employeeName = shiftData ? (staffMap[shiftData.user_id] || 'Trống') : 'Trống';
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
                              onClick={() => handleOpenModal(dayKey, templateId, shiftData)}
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
      {(availableStaff.length > 0 || staffList.length > 0) && (
        <ChangeShiftModal
          show={showModal}
          onHide={handleCloseModal}
          onSave={handleSaveShift}
          shiftInfo={selectedShift}
          staffList={(availableStaff.length ? availableStaff : staffList.filter(s => s.role === 'Cashier'))}
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