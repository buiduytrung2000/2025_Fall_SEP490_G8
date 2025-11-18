import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateOrderItemQuantity,
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

const OrderShipment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;

        if (orderData.status === 'pending') {
          toast.warning('Đơn hàng này chưa được xác nhận');
          navigate('/warehouse/branch-orders');
          return;
        }

        if (orderData.status === 'cancelled') {
          toast.error('Đơn hàng này đã bị hủy');
          navigate('/warehouse/branch-orders');
          return;
        }

        setOrder(orderData);
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

  // =====================================================
  // HELPER FUNCTIONS - Status Flow
  // =====================================================

  const getStatusStep = (status) => {
    const steps = ['confirmed', 'preparing', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      confirmed: 'preparing',
      preparing: 'shipped',
      shipped: 'delivered'
    };
    return flow[currentStatus] || null;
  };

  const getStatusActionLabel = (status) => {
    const labels = {
      preparing: 'Bắt đầu chuẩn bị hàng',
      shipped: 'Xuất kho và giao hàng',
      delivered: 'Xác nhận đã giao'
    };
    return labels[status] || 'Cập nhật trạng thái';
  };

  const getStatusActionIcon = (status) => {
    const icons = {
      preparing: <InventoryIcon />,
      shipped: <ShippingIcon />,
      delivered: <CheckIcon />
    };
    return icons[status] || <CheckIcon />;
  };

  // =====================================================
  // EVENT HANDLERS - Quantity Update
  // =====================================================

  const handleEditQuantity = (item) => {
    setEditingItemId(item.order_item_id);
    setEditingQuantity(item.actual_quantity ?? item.quantity);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleSaveQuantity = async (itemId) => {
    const qty = parseInt(editingQuantity);

    if (isNaN(qty) || qty < 0) {
      toast.error('Số lượng không hợp lệ');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateOrderItemQuantity(itemId, qty);
      if (response.err === 0) {
        toast.success('Cập nhật số lượng thực tế thành công!');
        handleCancelEdit();
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // EVENT HANDLERS - Status Update
  // =====================================================

  const handleOpenConfirmDialog = () => {
    const next = getNextStatus(order.status);
    if (!next) {
      toast.warning('Không thể cập nhật trạng thái tiếp theo');
      return;
    }
    setNextStatus(next);
    setConfirmDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, nextStatus);
      if (response.err === 0) {
        toast.success(response.msg || 'Cập nhật trạng thái thành công!');
        setConfirmDialog(false);
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

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

  const totalUnits = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAmount = order.orderItems?.reduce((sum, item) => {
    const qty = item.actual_quantity ?? item.quantity;
    return sum + (qty * item.unit_price);
  }, 0) || 0;

  const currentStep = getStatusStep(order.status);
  const next = getNextStatus(order.status);
  const canProceed = next && order.status !== 'delivered';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1976d2', color: 'white', px: 4, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ShippingIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              ordershipment
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
                  Đơn hàng #ORD{String(order.order_id).padStart(3, '0')}
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
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày giao dự kiến:</strong> {formatDate(order.expected_delivery)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Status Stepper */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Tiến trình xuất hàng
              </Typography>
              <Stepper activeStep={currentStep} sx={{ mt: 2 }}>
                <Step>
                  <StepLabel>Đã xác nhận</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Chuẩn bị hàng</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Đang giao</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Đã giao</StepLabel>
                </Step>
              </Stepper>
            </Paper>

            {/* Summary Info */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin đơn hàng
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số lượng:
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {totalUnits} sản phẩm
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng giá trị:
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {formatVnd(totalAmount)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Products Table */}
            <Paper>
              <Box sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                <Typography variant="h6" fontWeight={600}>
                  Chi tiết sản phẩm xuất kho
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mã SP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ĐVT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Đặt</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Thực tế</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Đơn giá</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Thành tiền</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.orderItems?.map((item) => {
                      const isEditing = editingItemId === item.order_item_id;
                      const displayQty = item.actual_quantity ?? item.quantity;
                      const stockAvailable = item.inventory?.stock ?? 0;
                      const isLowStock = stockAvailable < item.quantity;

                      return (
                        <TableRow key={item.order_item_id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.product?.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.product?.unit || 'Thùng'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {item.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {isEditing ? (
                              <TextField
                                type="number"
                                size="small"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                sx={{ width: 80 }}
                                InputProps={{
                                  inputProps: {
                                    min: 0,
                                    max: Math.min(item.quantity, stockAvailable)
                                  }
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={displayQty !== item.quantity ? 'warning.main' : 'inherit'}
                              >
                                {displayQty}
                              </Typography>
                            )}
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
                              {formatVnd(displayQty * item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {order.status !== 'delivered' && order.status !== 'shipped' && (
                              isEditing ? (
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleSaveQuantity(item.order_item_id)}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleCancelEdit}
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditQuantity(item)}
                                  disabled={stockAvailable === 0}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )
                            )}
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
                          {formatVnd(totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f5f5f5' }} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column - Action */}
          {order.status !== 'shipped' && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Thao tác xuất kho
                </Typography>
                <Divider sx={{ my: 2 }} />

                {canProceed ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Trạng thái hiện tại: <strong>{statusLabels[order.status]}</strong>
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={getStatusActionIcon(next)}
                      onClick={handleOpenConfirmDialog}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {getStatusActionLabel(next)}
                    </Button>
                  </>
                ) : order.status === 'delivered' ? (
                  <Alert severity="success">
                    ✅ Đơn hàng đã được giao thành công vào {formatDate(order.updated_at)}
                  </Alert>
                ) : (
                  <Alert severity="info">
                    Đơn hàng đang trong quá trình xử lý
                  </Alert>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Status Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => !updating && setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Xác nhận cập nhật trạng thái
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={nextStatus === 'delivered' ? 'success' : 'info'}
            sx={{ mb: 2 }}
          >
            {nextStatus === 'preparing' && '📦 Bắt đầu chuẩn bị hàng cho đơn hàng này'}
            {nextStatus === 'shipped' && '🚚 Xuất kho và bắt đầu vận chuyển đơn hàng'}
            {nextStatus === 'delivered' && '✅ Xác nhận đã giao hàng thành công. Tồn kho sẽ được cập nhật tự động.'}
          </Alert>

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái hiện tại
                </Typography>
                <Chip
                  color={statusColors[order.status]}
                  label={statusLabels[order.status]}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Typography variant="h5" color="text.secondary">→</Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái mới
                </Typography>
                <Chip
                  color={statusColors[nextStatus]}
                  label={statusLabels[nextStatus]}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={updating}
            color={nextStatus === 'delivered' ? 'success' : 'primary'}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : getStatusActionIcon(nextStatus)}
          >
            {updating ? 'Đang cập nhật...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderShipment;
