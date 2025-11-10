import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
import {
    SwapHoriz,
    Send,
    Cancel,
    CalendarToday,
    Person,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
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
    const [allPossibleShifts, setAllPossibleShifts] = useState([]); // Tất cả các ca có thể có (kể cả trống)

    // Form state
    const [formData, setFormData] = useState({
        request_type: 'swap',
        from_schedule_id: '',
        to_schedule_id: '',
        to_user_id: '',
        reason: '',
        swap_option: 'auto', // 'auto' hoặc 'manual'
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Get employee info to get store_id
            const empRes = await fetchEmployeeById(user.id);
            const myStoreId = empRes?.data?.store_id || empRes?.data?.store?.store_id;
            if (!myStoreId) {
                toast.error('Không tìm thấy thông tin cửa hàng');
                setLoading(false);
                return;
            }
            setStoreId(myStoreId);

            // Get current date range (next 30 days)
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 30);
            const startStr = today.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            // Load schedules, shift templates, and requests
            const [schedulesRes, templatesRes, requestsRes] = await Promise.all([
                getMySchedules(startStr, endStr),
                getShiftTemplates(),
                getMyShiftChangeRequests(),
            ]);

            if (schedulesRes?.err === 0) {
                setMySchedules(schedulesRes.data || []);
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
            toast.error('Không thể tải dữ liệu');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenDialog = async (schedule = null) => {
        if (schedule) {
            setFormData({
                request_type: 'swap',
                from_schedule_id: schedule.schedule_id,
                to_schedule_id: '',
                to_user_id: '',
                reason: '',
                swap_option: 'auto',
            });
        } else {
            setFormData({
                request_type: 'swap',
                from_schedule_id: '',
                to_schedule_id: '',
                to_user_id: '',
                reason: '',
                swap_option: 'auto',
            });
        }
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
            toast.error('Vui lòng chọn ca muốn đổi');
            return;
        }

        // Kiểm tra nếu chọn option "manual" thì phải chọn ca/nhân viên
        if (formData.request_type === 'swap' && formData.swap_option === 'manual' && !formData.to_schedule_id) {
            toast.error('Vui lòng chọn ca muốn đổi với');
            return;
        }

        if ((formData.request_type === 'give_away' || formData.request_type === 'take_over') && formData.swap_option === 'manual' && !formData.to_user_id) {
            toast.error('Vui lòng chọn nhân viên');
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
                toast.success('Gửi yêu cầu thành công');
                handleCloseDialog();
                loadData();
            } else {
                toast.error(res.msg || 'Gửi yêu cầu thất bại');
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra khi gửi yêu cầu');
            console.error(error);
        }
    };

    const selectedSchedule = useMemo(() => {
        return mySchedules.find((s) => s.schedule_id === parseInt(formData.from_schedule_id));
    }, [formData.from_schedule_id, mySchedules]);

    const getScheduleLabel = (schedule) => {
        // Handle both Sequelize instances and plain objects
        const scheduleData = schedule.get ? schedule.get({ plain: true }) : schedule;
        const template = scheduleData.shiftTemplate || shiftTemplates.find(
            (t) => t.shift_template_id === scheduleData.shift_template_id || t.id === scheduleData.shift_template_id
        );
        const date = formatDate(scheduleData.work_date);
        const time = template
            ? `${formatTime(template.start_time)} - ${formatTime(template.end_time)}`
            : '';
        const employee = scheduleData.employee || {};
        const employeeName = employee.username || employee.email || (scheduleData.user_id ? `NV#${scheduleData.user_id}` : '');
        
        if (scheduleData.is_empty) {
            return `${date} - ${template?.name || 'Ca'} (${time}) - [Ca trống]`;
        }
        return `${date} - ${template?.name || 'Ca'} (${time})${employeeName ? ` - ${employeeName}` : ''}`;
    };

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
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Lịch làm việc của tôi (30 ngày tới)</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<SwapHoriz />}
                                    onClick={() => handleOpenDialog()}
                                >
                                    Tạo yêu cầu đổi ca
                                </Button>
                            </Box>

                            {mySchedules.length === 0 ? (
                                <Alert severity="info">Bạn chưa có lịch làm việc nào</Alert>
                            ) : (
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Ngày</TableCell>
                                                <TableCell>Ca làm việc</TableCell>
                                                <TableCell>Thời gian</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                                <TableCell>Thao tác</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {mySchedules.map((schedule) => {
                                                const template = shiftTemplates.find(
                                                    (t) =>
                                                        t.shift_template_id === schedule.shift_template_id ||
                                                        t.id === schedule.shift_template_id
                                                );
                                                return (
                                                    <TableRow key={schedule.schedule_id}>
                                                        <TableCell>{formatDate(schedule.work_date)}</TableCell>
                                                        <TableCell>{template?.name || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            {template
                                                                ? `${formatTime(template.start_time)} - ${formatTime(template.end_time)}`
                                                                : 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={schedule.status || 'confirmed'}
                                                                size="small"
                                                                color={schedule.status === 'confirmed' ? 'success' : 'default'}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<SwapHoriz />}
                                                                onClick={() => handleOpenDialog(schedule)}
                                                            >
                                                                Đổi ca
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
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
                                                        </Box>

                                                        {request.request_type === 'swap' && toSchedule.work_date && (
                                                            <Box mb={2}>
                                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                    Đổi với ca:
                                                                </Typography>
                                                                <Box display="flex" alignItems="center" gap={1}>
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
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="error"
                                                                    startIcon={<Cancel />}
                                                                    onClick={async () => {
                                                                        if (window.confirm('Bạn có chắc muốn hủy yêu cầu này?')) {
                                                                            try {
                                                                                const res = await cancelShiftChangeRequest(request.request_id);
                                                                                if (res.err === 0) {
                                                                                    toast.success('Hủy yêu cầu thành công');
                                                                                    loadData();
                                                                                } else {
                                                                                    toast.error(res.msg || 'Hủy yêu cầu thất bại');
                                                                                }
                                                                            } catch (error) {
                                                                                toast.error('Có lỗi xảy ra khi hủy yêu cầu');
                                                                                console.error(error);
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    Hủy
                                                                </Button>
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
                            <InputLabel>Chọn ca muốn đổi *</InputLabel>
                            <Select
                                value={formData.from_schedule_id}
                                label="Chọn ca muốn đổi *"
                                onChange={(e) => setFormData({ ...formData, from_schedule_id: e.target.value })}
                            >
                                {mySchedules
                                    .filter((s) => s.status === 'confirmed')
                                    .map((schedule) => (
                                        <MenuItem key={schedule.schedule_id} value={schedule.schedule_id}>
                                            {getScheduleLabel(schedule)}
                                        </MenuItem>
                                    ))}
                            </Select>
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
                                        <FormControlLabel value="auto" control={<Radio />} label="Để quản lý tự phân công" />
                                        <FormControlLabel value="manual" control={<Radio />} label="Chọn ca muốn đổi" />
                                    </RadioGroup>
                                </FormControl>

                                {formData.swap_option === 'manual' && (
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Chọn ca muốn đổi với *</InputLabel>
                                        <Select
                                            value={formData.to_schedule_id || ''}
                                            label="Chọn ca muốn đổi với *"
                                            onChange={(e) => setFormData({ ...formData, to_schedule_id: e.target.value || null })}
                                        >
                                            {allPossibleShifts.length === 0 ? (
                                                <MenuItem disabled value="">
                                                    Đang tải danh sách ca...
                                                </MenuItem>
                                            ) : (
                                                allPossibleShifts.map((shift, index) => {
                                                    const key = shift.schedule_id || `empty-${shift.work_date}-${shift.shift_template_id}-${index}`;
                                                    const value = shift.schedule_id || `empty-${shift.work_date}-${shift.shift_template_id}`;
                                                    return (
                                                        <MenuItem key={key} value={value}>
                                                            {getScheduleLabel(shift)}
                                                        </MenuItem>
                                                    );
                                                })
                                            )}
                                        </Select>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                            Danh sách bao gồm cả ca trống và ca đã có nhân viên
                                        </Typography>
                                    </FormControl>
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
                    <Button onClick={handleCloseDialog}>Hủy</Button>
                    <Button variant="contained" onClick={handleSubmit} startIcon={<Send />}>
                        Gửi yêu cầu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ShiftChangeRequest;

