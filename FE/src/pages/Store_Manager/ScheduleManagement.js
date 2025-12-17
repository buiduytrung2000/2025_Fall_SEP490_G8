import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getSchedules as apiGetSchedules,
  getShiftTemplates,
  createSchedule,
  updateSchedule,
  getAvailableEmployees,
  deleteSchedule as apiDeleteSchedule,
  getShiftChangeRequests,
} from "../../api/scheduleApi";
import { fetchEmployees, fetchEmployeeById } from "../../api/employeeApi";
import ChangeShiftModal from "./ChangeShiftModal";
import ShiftChangeRequestManagement from "./ShiftChangeRequestManagement";
import { useAuth } from "../../contexts/AuthContext";
import { ToastNotification, PrimaryButton, SecondaryButton, DangerButton, ActionButton, Icon } from "../../components/common";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
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
  Tabs,
  Tab,
  IconButton,
  Button,
  DialogContentText,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
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

// Kiểm tra ca trong cùng ngày hôm nay nhưng đã qua thời gian làm việc (quá khứ trong ngày)
const isPastShiftToday = (dateKey, shiftTemplate) => {
  if (!shiftTemplate) return false;

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  if (dateKey !== todayKey) return false;

  const nowHH = String(today.getHours()).padStart(2, '0');
  const nowMM = String(today.getMinutes()).padStart(2, '0');
  const nowTime = `${nowHH}:${nowMM}`;

  const startTime = shiftTemplate.start_time?.slice(0, 5) || '00:00';
  const endTime = shiftTemplate.end_time?.slice(0, 5) || startTime;

  // Nếu ca không qua đêm (end > start) -> coi là đã qua khi giờ hiện tại > giờ kết thúc
  // Nếu ca qua đêm (end <= start, ví dụ 22:00 - 06:00) -> coi là đã qua khi giờ hiện tại > giờ bắt đầu
  if (endTime > startTime) {
    return nowTime > endTime;
  }
  return nowTime > startTime;
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

// Helper lưu/đọc mẫu lịch tháng trong localStorage
const MONTH_TEMPLATE_KEY = 'schedule_month_templates';

const loadMonthTemplates = () => {
  try {
    const raw = localStorage.getItem(MONTH_TEMPLATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveMonthTemplates = (data) => {
  try {
    localStorage.setItem(MONTH_TEMPLATE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

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
  const [activeTab, setActiveTab] = useState("schedule");
  const [shiftRequestCount, setShiftRequestCount] = useState(0);
  const [savingMonthTemplate, setSavingMonthTemplate] = useState(false);
  const [applyingMonthTemplate, setApplyingMonthTemplate] = useState(false);
  const [massAddOpen, setMassAddOpen] = useState(false);
  const [massAddTemplateId, setMassAddTemplateId] = useState("");
  const [massAddEmployeeId, setMassAddEmployeeId] = useState("");
  const [massAddFromToday, setMassAddFromToday] = useState(true);
  const [massAddLoading, setMassAddLoading] = useState(false);
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
    const effectiveList = (shiftList || []).filter((item) => item.user_id); // Bỏ các ca chưa phân công nhân viên

    if (!effectiveList || effectiveList.length === 0) {
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
        {effectiveList.map((item, idx) => {
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
                {(() => {
                  const tpl = shiftTemplatesData.find(
                    (t) => t.shift_template_id === templateId || t.id === templateId
                  );
                  const isPastDay = isPastDate(dayKey);
                  const isPastShift = isPastDay || isPastShiftToday(dayKey, tpl);

                  if (isPastShift) {
                    return (
                      <Tooltip title="Không thể sửa lịch của ca đã qua" arrow>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                          Đã qua
                        </Typography>
                      </Tooltip>
                    );
                  }

                  if (attendance.status === 'checked_in' || attendance.status === 'checked_out') {
                    return (
                      <Tooltip
                        title={
                          attendance.status === 'checked_in'
                            ? "Không thể đổi/xóa khi nhân viên đang làm việc"
                            : "Không thể đổi/xóa khi nhân viên đã kết ca"
                        }
                        arrow
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.65rem", fontStyle: "italic" }}
                        >
                          {attendance.status === 'checked_in' ? "Đang làm" : "Đã kết ca"}
                        </Typography>
                      </Tooltip>
                    );
                  }

                  return (
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
                            const shiftLabel = tpl
                              ? `${tpl.name} (${tpl.start_time?.slice(0, 5)} - ${tpl.end_time?.slice(0, 5)})`
                              : "";
                            const d = new Date(dayKey);
                            const dayLabel = `${String(d.getDate()).padStart(2, "0")}/${String(
                              d.getMonth() + 1
                            ).padStart(2, "0")}/${d.getFullYear()}`;
                            const employeeName = staffMap[String(item.user_id)] || `#${item.user_id}`;
                            openConfirmDelete(dayKey, templateId, item.schedule_id, {
                              employeeName,
                              shiftLabel,
                              dayLabel,
                            });
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
                  );
                })()}
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
          ToastNotification.error("Manager chưa gán cửa hàng");
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
        ToastNotification.error("Tải dữ liệu lịch thất bại");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [startOfWeek, endOfWeek, user.id]);

  const refreshShiftRequestCount = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await getShiftChangeRequests({
        store_id: storeId,
        status: "pending",
      });
      if (res?.err === 0) {
        setShiftRequestCount(res.data?.length || 0);
      }
    } catch (error) {
      setShiftRequestCount(0);
    }
  }, [storeId]);

  useEffect(() => {
    refreshShiftRequestCount();
  }, [refreshShiftRequestCount]);

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

  // Lưu mẫu lịch làm việc cả tháng hiện tại (theo store)
  const handleSaveMonthTemplate = useCallback(async () => {
    if (!storeId) {
      ToastNotification.error("Không xác định được cửa hàng để lưu mẫu lịch");
      return;
    }
    try {
      setSavingMonthTemplate(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-based
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const start = toLocalDateKey(firstDay);
      const end = toLocalDateKey(lastDay);

      const schRes = await apiGetSchedules(storeId, start, end);
      const rows = schRes?.data || [];

      if (!rows.length) {
        ToastNotification.warning("Tháng này chưa có lịch để lưu mẫu");
        return;
      }

      // Chuẩn hóa theo ngày trong tháng để có thể áp dụng cho các tháng khác
      const template = rows.map((r) => {
        const d = new Date(r.work_date);
        return {
          day: d.getDate(), // 1..31
          shift_template_id: r.shift_template_id,
          user_id: r.user_id,
        };
      });

      const allTemplates = loadMonthTemplates();
      if (!allTemplates[storeId]) allTemplates[storeId] = {};
      const key = "default"; // 1 mẫu mặc định/ cửa hàng
      allTemplates[storeId][key] = {
        created_at: new Date().toISOString(),
        template,
      };
      saveMonthTemplates(allTemplates);
      ToastNotification.success("Đã lưu mẫu lịch làm việc cho tháng hiện tại");
    } catch (error) {
      ToastNotification.error("Không thể lưu mẫu lịch tháng");
    } finally {
      setSavingMonthTemplate(false);
    }
  }, [storeId, currentDate]);

  // Áp dụng mẫu lịch tháng đã lưu cho tháng hiện tại
  const handleApplyMonthTemplate = useCallback(async () => {
    if (!storeId) {
      ToastNotification.error("Không xác định được cửa hàng");
      return;
    }
    const allTemplates = loadMonthTemplates();
    const storeTemplates = allTemplates[storeId];
    if (!storeTemplates || !storeTemplates.default || !storeTemplates.default.template?.length) {
      ToastNotification.warning("Chưa có mẫu lịch tháng nào được lưu. Hãy tạo lịch cho 1 tháng rồi bấm 'Lưu mẫu tháng'.");
      return;
    }

    if (!window.confirm("Áp dụng mẫu lịch tháng cho tháng hiện tại? Các ca đã có sẽ được giữ nguyên, chỉ thêm ca còn thiếu.")) {
      return;
    }

    try {
      setApplyingMonthTemplate(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const start = toLocalDateKey(firstDay);
      const end = toLocalDateKey(lastDay);

      // Lấy lịch hiện tại của tháng để tránh tạo trùng
      const schRes = await apiGetSchedules(storeId, start, end);
      const existingRows = schRes?.data || [];
      const existingSet = new Set(
        existingRows.map(
          (r) => `${r.work_date}|${r.shift_template_id}|${r.user_id}`
        )
      );

      const { template } = storeTemplates.default;
      let createdCount = 0;

      for (const item of template) {
        const workDate = new Date(year, month, item.day);
        if (workDate.getMonth() !== month) continue; // ngày không tồn tại trong tháng
        const workDateKey = toLocalDateKey(workDate);
        const key = `${workDateKey}|${item.shift_template_id}|${item.user_id}`;
        if (existingSet.has(key)) continue;

        const res = await createSchedule({
          store_id: storeId,
          user_id: item.user_id,
          shift_template_id: item.shift_template_id,
          work_date: workDateKey,
          status: "confirmed",
        });
        if (res.err === 0) {
          existingSet.add(key);
          createdCount += 1;
        }
      }

      if (createdCount === 0) {
        ToastNotification.info("Không có ca mới nào được tạo từ mẫu (có thể tháng này đã có đầy đủ lịch).");
      } else {
        ToastNotification.success(`Đã áp dụng mẫu lịch: tạo thêm ${createdCount} ca làm việc.`);
      }

      // Reload tuần hiện tại để thấy dữ liệu mới
      const startReload = toLocalDateKey(startOfWeek);
      const endReload = toLocalDateKey(endOfWeek);
      const reloadRes = await apiGetSchedules(storeId, startReload, endReload);
      const rowsReload = reloadRes?.data || [];
      const grid = {};
      rowsReload.forEach((r) => {
        const dateKey = r.work_date;
        if (!grid[dateKey]) grid[dateKey] = {};
        if (!grid[dateKey][r.shift_template_id]) grid[dateKey][r.shift_template_id] = [];
        grid[dateKey][r.shift_template_id].push({
          schedule_id: r.schedule_id,
          user_id: r.user_id,
          status: r.status,
          attendance_status: r.attendance_status || "not_checked_in",
        });
      });
      setSchedule(grid);
    } catch (error) {
      ToastNotification.error("Không thể áp dụng mẫu lịch tháng");
    } finally {
      setApplyingMonthTemplate(false);
    }
  }, [storeId, currentDate, startOfWeek, endOfWeek]);

  // Thêm 1 nhân viên vào tất cả ca trong tháng (ví dụ toàn bộ ca sáng)
  const handleMassAddSubmit = async () => {
    if (!storeId || !massAddTemplateId || !massAddEmployeeId) {
      ToastNotification.error("Vui lòng chọn ca làm việc và nhân viên");
      return;
    }

    try {
      setMassAddLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-based
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let createdCount = 0;

      for (
        let d = new Date(firstDay);
        d <= lastDay;
        d.setDate(d.getDate() + 1)
      ) {
        const workDateKey = toLocalDateKey(d);

        // Bỏ qua ngày quá khứ nếu chọn "từ hôm nay trở đi"
        if (massAddFromToday) {
          const dayCopy = new Date(d);
          dayCopy.setHours(0, 0, 0, 0);
          if (dayCopy < today) continue;
        }

        const dayShifts = schedule[workDateKey] || {};
        const listForShift = dayShifts[massAddTemplateId] || [];

        // Nếu đã có nhân viên này trong ca đó thì bỏ qua
        const alreadyAssigned = listForShift.some(
          (item) => String(item.user_id) === String(massAddEmployeeId)
        );
        if (alreadyAssigned) continue;

        // Tạo lịch mới
        const res = await createSchedule({
          store_id: storeId,
          user_id: massAddEmployeeId,
          shift_template_id: massAddTemplateId,
          work_date: workDateKey,
          status: "confirmed",
        });

        if (res?.err === 0) {
          createdCount += 1;
        }
      }

      if (createdCount === 0) {
        ToastNotification.info(
          "Không có ca mới nào được tạo (có thể nhân viên đã có lịch cho tất cả các ca được chọn)"
        );
      } else {
        ToastNotification.success(
          `Đã thêm nhân viên vào ${createdCount} ca làm việc trong tháng`
        );
      }

      // Reload dữ liệu tuần hiện tại để cập nhật UI
      const startReload = toLocalDateKey(startOfWeek);
      const endReload = toLocalDateKey(endOfWeek);
      const reloadRes = await apiGetSchedules(storeId, startReload, endReload);
      const rowsReload = reloadRes?.data || [];
      const grid = {};
      rowsReload.forEach((r) => {
        const dateKey = r.work_date;
        if (!grid[dateKey]) grid[dateKey] = {};
        if (!grid[dateKey][r.shift_template_id])
          grid[dateKey][r.shift_template_id] = [];
        grid[dateKey][r.shift_template_id].push({
          schedule_id: r.schedule_id,
          user_id: r.user_id,
          status: r.status,
          attendance_status: r.attendance_status || "not_checked_in",
        });
      });
      setSchedule(grid);

      setMassAddOpen(false);
      setMassAddTemplateId("");
      setMassAddEmployeeId("");
      setMassAddFromToday(true);
    } catch (error) {
      ToastNotification.error("Không thể thêm nhân viên cho cả tháng");
    } finally {
      setMassAddLoading(false);
    }
  };

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
            ToastNotification.warning("Đã hết nhân viên để thay đổi cho ca này");
          } else {
            ToastNotification.warning("Đã hết nhân viên để thêm vào ca này");
          }
          return;
        }

        setAvailableStaff(list);
        setShowModal(true);
      }
    } catch (error) {
      ToastNotification.error("Không thể tải danh sách nhân viên");
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
          ToastNotification.success("Đổi nhân viên thành công");
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
          ToastNotification.error(res.msg || "Đổi nhân viên thất bại");
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
          ToastNotification.success("Thêm nhân viên vào ca thành công");
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
          ToastNotification.error(res.msg || "Thêm nhân viên thất bại");
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
        ToastNotification.success("Xóa nhân viên khỏi ca thành công");
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
        ToastNotification.error(res.msg || "Xóa thất bại");
      }
    } catch (e) {
      ToastNotification.error("Không thể xóa lịch");
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
        bgcolor: "#f7f9fc",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Quản lý lịch làm việc" value="schedule" />
          <Tab
            label={`Yêu cầu đổi ca (${shiftRequestCount})`}
            value="shift-requests"
          />
        </Tabs>
      </Box>

      {activeTab === "schedule" && (
        <>
          {/* Header Section */}
          <Box
            sx={{
              mb: { xs: 3, md: 4 },
              textAlign: "left",
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              mb={0.5}
              color="text.primary"
            >
              Quản lý lịch làm việc
            </Typography>
            <Typography
              color="text.secondary"
              variant="h6"
              fontWeight={400}
            >
            </Typography>
          </Box>

          {/* Week Navigation + Month template actions */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={2}
            mb={3}
            sx={{
              bgcolor: "white",
              borderRadius: 2,
              p: 2,
              boxShadow: 1,
            }}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <ActionButton
                icon={<Icon name="ArrowBack" />}
                onClick={handlePrevWeek}
                color="primary"
              />
              <Typography variant="subtitle1" fontWeight={600}>
                Tuần {getWeekNumber(startOfWeek)} ({formatDate(startOfWeek)} -{" "}
                {formatDate(endOfWeek)})
              </Typography>
              <ActionButton
                icon={<Icon name="ArrowForward" />}
                onClick={handleNextWeek}
                color="primary"
              />
            </Box>
            <Stack direction="row" spacing={1}>
              <SecondaryButton
                size="small"
                onClick={handleSaveMonthTemplate}
                disabled={!storeId || savingMonthTemplate}
              >
                Lưu mẫu tháng
              </SecondaryButton>
              <PrimaryButton
                size="small"
                onClick={handleApplyMonthTemplate}
                disabled={!storeId || applyingMonthTemplate}
              >
                Áp dụng mẫu tháng
              </PrimaryButton>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMassAddOpen(true)}
                disabled={!storeId || !shiftTemplatesData.length || !staffList.length}
              >
                Thêm nhân viên cho cả tháng
              </Button>
            </Stack>
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
                boxShadow: 3,
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #e0e0e0",
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  tableLayout: "fixed",
                  "& .MuiTableCell-root": {
                    border: "1px solid #e0e0e0",
                    px: 1,
                    py: 1.25,
                  },
                }}
                aria-label="schedule table"
              >
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell
                      align="center"
                      sx={{ width: "18%", fontWeight: 700, fontSize: "0.9rem" }}
                    >
                      Ca làm việc
                    </TableCell>
                    {weekDays.map((day, index) => (
                      <TableCell
                        key={index}
                        align="center"
                        sx={{ width: `${82 / 7}%`, fontWeight: 600 }}
                      >
                        {weekDayNames[index]} ({formatDate(day)})
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
                              const filteredShiftList = (shiftList || []).filter((it) => it.user_id);
                              setSelectedShiftDetail({
                                dayKey,
                                dayName: weekDayNames[weekDays.indexOf(day)],
                                date: formatDate(day),
                                shiftName,
                                shiftTemplate: tpl,
                                templateId,
                                shiftList: filteredShiftList,
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
                              <Tooltip title={(isPastDate(dayKey) || isPastShiftToday(dayKey, tpl)) ? "Không thể thêm nhân viên cho ca đã qua" : "Thêm nhân viên cho ca này"} arrow>
                                <span>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    disabled={isPastDate(dayKey) || isPastShiftToday(dayKey, tpl)}
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
                                      if (!isPastDate(dayKey) && !isPastShiftToday(dayKey, tpl)) {
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
        </>
      )}

      {activeTab === "shift-requests" && (
        <Box sx={{ mt: 3 }}>
          <ShiftChangeRequestManagement
            onRequestsUpdated={refreshShiftRequestCount}
          />
        </Box>
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

      {/* Mass add employee to all shifts in month */}
      <Dialog
        open={massAddOpen}
        onClose={() => !massAddLoading && setMassAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm nhân viên cho cả tháng</DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2 }}>
            Chọn <strong>ca làm việc</strong> (ví dụ: Ca Sáng) và <strong>nhân viên</strong> muốn thêm cho toàn bộ các ngày trong tháng hiện tại.
            Hệ thống sẽ chỉ tạo ca mới cho những ngày chưa có nhân viên này trong ca đó.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Ca làm việc"
              size="small"
              value={massAddTemplateId}
              onChange={(e) => setMassAddTemplateId(e.target.value)}
              fullWidth
            >
              {shiftTemplatesData.map((tpl) => (
                <MenuItem
                  key={tpl.shift_template_id || tpl.id}
                  value={tpl.shift_template_id || tpl.id}
                >
                  {formatShiftName(tpl)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Nhân viên"
              size="small"
              value={massAddEmployeeId}
              onChange={(e) => setMassAddEmployeeId(e.target.value)}
              fullWidth
            >
              {staffList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={massAddFromToday}
                  onChange={(e) => setMassAddFromToday(e.target.checked)}
                  size="small"
                />
              }
              label="Chỉ áp dụng từ hôm nay trở đi (không thay đổi các ngày đã qua)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <SecondaryButton
            onClick={() => setMassAddOpen(false)}
            disabled={massAddLoading}
          >
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleMassAddSubmit}
            disabled={massAddLoading}
            loading={massAddLoading}
          >
            Xác nhận
          </PrimaryButton>
        </DialogActions>
      </Dialog>

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
                            {!isPastDate(selectedShiftDetail.dayKey) && !isPastShiftToday(selectedShiftDetail.dayKey, selectedShiftDetail.shiftTemplate) ? (
                              <>
                                {attendance.status === 'checked_in' || attendance.status === 'checked_out' ? (
                                  <Tooltip title={attendance.status === 'checked_in' ? "Không thể đổi/xóa khi nhân viên đang làm việc" : "Không thể đổi/xóa khi nhân viên đã kết ca"} arrow>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", fontStyle: "italic" }}>
                                      {attendance.status === 'checked_in' ? "Đang làm việc" : "Đã kết ca"}
                                    </Typography>
                                  </Tooltip>
                                ) : (
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
                                )}
                              </>
                            ) : (
                              <Tooltip title="Không thể sửa lịch của ca đã qua" arrow>
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
            disabled={
              selectedShiftDetail &&
              (isPastDate(selectedShiftDetail.dayKey) ||
                isPastShiftToday(selectedShiftDetail.dayKey, selectedShiftDetail.shiftTemplate))
            }
            onClick={() => {
              if (
                selectedShiftDetail &&
                !isPastDate(selectedShiftDetail.dayKey) &&
                !isPastShiftToday(selectedShiftDetail.dayKey, selectedShiftDetail.shiftTemplate)
              ) {
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
          <SecondaryButton onClick={handleCloseConfirm}>Hủy</SecondaryButton>
          <DangerButton onClick={handleConfirmDelete}>Xóa</DangerButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleManagement;
