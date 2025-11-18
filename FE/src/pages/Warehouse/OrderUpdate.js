import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateExpectedDelivery
} from '../../api/warehouseOrderApi';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'secondary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const formatVnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrderUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;
        setOrder(orderData);

        if (orderData.expected_delivery) {
          const date = new Date(orderData.expected_delivery);
          const formatted = date.toISOString().slice(0, 16);
          setNewDeliveryDate(formatted);
        }
      } else {
        toast.error(response.msg || 'Không thể tải thông tin đơn hàng');
        navigate('/warehouse/branch-orders');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
      navigate('/warehouse/branch-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  const handleConfirmOrder = async () => {
    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, 'confirmed');
      if (response.err === 0) {
        toast.success('Xác nhận đơn hàng thành công!');
        setConfirmDialog(false);
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể xác nhận đơn hàng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, 'cancelled', rejectReason);
      if (response.err === 0) {
        toast.success('Đã từ chối đơn hàng');
        setRejectDialog(false);
        navigate('/warehouse/branch-orders');
      } else {
        toast.error(response.msg || 'Không thể từ chối đơn hàng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!newDeliveryDate) {
      toast.error('Vui lòng chọn ngày giao hàng');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateExpectedDelivery(id, newDeliveryDate);
      if (response.err === 0) {
        toast.success('Cập nhật ngày giao hàng thành công!');
        setDeliveryDialog(false);
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật ngày giao hàng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGoToShipment = () => {
    navigate(`/warehouse/orders/${id}/shipment`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <Alert severity="error">Không tìm thấy đơn hàng</Alert>
      </Box>
    );
  }

  const isPending = order.status === 'pending';
  const canShip = ['confirmed', 'preparing', 'shipped'].includes(order.status);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#2e7d32', color: 'white', px: 4, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <CheckIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              orderupdate
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Kiểm tra và xác nhận đơn hàng từ chi nhánh
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: 4, py: 3 }}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={8}>
            {/* Order Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  Thông tin đơn hàng #ORD{String(order.order_id).padStart(3, '0')}
                </Typography>
                <Chip
                  label={statusLabels[order.status]}
                  color={statusColors[order.status]}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Chi nhánh:</strong> {order.store?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày đặt:</strong> {formatDate(order.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Người đặt:</strong> {order.store?.contact || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày cần hàng:</strong> {formatDate(order.expected_delivery)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Điện thoại:</strong> {order.store?.phone}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Products Table */}
            <Paper>
              <Box sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                <Typography variant="h6" fontWeight={600}>
                  Danh sách sản phẩm
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mã SP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Đơn vị</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL yêu cầu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Đơn giá</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.orderItems?.map((item, index) => {
                      const stockAvailable = item.inventory?.stock ?? 0;
                      const isLowStock = stockAvailable < item.quantity;

                      return (
                        <TableRow key={item.order_item_id} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.product?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.product?.unit || 'Thùng'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {item.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={stockAvailable}
                              size="small"
                              sx={{
                                bgcolor: isLowStock ? '#ff5252' : '#4caf50',
                                color: 'white',
                                fontWeight: 700,
                                minWidth: 50
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatVnd(item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {formatVnd(item.quantity * item.unit_price)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={7} align="right" sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>
                        Tổng cộng:
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          {formatVnd(order.totalAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column - Actions */}
          {order.status !== 'delivered' && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Thao tác
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ngày giao dự kiến
                    </Typography>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      size="small"
                      value={newDeliveryDate}
                      onChange={(e) => setNewDeliveryDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  {/* 
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ghi chú phản hồi
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      placeholder="Nhập ghi chú..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </Box> */}

                  <Divider />

                  {/* Single Update Button */}
                  {isPending && (
                    <>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<CheckIcon />}
                        onClick={() => setConfirmDialog(true)}
                        sx={{ py: 1.5, fontWeight: 600 }}
                      >
                        Xác nhận đơn hàng
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        size="large"
                        startIcon={<CancelIcon />}
                        onClick={() => setRejectDialog(true)}
                        sx={{ py: 1.5, fontWeight: 600 }}
                      >
                        Từ chối đơn hàng
                      </Button>
                    </>
                  )}

                  {canShip && (
                    <Link to={`/warehouse/order-shipment/${id}`}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<ShippingIcon />}
                        sx={{ py: 1.5, fontWeight: 600 }}
                      >
                        Chuyển sang xuất hàng
                      </Button>
                    </Link>
                  )}

                  {!isPending && !canShip && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleUpdateDelivery}
                      disabled={updating}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      Cập nhật ngày giao
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onClose={() => !updating && setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Xác nhận đơn hàng</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Bạn đang xác nhận đơn hàng <strong>#ORD{String(order.order_id).padStart(3, '0')}</strong>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái "Đã xác nhận" và bắt đầu quá trình chuẩn bị hàng.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirmOrder}
            variant="contained"
            color="success"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
          >
            {updating ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => !updating && setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối đơn hàng</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ Bạn đang từ chối đơn hàng <strong>#ORD{String(order.order_id).padStart(3, '0')}</strong>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleRejectOrder}
            variant="contained"
            color="error"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : <CancelIcon />}
          >
            {updating ? 'Đang xử lý...' : 'Từ chối'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderUpdate;
