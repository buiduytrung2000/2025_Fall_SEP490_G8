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
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateExpectedDelivery,
  updateOrderItemQuantity
} from '../../api/warehouseOrderApi';

// =====================================================
// CONSTANTS
// =====================================================

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
};

const statusLabels = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const formatVnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// =====================================================
// COMPONENT
// =====================================================

const OrderUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Dialogs
  const [statusDialog, setStatusDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  // Editable quantities
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const getAvailableStatuses = (currentStatus) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['pending', 'shipped', 'cancelled'],
      shipped: ['confirmed', 'delivered', 'cancelled'],
      delivered: ['shipped'],
      cancelled: ['pending']
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusTransitionMessage = (currentStatus, newStatus) => {
    const messages = {
      'pending_confirmed': '✅ Xác nhận đơn hàng và chuẩn bị xuất kho',
      'pending_cancelled': '❌ Hủy đơn hàng',
      'confirmed_pending': '⚠️ Chuyển ngược về chờ xử lý (có thể chỉnh sửa lại)',
      'confirmed_shipped': '🚚 Đơn hàng đang được vận chuyển đến chi nhánh',
      'confirmed_cancelled': '❌ Hủy đơn hàng đã xác nhận',
      'shipped_confirmed': '⚠️ Chuyển ngược về đã xác nhận (đã hủy vận chuyển)',
      'shipped_delivered': '✅ Xác nhận giao hàng thành công. Hệ thống sẽ tự động cập nhật tồn kho.',
      'shipped_cancelled': '❌ Hủy đơn đang giao',
      'delivered_shipped': '⚠️ Chuyển ngược về đang giao. Tồn kho sẽ được điều chỉnh lại.',
      'cancelled_pending': '🔄 Kích hoạt lại đơn hàng đã hủy'
    };

    const key = `${currentStatus}_${newStatus}`;
    return messages[key] || `Chuyển từ "${statusLabels[currentStatus]}" sang "${statusLabels[newStatus]}"`;
  };

  // =====================================================
  // DATA LOADING
  // =====================================================

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        setOrder(response.data);
        setNewStatus(response.data.status);
        if (response.data.expected_delivery) {
          const date = new Date(response.data.expected_delivery);
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

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === order.status) {
      setStatusDialog(false);
      return;
    }

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, newStatus);
      if (response.err === 0) {
        toast.success(response.msg || 'Cập nhật trạng thái thành công!');
        setStatusDialog(false);
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

  const handleUpdateDelivery = async () => {
    if (!newDeliveryDate) {
      toast.warning('Vui lòng chọn ngày giao hàng');
      return;
    }

    setUpdating(true);
    try {
      const formattedDate = new Date(newDeliveryDate).toISOString().slice(0, 19).replace('T', ' ');
      const response = await updateExpectedDelivery(id, formattedDate);
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

  const handleEditQuantity = (item) => {
    setEditingItemId(item.order_item_id);
    setEditingQuantity(item.actual_quantity ?? item.quantity);
  };

  const handleSaveQuantity = async (orderItemId) => {
    try {
      const response = await updateOrderItemQuantity(orderItemId, parseInt(editingQuantity));
      if (response.err === 0) {
        toast.success('Cập nhật số lượng thành công!');
        setEditingItemId(null);
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
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

  const availableStatuses = getAvailableStatuses(order.status);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/warehouse/branch-orders')}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Chi tiết đơn hàng #{order.order_id}
          </Typography>
          <Typography color="text.secondary">
            Ngày tạo: {formatDate(order.created_at)}
          </Typography>
        </Box>
        <Chip
          size="large"
          color={statusColors[order.status]}
          label={statusLabels[order.status]}
          sx={{ fontSize: '1rem', px: 2 }}
        />
      </Stack>

      {/* Action Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setStatusDialog(true)}
        >
          Thay đổi trạng thái
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setDeliveryDialog(true)}
        >
          Cập nhật ngày giao
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Order Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin đơn hàng
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cửa hàng đặt hàng
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {order.store?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.store?.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SĐT: {order.store?.phone}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nhà cung cấp
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {order.supplier?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Liên hệ: {order.supplier?.contact}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {order.supplier?.email}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Người tạo đơn
                  </Typography>
                  <Typography variant="body1">
                    {order.creator?.username} ({order.creator?.role})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.creator?.email}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Delivery Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin giao hàng
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ngày dự kiến giao
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatDate(order.expected_delivery)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tổng số sản phẩm
                  </Typography>
                  <Typography variant="h6">
                    {order.totalItems} sản phẩm
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tổng giá trị đơn hàng
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight={700}>
                    {formatVnd(order.totalAmount)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Order Items */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Chi tiết sản phẩm
              </Typography>
              <Divider sx={{ my: 2 }} />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Yêu cầu</TableCell>
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
                      const actualQty = item.actual_quantity ?? item.quantity;
                      const stockAvailable = item.inventory?.stock ?? 0;

                      return (
                        <TableRow key={item.order_item_id} hover>
                          <TableCell>{item.product?.sku}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.name}
                            </Typography>
                            {item.product?.description && (
                              <Typography variant="caption" color="text.secondary">
                                {item.product.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={item.product?.category?.name || 'N/A'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600}>
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
                                sx={{ width: 100 }}
                                InputProps={{
                                  inputProps: {
                                    min: 0,
                                    max: Math.min(item.quantity, stockAvailable)
                                  }
                                }}
                              />
                            ) : (
                              <Typography
                                fontWeight={600}
                                color={actualQty < item.quantity ? 'warning.main' : 'inherit'}
                              >
                                {actualQty}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={stockAvailable}
                              color={stockAvailable >= item.quantity ? 'success' : 'warning'}
                              sx={{ minWidth: 60 }}
                            />
                            {stockAvailable < item.quantity && (
                              <Typography variant="caption" color="error" display="block">
                                Thiếu {item.quantity - stockAvailable}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{formatVnd(item.unit_price)}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color="primary">
                              {formatVnd(actualQty * item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <Stack direction="row" spacing={1} justifyContent="center">
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
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={7} align="right">
                        <Typography variant="h6" fontWeight={700}>
                          Tổng cộng:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {formatVnd(order.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog}
        onClose={() => !updating && setStatusDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Cập nhật trạng thái đơn hàng #{order.order_id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {/* Current Status */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Trạng thái hiện tại
            </Typography>
            <Chip
              color={statusColors[order.status]}
              label={statusLabels[order.status]}
              size="medium"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {/* New Status Selection */}
          <TextField
            select
            fullWidth
            label="Chọn trạng thái mới"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            helperText={`Có ${availableStatuses.length} lựa chọn khả dụng`}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 400,
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                      px: 2,
                    },
                  },
                },
              },
            }}
          >
            {availableStatuses.length === 0 ? (
              <MenuItem disabled>Không có trạng thái khả dụng</MenuItem>
            ) : (
              availableStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip
                      size="small"
                      color={statusColors[status]}
                      label={statusLabels[status]}
                    />
                    {status === order.status && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        (Hiện tại)
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))
            )}
          </TextField>

          {/* Transition Info Alert */}
          {newStatus && newStatus !== order.status && (
            <Alert
              severity={
                newStatus === 'cancelled' ? 'error' :
                  newStatus === 'delivered' ? 'success' :
                    ['pending', 'confirmed'].includes(newStatus) &&
                      ['shipped', 'delivered'].includes(order.status) ? 'warning' : 'info'
              }
              sx={{ mt: 2 }}
            >
              {getStatusTransitionMessage(order.status, newStatus)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={updating || newStatus === order.status}
            color={newStatus === 'cancelled' ? 'error' : 'primary'}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {updating ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Date Update Dialog */}
      <Dialog
        open={deliveryDialog}
        onClose={() => !updating && setDeliveryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cập nhật ngày giao hàng</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="datetime-local"
            label="Ngày giao dự kiến"
            value={newDeliveryDate}
            onChange={(e) => setNewDeliveryDate(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateDelivery}
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {updating ? 'Đang cập nhật...' : 'Cập nhật'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderUpdate;
