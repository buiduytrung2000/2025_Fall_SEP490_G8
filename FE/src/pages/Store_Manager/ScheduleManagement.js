import React, { useState, useEffect, useMemo } from "react";
import {
  getSchedules as apiGetSchedules,
  getShiftTemplates,
  createSchedule,
  updateSchedule,
  getAvailableEmployees,
  deleteSchedule as apiDeleteSchedule,
} from "../../api/scheduleApi";
import { fetchEmployees, fetchEmployeeById } from "../../api/employeeApi";
import ChangeShiftModal from "./ChangeShiftModal";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  AddCircleOutline,
  CalendarToday,
  SwapHoriz,
  CheckCircle,
  RadioButtonUnchecked,
  DeleteOutline,
} from "@mui/icons-material";

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
const toLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
// Kiểm tra xem một ngày có phải là ngày đã qua không
const isPastDate = (dateKey) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateKey);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < today;
};
const getWeekNumber = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};
const formatDate = (date) => {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}`;
};
const weekDayNames = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];
const defaultShiftNames = ["Ca Sáng (06:00 - 14:00)", "Ca Tối (14:00 - 22:00)"];

const ScheduleManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [shiftTemplatesData, setShiftTemplatesData] = useState([]);
  const [shiftNames, setShiftNames] = useState(defaultShiftNames);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { user } = useAuth();

  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const endOfWeek = useMemo(() => addDays(startOfWeek, 6), [startOfWeek]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i)),
    [startOfWeek]
  );
  const staffMap = useMemo(() => {
    return staffList.reduce((acc, staff) => {
      acc[String(staff.id)] = staff.name;
      return acc;
    }, {});
  }, [staffList]);

  const formatShiftName = (t) =>
    `${t.name} (${t.start_time?.slice(0, 5)} - ${t.end_time?.slice(0, 5)})`;

  const getAttendanceStatus = (workDate, shiftTemplate, scheduleItem = null) => {
    // Ưu tiên dùng attendance_status từ database
    if (scheduleItem && scheduleItem.attendance_status) {
      if (scheduleItem.attendance_status === 'checked_in') {
        return { 
          checked: true, 
          status: 'checked_in',
          label: "Đã check-in (Đang làm việc)",
          color: 'info' // Màu xanh dương để phân biệt với "đã kết ca"
        };
      }
      if (scheduleItem.attendance_status === 'checked_out') {
        return { 
          checked: true, 
          status: 'checked_out',
          label: "Đã kết ca",
          color: 'success' // Màu xanh lá
        };
      }
      if (scheduleItem.attendance_status === 'absent') {
        return { 
          checked: false, 
          status: 'absent',
          label: "Vắng mặt",
          color: 'error' // Màu đỏ
        };
      }
      if (scheduleItem.attendance_status === 'not_checked_in') {
        return { 
          checked: false, 
          status: 'not_checked_in',
          label: "Chưa điểm danh",
          color: 'default' // Màu xám
        };
      }
    }

    // Fallback: Logic cũ dựa trên thời gian (chỉ dùng khi không có attendance_status)
    const today = new Date();
    const todayStr = toLocalDateKey(today);

    if (workDate > todayStr) {
      return { 
        checked: false, 
        status: 'not_checked_in',
        label: "Chưa điểm danh",
        color: 'default'
      };
    }

    if (workDate < todayStr) {
      // Ngày quá khứ: không tự động coi là đã điểm danh nữa
      return { 
        checked: false, 
        status: 'not_checked_in',
        label: "Chưa điểm danh",
        color: 'default'
      };
    }

    if (workDate === todayStr && shiftTemplate) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const shiftStart = shiftTemplate.start_time?.slice(0, 5) || "00:00";

      // Chỉ hiển thị "Chưa điểm danh" nếu chưa đến giờ ca
      if (currentTime < shiftStart) {
        return { 
          checked: false, 
          status: 'not_checked_in',
          label: "Chưa điểm danh",
          color: 'default'
        };
      }
    }

    return { 
      checked: false, 
      status: 'not_checked_in',
      label: "Chưa điểm danh",
      color: 'default'
    };
  };

  const renderAssignees = (shiftList, dayKey, templateId, isMobile = false) => {
    if (!shiftList || shiftList.length === 0) {
      return (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          Chưa có nhân viên
        </Typography>
      );
    }

    const tpl = shiftTemplatesData.find(
      (t) => t.shift_template_id === templateId || t.id === templateId
    );

    return (
      <Stack spacing={0.5} sx={{ width: "100%" }}>
        {shiftList.map((item, idx) => {
          const employeeName =
            staffMap[String(item.user_id)] || `#${item.user_id}`;
          const attendance = getAttendanceStatus(dayKey, tpl, item);

          return (
            <Box
              key={`${item.schedule_id}-${idx}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 0.5,
                borderRadius: 1,
                bgcolor: "rgba(102,126,234,0.05)",
                "&:hover": {
                  bgcolor: "rgba(102,126,234,0.1)",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
                  }}
                >
                  {employeeName}
                </Typography>
                <Tooltip title={attendance.label} arrow>
                  <Chip
                    icon={
                      attendance.checked ? (
                        <CheckCircle sx={{ fontSize: "0.75rem !important" }} />
                      ) : (
                        <RadioButtonUnchecked
                          sx={{ fontSize: "0.75rem !important" }}
                        />
                      )
                    }
                                    label={
                                      attendance.status === 'checked_in' ? "Đang làm việc" :
                                      attendance.status === 'checked_out' ? "Đã kết ca" :
                                      attendance.status === 'absent' ? "Vắng mặt" :
                                      "Chưa điểm danh"
                                    }
                    size="small"
                    color={attendance.color || (attendance.checked ? "success" : "default")}
                    variant={attendance.checked ? "filled" : "outlined"}
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      px: 0.5,
                      "& .MuiChip-label": {
                        px: 0.5,
                      },
                    }}
                  />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {!isPastDate(dayKey) ? (
                  <>
                    <Tooltip title="Đổi nhân viên này" arrow>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleOpenModal(
                            dayKey,
                            templateId,
                            shiftList,
                            item.schedule_id,
                            item.user_id
                          )
                        }
                        sx={{
                          color: "primary.main",
                          padding: "4px",
                          "&:hover": {
                            bgcolor: "primary.light",
                            color: "white",
                          },
                          transition: "all 0.2s ease",
                          "& .MuiSvgIcon-root": {
                            fontSize: "1rem",
                          },
                        }}
                      >
                        <SwapHoriz />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa nhân viên khỏi ca" arrow>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const tpl = shiftTemplatesData.find((t) => t.shift_template_id === templateId || t.id === templateId);
                          const shiftLabel = tpl ? `${tpl.name} (${tpl.start_time?.slice(0,5)} - ${tpl.end_time?.slice(0,5)})` : '';
                          const d = new Date(dayKey);
                          const dayLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                          const employeeName = staffMap[String(item.user_id)] || `#${item.user_id}`;
                          openConfirmDelete(dayKey, templateId, item.schedule_id, { employeeName, shiftLabel, dayLabel });
                        }}
                        sx={{
                          color: "error.main",
                          padding: "4px",
                          "&:hover": {
                            bgcolor: "error.light",
                            color: "white",
                          },
                          transition: "all 0.2s ease",
                          "& .MuiSvgIcon-root": { fontSize: "1rem" },
                        }}
                      >
                        <DeleteOutline />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip title="Không thể sửa lịch của ngày đã qua" arrow>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                      Đã qua
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const me = await fetchEmployeeById(user.id);
        const myStoreId = me?.data?.store_id || me?.data?.store?.store_id;
        if (!myStoreId) {
          toast.error("Manager chưa gán cửa hàng");
          setLoading(false);
          return;
        }
        setStoreId(myStoreId);

        const [tplRes, empRes] = await Promise.all([
          getShiftTemplates(),
          fetchEmployees({ store_id: myStoreId, role: "Cashier", limit: 200 }),
        ]);
        const templates = tplRes?.data || [];
        setShiftTemplatesData(templates);
        setShiftNames(
          templates.length ? templates.map(formatShiftName) : defaultShiftNames
        );

        const employees = (empRes?.data || []).map((u) => ({
          id: u.user_id,
          name: u.name || u.username,
        }));
        setStaffList(employees);

        const start = toLocalDateKey(startOfWeek);
        const end = toLocalDateKey(endOfWeek);
        const schRes = await apiGetSchedules(myStoreId, start, end);
        const rows = schRes?.data || [];
        const grid = {};
        rows.forEach((r) => {
          const dateKey = r.work_date;
          if (!grid[dateKey]) grid[dateKey] = {};
          if (!grid[dateKey][r.shift_template_id])
            grid[dateKey][r.shift_template_id] = [];
          grid[dateKey][r.shift_template_id].push({
            schedule_id: r.schedule_id,
            user_id: r.user_id,
            status: r.status,
            attendance_status: r.attendance_status || 'not_checked_in', // Quan trọng: lưu attendance_status
          });
        });
        setSchedule(grid);
      } catch (e) {
        toast.error("Tải dữ liệu lịch thất bại");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [startOfWeek, endOfWeek, user.id]);

  // Auto-refresh schedule data mỗi 30 giây để cập nhật attendance_status
  useEffect(() => {
    if (!storeId) return;
    const interval = setInterval(async () => {
      try {
        const start = toLocalDateKey(startOfWeek);
        const end = toLocalDateKey(endOfWeek);
        const schRes = await apiGetSchedules(storeId, start, end);
        const rows = schRes?.data || [];
        const grid = {};
        rows.forEach((r) => {
          const dateKey = r.work_date;
          if (!grid[dateKey]) grid[dateKey] = {};
          if (!grid[dateKey][r.shift_template_id])
            grid[dateKey][r.shift_template_id] = [];
          grid[dateKey][r.shift_template_id].push({
            schedule_id: r.schedule_id,
            user_id: r.user_id,
            status: r.status,
            attendance_status: r.attendance_status || 'not_checked_in',
          });
        });
        setSchedule(grid);
      } catch (e) {
        // Silent fail for auto-refresh
      }
    }, 30000); // Refresh mỗi 30 giây

    return () => clearInterval(interval);
  }, [startOfWeek, endOfWeek, storeId]);

  const handleOpenModal = async (
    dayKey,
    templateId,
    shiftList,
    scheduleIdToReplace = null,
    userIdToReplace = null
  ) => {
    const tpl = shiftTemplatesData.find(
      (t) => t.shift_template_id === templateId || t.id === templateId
    );
    const shiftLabel = tpl ? `${tpl.name} (${tpl.start_time?.slice(0, 5)} - ${tpl.end_time?.slice(0, 5)})` : '';
    const d = new Date(dayKey);
    const dayLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    setSelectedShift({
      dayKey,
      templateId,
      scheduleIdToReplace,
      userIdToReplace,
      shiftLabel,
      dayLabel,
      mode: scheduleIdToReplace ? 'replace' : 'add'
    });
    try {
      if (storeId) {
        const res = await getAvailableEmployees(
          storeId,
          dayKey,
          templateId,
          "Cashier"
        );
        let list = (res?.data || []).map((u) => ({
          id: u.user_id,
          name: u.username,
          role: "Cashier",
        }));

        if (shiftList && shiftList.length > 0) {
          const existingUserIds = new Set(
            shiftList.map((s) => String(s.user_id))
          );
          list = list.filter((emp) => !existingUserIds.has(String(emp.id)));
        }

        if (list.length === 0) {
          if (scheduleIdToReplace && userIdToReplace) {
            toast.warning("Đã hết nhân viên để thay đổi cho ca này");
          } else {
            toast.warning("Đã hết nhân viên để thêm vào ca này");
          }
          return;
        }

        setAvailableStaff(list);
        setShowModal(true);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách nhân viên");
    }
  };
  const handleCloseModal = () => setShowModal(false);
  const handleSaveShift = async (newEmployeeId) => {
    const { dayKey, templateId, scheduleIdToReplace } = selectedShift;
    try {
      if (!storeId) return;
      if (scheduleIdToReplace) {
        const res = await updateSchedule(scheduleIdToReplace, {
          user_id: newEmployeeId,
          status: "confirmed",
        });
        if (res.err === 0) {
          toast.success("Đổi nhân viên thành công");
          setSchedule((prev) => {
            const dayObj = prev[dayKey] || {};
            const list = dayObj[templateId] ? [...dayObj[templateId]] : [];
            const updatedList = list.map((item) =>
              item.schedule_id === scheduleIdToReplace
                ? { ...item, user_id: newEmployeeId }
                : item
            );
            const next = { ...prev, [dayKey]: { ...dayObj, [templateId]: updatedList } };
            return next;
          });
          // Cập nhật ngay trong modal chi tiết nếu đang mở
          setSelectedShiftDetail((prev) => {
            if (!prev) return prev;
            if (prev.dayKey !== dayKey || prev.templateId !== templateId) return prev;
            const updatedList = (prev.shiftList || []).map((item) =>
              item.schedule_id === scheduleIdToReplace
                ? { ...item, user_id: newEmployeeId }
                : item
            );
            return { ...prev, shiftList: updatedList };
          });
        } else {
          toast.error(res.msg || "Đổi nhân viên thất bại");
        }
      } else {
        // Thêm nhân viên mới
        const res = await createSchedule({
          store_id: storeId,
          user_id: newEmployeeId,
          shift_template_id: templateId,
          work_date: dayKey,
          status: "confirmed",
        });
        if (res.err === 0) {
          toast.success("Thêm nhân viên vào ca thành công");
          const newItem = {
            schedule_id: res?.data?.schedule_id,
            user_id: newEmployeeId,
            status: "confirmed",
            attendance_status: res?.data?.attendance_status || 'not_checked_in', // Lưu attendance_status từ response
          };
          setSchedule((prev) => {
            const dayObj = prev[dayKey] || {};
            const list = dayObj[templateId] ? [...dayObj[templateId]] : [];
            list.push(newItem);
            return { ...prev, [dayKey]: { ...dayObj, [templateId]: list } };
          });
          // Cập nhật ngay danh sách trong modal chi tiết nếu đang mở và cùng ca/ngày
          setSelectedShiftDetail((prev) => {
            if (!prev) return prev;
            if (prev.dayKey !== dayKey || prev.templateId !== templateId) return prev;
            const updated = [...(prev.shiftList || []), newItem];
            return { ...prev, shiftList: updated };
          });
        } else {
          toast.error(res.msg || "Thêm nhân viên thất bại");
        }
      }
    } finally {
      handleCloseModal();
    }
  };

  // --- THAY ĐỔI: Tắt chức năng các nút bấm ---
  // const handleSaveSchedule = () => {
  //   // Chức năng 'Lưu' chưa được kích hoạt
  // };
  // const handleAddStaffClick = () => {
  //   // Chức năng 'Thêm Nhân viên' chưa được kích hoạt
  // };

  // Week navigation handlers
  const handlePrevWeek = () => {
    setCurrentDate(addDays(startOfWeek, -7));
  };
  const handleNextWeek = () => {
    setCurrentDate(addDays(startOfWeek, 7));
  };

  const openConfirmDelete = (dayKey, templateId, scheduleId, meta = {}) => {
    setDeleteTarget({ dayKey, templateId, scheduleId, ...meta });
    setConfirmDeleteOpen(true);
  };

  const handleDeleteAssignee = async (dayKey, templateId, scheduleId) => {
    try {
      const res = await apiDeleteSchedule(scheduleId);
      if (res.err === 0) {
        toast.success("Xóa nhân viên khỏi ca thành công");
        setSchedule((prev) => {
          const dayObj = prev[dayKey] || {};
          const list = dayObj[templateId] ? [...dayObj[templateId]] : [];
          const updated = list.filter((it) => it.schedule_id !== scheduleId);
          return { ...prev, [dayKey]: { ...dayObj, [templateId]: updated } };
        });
        // Cập nhật ngay trong modal chi tiết nếu đang mở và cùng ca/ngày
        setSelectedShiftDetail((prev) => {
          if (!prev) return prev;
          if (prev.dayKey !== dayKey || prev.templateId !== templateId) return prev;
          const updatedList = (prev.shiftList || []).filter((it) => it.schedule_id !== scheduleId);
          return { ...prev, shiftList: updatedList };
        });
      } else {
        toast.error(res.msg || "Xóa thất bại");
      }
    } catch (e) {
      toast.error("Không thể xóa lịch");
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { dayKey, templateId, scheduleId } = deleteTarget;
    handleDeleteAssignee(dayKey, templateId, scheduleId);
  };
  const handleCloseConfirm = () => {
    setConfirmDeleteOpen(false);
    setDeleteTarget(null);
  };

  // Render mobile/tablet card view
  const renderCardView = () => {
    return (
      <Grid container spacing={2}>
        {shiftNames.map((shiftName, shiftIdx) => (
          <Grid item xs={12} key={shiftName}>
            <Card
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                boxShadow: 4,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  mb={2}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CalendarToday fontSize="small" />
                  {shiftName}
                </Typography>
                <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)", my: 2 }} />
                <Stack spacing={2}>
                  {weekDays.map((day, dayIdx) => {
                    const dayKey = toLocalDateKey(day);
                    const tpl = shiftTemplatesData.find(
                      (t) => formatShiftName(t) === shiftName
                    );
                    const templateId = tpl?.shift_template_id || tpl?.id;
                    const shiftList = schedule[dayKey]?.[templateId] || [];

                    return (
                      <Box
                        key={dayKey}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          p: 2,
                          backdropFilter: "blur(10px)",
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
                          onClick={() =>
                            handleOpenModal(dayKey, templateId, shiftList)
                          }
                          disabled={isPastDate(dayKey)}
                          sx={{
                            bgcolor: "white",
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            "&:hover": {
                              bgcolor: "rgba(255,255,255,0.9)",
                            },
                            "&.Mui-disabled": {
                              bgcolor: "rgba(0,0,0,0.12)",
                              color: "rgba(0,0,0,0.26)",
                            },
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
    <Box
      sx={{
        px: { xs: 1, sm: 2, md: 4 },
        py: { xs: 2, md: 3 },
        minHeight: "100vh",
        background: isMobile
          ? "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
          : "transparent",
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          mb: { xs: 3, md: 4 },
          textAlign: { xs: "center", md: "left" },
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h4"}
          fontWeight={700}
          mb={1}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 1,
          }}
        >
          Quản lý lịch làm việc
        </Typography>
        <Typography
          color="text.secondary"
          variant={isMobile ? "body2" : "body1"}
          sx={{ opacity: 0.8 }}
        >
          Theo dõi, phân công lịch cho nhân viên cửa hàng – thao tác trực quan,
          dễ nhìn!
        </Typography>
      </Box>

      {/* Week Navigation */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        mb={3}
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
          boxShadow: 2,
        }}
      >
        <Tooltip title="Tuần trước" arrow>
          <span>
            <IconButton
              onClick={handlePrevWeek}
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "action.hover" },
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
            color: "primary.main",
          }}
        >
          Tuần {getWeekNumber(startOfWeek)} ({formatDate(startOfWeek)} -{" "}
          {formatDate(endOfWeek)})
        </Typography>
        <Tooltip title="Tuần sau" arrow>
          <span>
            <IconButton
              onClick={handleNextWeek}
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ChevronRight />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Schedule Content */}
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
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
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            width: "100%",
          }}
        >
          <Table
            sx={{
              width: "100%",
              tableLayout: "fixed", // Fixed layout để phân bổ đều các cột
              bgcolor: "#fafbfc",
              "& .MuiTableCell-root": {
                border: "1px solid",
                borderColor: "divider",
                px: { xs: 0.5, sm: 0.75, md: 1 },
                py: { xs: 0.75, md: 1 },
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                fontWeight: 700,
                letterSpacing: 0.5,
                fontSize: { xs: "0.75rem", md: "0.875rem" },
                textTransform: "uppercase",
              },
              "& .MuiTableBody-root .MuiTableRow-root": {
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "action.hover",
                  transform: "scale(1.01)",
                },
              },
            }}
            aria-label="schedule table"
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: "18%" }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{
                      fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
                    }}
                  >
                    Ca làm việc
                  </Typography>
                </TableCell>
                {weekDays.map((day, index) => (
                  <TableCell
                    key={index}
                    align="center"
                    sx={{ width: `${82 / 7}%` }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{
                          fontSize: {
                            xs: "0.65rem",
                            sm: "0.7rem",
                            md: "0.75rem",
                          },
                        }}
                      >
                        {weekDayNames[index]}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.9,
                          fontSize: {
                            xs: "0.6rem",
                            sm: "0.65rem",
                            md: "0.7rem",
                          },
                        }}
                      >
                        {formatDate(day)}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shiftNames.map((shiftName) => (
                <TableRow hover key={shiftName}>
                  <TableCell
                    align="left"
                    sx={{
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      bgcolor: "white",
                      fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
                      px: { xs: 0.5, sm: 0.75, md: 1 },
                    }}
                  >
                    {shiftName}
                  </TableCell>
                  {weekDays.map((day) => {
                    const dayKey = toLocalDateKey(day);
                    const tpl = shiftTemplatesData.find(
                      (t) => formatShiftName(t) === shiftName
                    );
                    const templateId = tpl?.shift_template_id || tpl?.id;
                    const shiftList = schedule[dayKey]?.[templateId] || [];

                    return (
                      <TableCell
                        key={dayKey}
                        align="center"
                        sx={{
                          bgcolor: "white",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                          transition: "background-color 0.2s ease",
                        }}
                        onClick={() => {
                          setSelectedShiftDetail({
                            dayKey,
                            dayName: weekDayNames[weekDays.indexOf(day)],
                            date: formatDate(day),
                            shiftName,
                            shiftTemplate: tpl,
                            templateId,
                            shiftList,
                          });
                          setShowDetailModal(true);
                        }}
                      >
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          gap={0.5}
                          sx={{ width: "100%" }}
                        >
                          <Box
                            sx={{ width: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderAssignees(
                              shiftList,
                              dayKey,
                              templateId,
                              false
                            )}
                          </Box>
                          <Tooltip title={isPastDate(dayKey) ? "Không thể thêm nhân viên cho ngày đã qua" : "Thêm nhân viên cho ca này"} arrow>
                            <span>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                disabled={isPastDate(dayKey)}
                                sx={{
                                  borderRadius: 1.5,
                                  minWidth: { xs: 60, sm: 70, md: 80 },
                                  px: { xs: 1, sm: 1.25, md: 1.5 },
                                  py: { xs: 0.25, sm: 0.35, md: 0.5 },
                                  fontWeight: 600,
                                  fontSize: {
                                    xs: "0.65rem",
                                    sm: "0.7rem",
                                    md: "0.75rem",
                                  },
                                  textTransform: "none",
                                  boxShadow: 1,
                                  "&:hover": {
                                    boxShadow: 2,
                                  },
                                  transition: "all 0.2s ease",
                                  "& .MuiSvgIcon-root": {
                                    fontSize: {
                                      xs: "0.875rem",
                                      sm: "1rem",
                                      md: "1.125rem",
                                    },
                                  },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isPastDate(dayKey)) {
                                    handleOpenModal(dayKey, templateId, shiftList);
                                  }
                                }}
                                startIcon={<AddCircleOutline />}
                              >
                                Thêm
                              </Button>
                            </span>
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

     
      {(availableStaff.length > 0 || staffList.length > 0) && (
        <ChangeShiftModal
          show={showModal}
          onHide={handleCloseModal}
          onSave={handleSaveShift}
          shiftInfo={selectedShift}
          staffList={
            availableStaff.length
              ? availableStaff
              : staffList.filter((s) => s.role === "Cashier")
          }
        />
      )}

     
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 6,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CalendarToday />
          Chi tiết ca làm việc
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedShiftDetail && (
            <Box>
           
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "rgba(102,126,234,0.05)",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" fontWeight={600} mb={1}>
                  {selectedShiftDetail.shiftName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Ngày:</strong> {selectedShiftDetail.dayName},{" "}
                  {selectedShiftDetail.date}
                </Typography>
                {selectedShiftDetail.shiftTemplate && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Thời gian:</strong>{" "}
                    {selectedShiftDetail.shiftTemplate.start_time?.slice(0, 5)}{" "}
                    - {selectedShiftDetail.shiftTemplate.end_time?.slice(0, 5)}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  <strong>Số nhân viên:</strong>{" "}
                  {selectedShiftDetail.shiftList?.length || 0} người
                </Typography>
              </Box>

             
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Danh sách nhân viên
              </Typography>
              {selectedShiftDetail.shiftList &&
              selectedShiftDetail.shiftList.length > 0 ? (
                <List sx={{ bgcolor: "background.paper", borderRadius: 2 }}>
                  {selectedShiftDetail.shiftList.map((item, idx) => {
                    const employeeName =
                      staffMap[String(item.user_id)] || `#${item.user_id}`;
                    const attendance = getAttendanceStatus(
                      selectedShiftDetail.dayKey,
                      selectedShiftDetail.shiftTemplate,
                      item
                    );
                    return (
                      <ListItem
                        key={`${item.schedule_id}-${idx}`}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: "white",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                        secondaryAction={
                          <Box display="flex" gap={1} alignItems="center">
                            <Tooltip title={attendance.label} arrow>
                              <Chip
                                icon={
                                  attendance.checked ? (
                                    <CheckCircle
                                      sx={{ fontSize: "0.75rem !important" }}
                                    />
                                  ) : (
                                    <RadioButtonUnchecked
                                      sx={{ fontSize: "0.75rem !important" }}
                                    />
                                  )
                                }
                                  label={
                                    attendance.status === 'checked_in' ? "Đã check-in (Đang làm việc)" :
                                    attendance.status === 'checked_out' ? "Đã kết ca" :
                                    attendance.status === 'absent' ? "Vắng mặt" :
                                    "Chưa điểm danh"
                                  }
                                size="small"
                                color={attendance.color || (attendance.checked ? "success" : "default")}
                                variant={attendance.checked ? "filled" : "outlined"}
                                sx={{ height: 24 }}
                              />
                            </Tooltip>
                            {!isPastDate(selectedShiftDetail.dayKey) ? (
                              <>
                                <Tooltip title="Đổi nhân viên này" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      handleOpenModal(
                                        selectedShiftDetail.dayKey,
                                        selectedShiftDetail.templateId,
                                        selectedShiftDetail.shiftList,
                                        item.schedule_id,
                                        item.user_id
                                      );
                                    }}
                                    sx={{
                                      color: "primary.main",
                                      "&:hover": {
                                        bgcolor: "primary.light",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <SwapHoriz />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa nhân viên khỏi ca" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => openConfirmDelete(
                                      selectedShiftDetail.dayKey,
                                      selectedShiftDetail.templateId,
                                      item.schedule_id,
                                      {
                                        employeeName: staffMap[String(item.user_id)] || `#${item.user_id}`,
                                        shiftLabel: selectedShiftDetail.shiftName,
                                        dayLabel: `${selectedShiftDetail.dayName}, ${selectedShiftDetail.date}`
                                      }
                                    )}
                                    sx={{
                                      color: "error.main",
                                      "&:hover": {
                                        bgcolor: "error.light",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <DeleteOutline />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip title="Không thể sửa lịch của ngày đã qua" arrow>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", fontStyle: "italic" }}>
                                  Đã qua
                                </Typography>
                              </Tooltip>
                            )}
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Trạng thái: {item.status || "confirmed"}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có nhân viên trong ca này
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutline />}
            disabled={selectedShiftDetail && isPastDate(selectedShiftDetail.dayKey)}
            onClick={() => {
              if (selectedShiftDetail && !isPastDate(selectedShiftDetail.dayKey)) {
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

      {/* Confirm Delete Modal */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCloseConfirm}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget && (deleteTarget.employeeName || deleteTarget.shiftLabel || deleteTarget.dayLabel)
              ? `Xóa ${deleteTarget.employeeName || 'nhân viên'} khỏi ${deleteTarget.shiftLabel || 'ca'} vào ngày ${deleteTarget.dayLabel || ''}?`
              : 'Bạn có chắc muốn xóa nhân viên khỏi ca này?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} variant="outlined">Hủy</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Xóa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleManagement;
