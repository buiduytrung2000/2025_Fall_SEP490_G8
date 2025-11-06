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
  Paper, Button, Typography, Box, CircularProgress, IconButton, Tooltip, Chip,
  useTheme, useMediaQuery, Card, CardContent, Grid, Stack, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, AddCircleOutline, CalendarToday, People, SwapHoriz, CheckCircle, RadioButtonUnchecked
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
// Format a Date to local YYYY-MM-DD without timezone shifting to UTC
const toLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  const [currentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({}); // { [date]: { [templateId]: [ { schedule_id, user_id, status } ] } }
  const [staffList, setStaffList] = useState([]); // employees in store (cashiers)
  const [shiftTemplatesData, setShiftTemplatesData] = useState([]); // raw templates
  const [shiftNames, setShiftNames] = useState(defaultShiftNames);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState(null);
  const { user } = useAuth();

  // Các hook useMemo giữ nguyên để tính toán ngày
  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)), [startOfWeek]);
  const staffMap = useMemo(() => {
    return staffList.reduce((acc, staff) => { acc[String(staff.id)] = staff.name; return acc; }, {});
  }, [staffList]);

  const formatShiftName = (t) => `${t.name} (${t.start_time?.slice(0,5)} - ${t.end_time?.slice(0,5)})`;

  // Kiểm tra trạng thái điểm danh dựa trên ngày và thời gian
  const getAttendanceStatus = (workDate, shiftTemplate) => {
    const today = new Date();
    const workDateObj = new Date(workDate);
    const todayStr = toLocalDateKey(today);
    
    // Nếu là ngày tương lai -> chưa điểm danh
    if (workDate > todayStr) {
      return { checked: false, label: 'Chưa điểm danh' };
    }
    
    // Nếu là ngày quá khứ -> đã điểm danh (giả định)
    if (workDate < todayStr) {
      return { checked: true, label: 'Đã điểm danh' };
    }
    
    // Nếu là hôm nay, kiểm tra giờ ca
    if (workDate === todayStr && shiftTemplate) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const shiftStart = shiftTemplate.start_time?.slice(0, 5) || '00:00';
      
      // Nếu đã qua giờ bắt đầu ca -> có thể đã điểm danh
      if (currentTime >= shiftStart) {
        return { checked: true, label: 'Đã điểm danh' };
      }
    }
    
    return { checked: false, label: 'Chưa điểm danh' };
  };

  // Render list of assignees - mỗi nhân viên 1 dòng với nút đổi và trạng thái điểm danh
  const renderAssignees = (shiftList, dayKey, templateId, isMobile = false) => {
    if (!shiftList || shiftList.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center' }}>
          Chưa có nhân viên
        </Typography>
      );
    }

    const tpl = shiftTemplatesData.find(t => (t.shift_template_id === templateId || t.id === templateId));

    return (
      <Stack spacing={0.5} sx={{ width: '100%' }}>
        {shiftList.map((item, idx) => {
          const employeeName = staffMap[String(item.user_id)] || `#${item.user_id}`;
          const attendance = getAttendanceStatus(dayKey, tpl);
          
          return (
            <Box
              key={`${item.schedule_id}-${idx}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                p: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(102,126,234,0.05)',
                '&:hover': {
                  bgcolor: 'rgba(102,126,234,0.1)',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' }
                  }}
                >
                  {employeeName}
                </Typography>
                <Tooltip title={attendance.label} arrow>
                  <Chip
                    icon={attendance.checked ? 
                      <CheckCircle sx={{ fontSize: '0.75rem !important' }} /> : 
                      <RadioButtonUnchecked sx={{ fontSize: '0.75rem !important' }} />
                    }
                    label={attendance.checked ? 'Đã' : 'Chưa'}
                    size="small"
                    color={attendance.checked ? 'success' : 'default'}
                    variant={attendance.checked ? 'filled' : 'outlined'}
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      px: 0.5,
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }}
                  />
                </Tooltip>
              </Box>
              <Tooltip title="Đổi nhân viên này" arrow>
                <IconButton
                  size="small"
                  onClick={() => handleOpenModal(dayKey, templateId, shiftList, item.schedule_id, item.user_id)}
                  sx={{
                    color: 'primary.main',
                    padding: '4px',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white',
                    },
                    transition: 'all 0.2s ease',
                    '& .MuiSvgIcon-root': {
                      fontSize: '1rem'
                    }
                  }}
                >
                  <SwapHoriz />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>
    );
  };

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
        const start = toLocalDateKey(startOfWeek);
        const end = toLocalDateKey(endOfWeek);
        const schRes = await apiGetSchedules(myStoreId, start, end);
        const rows = schRes?.data || [];
        const grid = {};
        rows.forEach(r => {
          const dateKey = r.work_date;
          if (!grid[dateKey]) grid[dateKey] = {};
          if (!grid[dateKey][r.shift_template_id]) grid[dateKey][r.shift_template_id] = [];
          grid[dateKey][r.shift_template_id].push({
            schedule_id: r.schedule_id,
            user_id: r.user_id,
            status: r.status,
          });
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

  // --- Hàm xử lý Modal ---
  const handleOpenModal = async (dayKey, templateId, shiftList, scheduleIdToReplace = null, userIdToReplace = null) => {
    setSelectedShift({ dayKey, templateId, scheduleIdToReplace, userIdToReplace });
    // fetch available employees for this slot
    try {
      if (storeId) {
        const res = await getAvailableEmployees(storeId, dayKey, templateId, 'Cashier');
        let list = (res?.data || []).map(u => ({ id: u.user_id, name: u.username, role: 'Cashier' }));
        
        // Lọc ra nhân viên đã có trong ca (tránh duplicate)
        // Khi đổi nhân viên: lọc ra tất cả nhân viên đã có (kể cả người đang được thay)
        // Khi thêm mới: lọc ra tất cả nhân viên đã có
        if (shiftList && shiftList.length > 0) {
          // Lấy tất cả user_id đã có trong ca (bao gồm cả người đang được thay nếu đang đổi)
          const existingUserIds = new Set(shiftList.map(s => String(s.user_id)));
          list = list.filter(emp => !existingUserIds.has(String(emp.id)));
        }
        
        // Kiểm tra nếu hết nhân viên
        if (list.length === 0) {
          if (scheduleIdToReplace && userIdToReplace) {
            toast.warning('Đã hết nhân viên để thay đổi cho ca này');
          } else {
            toast.warning('Đã hết nhân viên để thêm vào ca này');
          }
          return; // Không mở modal nếu hết nhân viên
        }
        
        setAvailableStaff(list);
        setShowModal(true);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách nhân viên');
    }
  };
  const handleCloseModal = () => setShowModal(false);
  const handleSaveShift = async (newEmployeeId) => {
    const { dayKey, templateId, scheduleIdToReplace } = selectedShift;
    try {
      if (!storeId) return;
      
      // Nếu có scheduleIdToReplace thì đổi nhân viên, không thì thêm mới
      if (scheduleIdToReplace) {
        // Đổi nhân viên: update schedule hiện có
        const res = await updateSchedule(scheduleIdToReplace, { 
          user_id: newEmployeeId, 
          status: 'confirmed' 
        });
        if (res.err === 0) {
          toast.success('Đổi nhân viên thành công');
          setSchedule(prev => {
            const dayObj = prev[dayKey] || {};
            const list = dayObj[templateId] ? [...dayObj[templateId]] : [];
            const updatedList = list.map(item => 
              item.schedule_id === scheduleIdToReplace
                ? { ...item, user_id: newEmployeeId }
                : item
            );
            return { ...prev, [dayKey]: { ...dayObj, [templateId]: updatedList } };
          });
        } else {
          toast.error(res.msg || 'Đổi nhân viên thất bại');
        }
      } else {
        // Thêm nhân viên mới
        const res = await createSchedule({
          store_id: storeId,
          user_id: newEmployeeId,
          shift_template_id: templateId,
          work_date: dayKey,
          status: 'confirmed'
        });
        if (res.err === 0) {
          toast.success('Thêm nhân viên vào ca thành công');
          const newItem = {
            schedule_id: res?.data?.schedule_id,
            user_id: newEmployeeId,
            status: 'confirmed'
          };
          setSchedule(prev => {
            const dayObj = prev[dayKey] || {};
            const list = dayObj[templateId] ? [...dayObj[templateId]] : [];
            list.push(newItem);
            return { ...prev, [dayKey]: { ...dayObj, [templateId]: list } };
          });
        } else {
          toast.error(res.msg || 'Thêm nhân viên thất bại');
        }
      }
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

  // Render mobile/tablet card view
  const renderCardView = () => {
    return (
      <Grid container spacing={2}>
        {shiftNames.map((shiftName, shiftIdx) => (
          <Grid item xs={12} key={shiftName}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: 4,
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday fontSize="small" />
                  {shiftName}
                </Typography>
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />
                <Stack spacing={2}>
                  {weekDays.map((day, dayIdx) => {
                    const dayKey = toLocalDateKey(day);
                    const tpl = shiftTemplatesData.find(t => formatShiftName(t) === shiftName);
                    const templateId = tpl?.shift_template_id || tpl?.id;
                    const shiftList = schedule[dayKey]?.[templateId] || [];
                    const hasAssignee = shiftList.length > 0;
                    const names = shiftList.map(it => staffMap[String(it.user_id)] || `#${it.user_id}`);
                    
                    return (
                      <Box 
                        key={dayKey}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          p: 2,
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          {weekDayNames[dayIdx]} ({formatDate(day)})
                        </Typography>
                        <Box sx={{ mb: 1.5 }}>
                          {renderAssignees(shiftList, dayKey, templateId, true)}
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          startIcon={<AddCircleOutline />}
                          onClick={() => handleOpenModal(dayKey, templateId, shiftList)}
                          sx={{
                            bgcolor: 'white',
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.9)',
                            }
                          }}
                        >
                          Thêm nhân viên
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ 
      px: { xs: 1, sm: 2, md: 4 }, 
      py: { xs: 2, md: 3 },
      minHeight: '100vh',
      background: isMobile ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' : 'transparent'
    }}>
      {/* Header Section */}
      <Box sx={{ 
        mb: { xs: 3, md: 4 },
        textAlign: { xs: 'center', md: 'left' }
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          fontWeight={700} 
          mb={1} 
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 1
          }}
        >
          Quản lý lịch làm việc
        </Typography>
        <Typography 
          color="text.secondary" 
          variant={isMobile ? "body2" : "body1"}
          sx={{ opacity: 0.8 }}
        >
          Theo dõi, phân công lịch cho nhân viên cửa hàng – thao tác trực quan, dễ nhìn!
        </Typography>
      </Box>

      {/* Week Navigation */}
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        mb={3}
        sx={{
          bgcolor: 'white',
          borderRadius: 3,
          p: 2,
          boxShadow: 2
        }}
      >
        <Tooltip title="Tuần trước" arrow>
          <span>
            <IconButton 
              disabled
              sx={{ 
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ChevronLeft />
            </IconButton>
          </span>
        </Tooltip>
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          sx={{ 
            mx: 2,
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          Tuần {getWeekNumber(startOfWeek)} ({formatDate(startOfWeek)} - {formatDate(endOfWeek)})
        </Typography>
        <Tooltip title="Tuần sau" arrow>
          <span>
            <IconButton 
              disabled
              sx={{ 
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ChevronRight />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Schedule Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} thickness={4} />
        </Box>
      ) : isMobile ? (
        // Mobile Card View
        renderCardView()
      ) : (
        // Desktop Table View
        <TableContainer 
          component={Paper} 
          sx={{ 
            boxShadow: 6,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            width: '100%',
          }}
        >
          <Table 
            sx={{ 
              width: '100%',
              tableLayout: 'fixed', // Fixed layout để phân bổ đều các cột
              bgcolor: '#fafbfc',
              '& .MuiTableCell-root': {
                border: '1px solid',
                borderColor: 'divider',
                px: { xs: 0.5, sm: 0.75, md: 1 },
                py: { xs: 0.75, md: 1 },
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 700,
                letterSpacing: 0.5,
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                textTransform: 'uppercase',
              },
              '& .MuiTableBody-root .MuiTableRow-root': {
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                  transform: 'scale(1.01)',
                },
              },
            }}
            aria-label="schedule table"
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: '18%' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' } }}>
                    Ca làm việc
                  </Typography>
                </TableCell>
                {weekDays.map((day, index) => (
                  <TableCell key={index} align="center" sx={{ width: `${82 / 7}%` }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' } }}>
                        {weekDayNames[index]}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' } }}>
                        {formatDate(day)}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shiftNames.map(shiftName => (
                <TableRow hover key={shiftName}>
                  <TableCell 
                    align="left" 
                    sx={{ 
                      fontWeight: 600, 
                      letterSpacing: 0.5,
                      bgcolor: 'white',
                      fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
                      px: { xs: 0.5, sm: 0.75, md: 1 }
                    }}
                  >
                    {shiftName}
                  </TableCell>
                  {weekDays.map((day) => {
                    const dayKey = toLocalDateKey(day);
                    const tpl = shiftTemplatesData.find(t => formatShiftName(t) === shiftName);
                    const templateId = tpl?.shift_template_id || tpl?.id;
                    const shiftList = schedule[dayKey]?.[templateId] || [];

                    return (
                      <TableCell 
                        key={dayKey} 
                        align="center"
                        sx={{ 
                          bgcolor: 'white',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          },
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => {
                          setSelectedShiftDetail({
                            dayKey,
                            dayName: weekDayNames[weekDays.indexOf(day)],
                            date: formatDate(day),
                            shiftName,
                            shiftTemplate: tpl,
                            templateId,
                            shiftList
                          });
                          setShowDetailModal(true);
                        }}
                      >
                        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5} sx={{ width: '100%' }}>
                          <Box sx={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            {renderAssignees(shiftList, dayKey, templateId, false)}
                          </Box>
                          <Tooltip title="Thêm nhân viên cho ca này" arrow>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ 
                                borderRadius: 1.5,
                                minWidth: { xs: 60, sm: 70, md: 80 },
                                px: { xs: 1, sm: 1.25, md: 1.5 },
                                py: { xs: 0.25, sm: 0.35, md: 0.5 },
                                fontWeight: 600,
                                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                                textTransform: 'none',
                                boxShadow: 1,
                                '&:hover': {
                                  boxShadow: 2,
                                },
                                transition: 'all 0.2s ease',
                                '& .MuiSvgIcon-root': {
                                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' }
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(dayKey, templateId, shiftList);
                              }}
                              startIcon={<AddCircleOutline />}
                            >
                              Thêm
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
        </TableContainer>
      )}

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

      {/* Modal chi tiết ca làm */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 6
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CalendarToday />
          Chi tiết ca làm việc
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedShiftDetail && (
            <Box>
              {/* Thông tin ca làm */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(102,126,234,0.05)', borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} mb={1}>
                  {selectedShiftDetail.shiftName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Ngày:</strong> {selectedShiftDetail.dayName}, {selectedShiftDetail.date}
                </Typography>
                {selectedShiftDetail.shiftTemplate && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Thời gian:</strong> {selectedShiftDetail.shiftTemplate.start_time?.slice(0,5)} - {selectedShiftDetail.shiftTemplate.end_time?.slice(0,5)}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  <strong>Số nhân viên:</strong> {selectedShiftDetail.shiftList?.length || 0} người
                </Typography>
              </Box>

              {/* Danh sách nhân viên */}
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Danh sách nhân viên
              </Typography>
              {selectedShiftDetail.shiftList && selectedShiftDetail.shiftList.length > 0 ? (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                  {selectedShiftDetail.shiftList.map((item, idx) => {
                    const employeeName = staffMap[String(item.user_id)] || `#${item.user_id}`;
                    const attendance = getAttendanceStatus(selectedShiftDetail.dayKey, selectedShiftDetail.shiftTemplate);
                    return (
                      <ListItem
                        key={`${item.schedule_id}-${idx}`}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'white',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        secondaryAction={
                          <Box display="flex" gap={1} alignItems="center">
                            <Tooltip title={attendance.label} arrow>
                              <Chip
                                icon={attendance.checked ? 
                                  <CheckCircle sx={{ fontSize: '0.75rem !important' }} /> : 
                                  <RadioButtonUnchecked sx={{ fontSize: '0.75rem !important' }} />
                                }
                                label={attendance.checked ? 'Đã điểm danh' : 'Chưa điểm danh'}
                                size="small"
                                color={attendance.checked ? 'success' : 'default'}
                                variant={attendance.checked ? 'filled' : 'outlined'}
                                sx={{ height: 24 }}
                              />
                            </Tooltip>
                            <Tooltip title="Đổi nhân viên này" arrow>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setShowDetailModal(false);
                                  handleOpenModal(
                                    selectedShiftDetail.dayKey,
                                    selectedShiftDetail.templateId,
                                    selectedShiftDetail.shiftList,
                                    item.schedule_id,
                                    item.user_id
                                  );
                                }}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': {
                                    bgcolor: 'primary.light',
                                    color: 'white',
                                  }
                                }}
                              >
                                <SwapHoriz />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight={500}>
                              {employeeName}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Trạng thái: {item.status || 'confirmed'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có nhân viên trong ca này
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutline />}
            onClick={() => {
              if (selectedShiftDetail) {
                setShowDetailModal(false);
                handleOpenModal(
                  selectedShiftDetail.dayKey,
                  selectedShiftDetail.templateId,
                  selectedShiftDetail.shiftList
                );
              }
            }}
            sx={{ borderRadius: 2 }}
          >
            Thêm nhân viên
          </Button>
          <Button
            onClick={() => setShowDetailModal(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
      {/*
        Ghi chú phát triển:
        - Đã đổi UI: bảng hiện đại, chip trạng thái, nút thêm đẹp hơn.
        - Modal/phân ca giữ nguyên logic, chỉ đổi style. Có thể tuỳ biến thêm filter, multi-user, tìm kiếm nếu cần.
      */}
    </Box>
  );
};

export default ScheduleManagement;