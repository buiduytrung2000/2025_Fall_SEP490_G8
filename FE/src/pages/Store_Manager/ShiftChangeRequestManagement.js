import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Divider,
    Tabs,
    Tab,
    Button,
} from '@mui/material';
import {
    CheckCircle,
    Close,
    Visibility,
    CalendarToday,
    Person,
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, DangerButton, Icon } from '../../components/common';
import {
    getShiftChangeRequests,
    reviewShiftChangeRequest,
    getShiftChangeRequestById,
} from '../../api/scheduleApi';
import { fetchEmployeeById } from '../../api/employeeApi';
import { useAuth } from '../../contexts/AuthContext';

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
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

const ShiftChangeRequestManagement = ({ onRequestsUpdated = () => {} }) => {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [openReviewDialog, setOpenReviewDialog] = useState(false);
    const [reviewStatus, setReviewStatus] = useState('approved');
    const [reviewNotes, setReviewNotes] = useState('');
    const [requestStats, setRequestStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        all: 0,
    });

    const loadStoreId = useCallback(async () => {
        try {
            const empRes = await fetchEmployeeById(user.id);
            const myStoreId = empRes?.data?.store_id || empRes?.data?.store?.store_id;
            if (myStoreId) {
                setStoreId(myStoreId);
            } else {
                ToastNotification.error('Không tìm thấy thông tin cửa hàng');
            }
        } catch (error) {
            ToastNotification.error('Không thể tải thông tin cửa hàng');
        }
    }, [user.id]);

    const fetchRequestStats = useCallback(async () => {
        if (!storeId) return;
        try {
            const config = [
                { key: 'pending', params: { status: 'pending' } },
                { key: 'approved', params: { status: 'approved' } },
                { key: 'rejected', params: { status: 'rejected' } },
                { key: 'all', params: {} },
            ];
            const responses = await Promise.all(
                config.map(({ params }) =>
                    getShiftChangeRequests({ store_id: storeId, ...params })
                )
            );
            const nextStats = { pending: 0, approved: 0, rejected: 0, all: 0 };
            config.forEach((cfg, idx) => {
                const res = responses[idx];
                if (res?.err === 0) {
                    nextStats[cfg.key] = res.data?.length || 0;
                }
            });
            setRequestStats(nextStats);
        } catch (error) {
            // giữ nguyên stats nếu lỗi
        }
    }, [storeId]);

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            // Always load all statuses so a request stays visible in the
            // corresponding tab after being reviewed.
            const res = await getShiftChangeRequests({ store_id: storeId });
            if (res?.err === 0) {
                setRequests(res.data || []);
                try {
                    await onRequestsUpdated();
                } catch (error) {
                    // ignore callback errors
                }
                fetchRequestStats();
            } else {
                ToastNotification.error(res?.msg || 'Không thể tải danh sách yêu cầu');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra khi tải danh sách yêu cầu');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [storeId, tabValue, onRequestsUpdated, fetchRequestStats]);

    useEffect(() => {
        loadStoreId();
    }, [loadStoreId]);

    useEffect(() => {
        if (storeId) {
            loadRequests();
            fetchRequestStats();
        }
    }, [storeId, loadRequests, fetchRequestStats]);

    const handleViewDetail = async (requestId) => {
        try {
            const res = await getShiftChangeRequestById(requestId);
            if (res?.err === 0) {
                setSelectedRequest(res.data);
                setOpenDetailDialog(true);
            } else {
                ToastNotification.error('Không thể tải chi tiết yêu cầu');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra');
            console.error(error);
        }
    };

    const handleOpenReview = (request, status) => {
        setSelectedRequest(request);
        setReviewStatus(status);
        setReviewNotes('');
        setOpenReviewDialog(true);
    };

    const handleReview = async () => {
        if (!selectedRequest) return;

        try {
            const res = await reviewShiftChangeRequest(
                selectedRequest.request_id,
                reviewStatus,
                reviewNotes || null
            );
            if (res.err === 0) {
                ToastNotification.success(`Đã ${reviewStatus === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu thành công`);
                setOpenReviewDialog(false);
                setSelectedRequest(null);
                loadRequests();
                fetchRequestStats();
            } else {
                ToastNotification.error(res.msg || 'Xử lý yêu cầu thất bại');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra khi xử lý yêu cầu');
            console.error(error);
        }
    };

    const filteredRequests = requests.filter((req) => {
        if (tabValue === 0) return req.status === 'pending';
        if (tabValue === 1) return req.status === 'approved';
        if (tabValue === 2) return req.status === 'rejected';
        return true; // All
    });

    const summaryCards = [
        {
            label: 'Đang chờ',
            value: requestStats.pending,
            color: '#ff9800',
            bg: 'rgba(255, 152, 0, 0.1)',
        },
        {
            label: 'Đã duyệt',
            value: requestStats.approved,
            color: '#43a047',
            bg: 'rgba(67, 160, 71, 0.12)',
        },
        {
            label: 'Đã từ chối',
            value: requestStats.rejected,
            color: '#e53935',
            bg: 'rgba(229, 57, 53, 0.12)',
        },
    ];

    const totalRequests =
        requestStats.all || requestStats.pending + requestStats.approved + requestStats.rejected;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Quản lý yêu cầu đổi ca
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Duyệt hoặc từ chối yêu cầu đổi ca của nhân viên
            </Typography>

           

            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label={`Đang chờ (${requestStats.pending})`} />
                <Tab label={`Đã duyệt (${requestStats.approved})`} />
                <Tab label={`Đã từ chối (${requestStats.rejected})`} />
                <Tab label={`Tất cả (${totalRequests})`} />
            </Tabs>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : filteredRequests.length === 0 ? (
                <Alert severity="info">Không có yêu cầu nào</Alert>
            ) : (
                <Grid container spacing={2}>
                    {filteredRequests.map((request) => {
                        const fromSchedule = request.fromSchedule || {};
                        const toSchedule = request.toSchedule || {};
                        const fromTemplate = fromSchedule.shiftTemplate || {};
                        const toTemplate = toSchedule.shiftTemplate || {};
                        const fromUser = request.fromUser || {};

                        return (
                            <Grid item xs={12} md={6} key={request.request_id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {getRequestTypeLabel(request.request_type)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Từ: {fromUser.username || fromUser.email || `NV#${request.from_user_id}`}
                                                </Typography>
                                            </Box>
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
                                                    {formatDate(fromSchedule.work_date)} -{' '}
                                                    {fromTemplate.name || 'N/A'} (
                                                    {fromTemplate.start_time
                                                        ? `${formatTime(fromTemplate.start_time)} - ${formatTime(fromTemplate.end_time)}`
                                                        : 'N/A'}
                                                    )
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {request.request_type === 'swap' && (
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                    {toSchedule.work_date ? 'Đổi với ca:' : request.to_work_date ? 'Đổi với ca trống:' : 'Để quản lý tự phân công'}
                                                </Typography>
                                                {toSchedule.work_date ? (
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
                                                ) : request.to_work_date ? (
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <CalendarToday fontSize="small" />
                                                        <Typography variant="body2">
                                                            {formatDate(request.to_work_date)} - Ca trống
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                        Quản lý sẽ tự phân công
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {(request.request_type === 'give_away' || request.request_type === 'take_over') &&
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

                                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                            <Typography variant="caption" color="text.secondary">
                                                {request.requested_at
                                                    ? new Date(request.requested_at).toLocaleString('vi-VN')
                                                    : 'N/A'}
                                            </Typography>
                                            <Box display="flex" gap={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Visibility />}
                                                    onClick={() => handleViewDetail(request.request_id)}
                                                >
                                                    Chi tiết
                                                </Button>
                                                {request.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<CheckCircle />}
                                                            onClick={() => handleOpenReview(request, 'approved')}
                                                        >
                                                            Duyệt
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="error"
                                                            startIcon={<Close />}
                                                            onClick={() => handleOpenReview(request, 'rejected')}
                                                        >
                                                            Từ chối
                                                        </Button>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Detail Dialog */}
            <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Chi tiết yêu cầu đổi ca</DialogTitle>
                <DialogContent>
                    {selectedRequest && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Thông tin yêu cầu
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            {/* Hiển thị chi tiết đầy đủ */}
                            <Typography variant="body2">
                                <strong>Loại:</strong> {getRequestTypeLabel(selectedRequest.request_type)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Trạng thái:</strong>{' '}
                                <Chip
                                    label={getStatusLabel(selectedRequest.status)}
                                    color={getStatusColor(selectedRequest.status)}
                                    size="small"
                                />
                            </Typography>
                            {selectedRequest.review_notes && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Ghi chú:</strong> {selectedRequest.review_notes}
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailDialog(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Review Dialog */}
            <Dialog open={openReviewDialog} onClose={() => setOpenReviewDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {reviewStatus === 'approved' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Ghi chú (tùy chọn)"
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Nhập ghi chú cho nhân viên..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReviewDialog(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color={reviewStatus === 'approved' ? 'success' : 'error'}
                        onClick={handleReview}
                    >
                        {reviewStatus === 'approved' ? 'Duyệt' : 'Từ chối'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ShiftChangeRequestManagement;


