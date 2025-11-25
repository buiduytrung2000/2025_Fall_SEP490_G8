import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Lock as LockIcon,
  CalendarToday as CalendarIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseSupplierOrderDetail,
  updateWarehouseSupplierOrderStatus,
  updateWarehouseSupplierExpectedDelivery
} from '../../../api/warehouseOrderApi';
import { updateOrderItems } from '../../../api/orderApi';
import OrderItemsEditor from '../../../components/OrderItemsEditor';
import ProductSelectorDialog from '../../../components/ProductSelectorDialog';

// Three-stage status system
const statusColors = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error'
};

const statusLabels = {
  pending: 'Đang chờ',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy'
};

const nextTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: [], // No transitions from confirmed
  cancelled: []  // No transitions from cancelled
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState('');
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  // Status update dialog
  const [updateDialog, setUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // Product selector dialog
  const [productDialog, setProductDialog] = useState(false);

  const loadDetail = async () => {
    setLoading(true); setError('');
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        setOrder(res.data);
        const deliveryDateStr = res.data.expected_delivery ? res.data.expected_delivery.substring(0, 10) : '';
        setDeliveryDate(deliveryDateStr);
        setOriginalDeliveryDate(deliveryDateStr);
      } else setError(res.msg || 'Không tìm thấy đơn hàng');
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDetail(); }, [orderId]);

  const handleUpdateStatus = () => {
    if (!order) return;
    const options = nextTransitions[order.status] || [];
    if (options.length === 0) {
      toast.info('Không thể thay đổi trạng thái của đơn hàng này');
      return;
    }
    setNewStatus(options[0]);
    setUpdateDialog(true);
  };

  const confirmUpdateStatus = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const res = await updateWarehouseSupplierOrderStatus(order.order_id, newStatus);
      if (res.err === 0) {
        toast.success('Cập nhật trạng thái thành công');
        setUpdateDialog(false);
        loadDetail();
      } else {
        toast.error(res.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (e) {
      toast.error('Lỗi kết nối: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!deliveryDate) {
      toast.error('Vui lòng chọn ngày giao hàng');
      return;
    }
    if (order.status !== 'pending') {
      toast.error('Chỉ có thể cập nhật ngày giao cho đơn hàng đang chờ');
      return;
    }
    if (deliveryDate === originalDeliveryDate) {
      toast.info('Ngày giao hàng không thay đổi');
      return;
    }

    setUpdatingDelivery(true);
    try {
      const res = await updateWarehouseSupplierExpectedDelivery(order.order_id, deliveryDate);

      if (res.err === 0) {
        toast.success('Cập nhật ngày giao thành công');
        setOriginalDeliveryDate(deliveryDate);
        loadDetail();
      } else toast.error(res.msg || 'Không thể cập nhật ngày giao');
    } catch (e) {
      toast.error('Lỗi kết nối: ' + e.message);
    } finally {
      setUpdatingDelivery(false);
    }
  };

  const handleSaveOrderItems = async (updatedItems) => {
    try {
      const data = await updateOrderItems(orderId, updatedItems);

      if (data.err === 0) {
        loadDetail(); // Reload to get updated data
      } else {
        throw new Error(data.msg || 'Không thể cập nhật đơn hàng');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleAddProduct = async (newItem) => {
    // Add the new item to existing items and save
    const currentItems = order.orderItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      unit_id: item.unit_id
    }));

    const updatedItems = [...currentItems, {
      product_id: newItem.product_id,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      unit_id: newItem.unit_id
    }];

    await handleSaveOrderItems(updatedItems);
  };

  const isEditable = order?.status === 'pending';
  const hasDeliveryDateChanges = deliveryDate !== originalDeliveryDate;

  if (loading) return <Box p={2}><CircularProgress /></Box>;
  if (error) return <Box p={2}><Alert severity="error">{error}</Alert></Box>;
  if (!order) return <Box p={2}><Alert severity="info">Không tìm thấy đơn hàng</Alert></Box>;

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>Chi tiết đơn hàng #{order.order_id}</Typography>
          {!isEditable && (
            <Chip
              icon={<LockIcon />}
              label="Đã khóa"
              size="small"
              color="default"
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            color={statusColors[order.status] || 'default'}
            label={statusLabels[order.status] || order.status}
          />
          <Button variant="outlined" onClick={() => navigate('/warehouse/orders')}>Quay lại</Button>
          {(nextTransitions[order.status] || []).length > 0 && (
            <Button variant="contained" onClick={handleUpdateStatus}>Cập nhật trạng thái</Button>
          )}
        </Stack>
      </Stack>

      {!isEditable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Đơn hàng này đã được {order.status === 'confirmed' ? 'xác nhận' : 'hủy'} và không thể chỉnh sửa.
        </Alert>
      )}

      {/* Order Information */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Thông tin đơn hàng</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography><b>Nhà cung cấp:</b> {order.supplier?.name || '—'}</Typography>
            <Typography><b>Người tạo:</b> {order.creator?.username || order.creator?.email || '—'}</Typography>
            <Typography><b>Ngày tạo:</b> {new Date(order.created_at).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="date"
                  label="Ngày giao dự kiến"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  disabled={!isEditable}
                  sx={{ flexGrow: 1 }}
                />
                {isEditable && hasDeliveryDateChanges && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdateDelivery}
                    disabled={updatingDelivery}
                  >
                    {updatingDelivery ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {isEditable ? 'Có thể cập nhật ngày giao' : 'Không thể cập nhật ngày giao cho đơn đã khóa'}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Order Items */}
      <Paper sx={{ p: 2 }}>
        <OrderItemsEditor
          orderItems={order.orderItems || []}
          isEditable={isEditable}
          onSave={handleSaveOrderItems}
          onAddProduct={() => setProductDialog(true)}
        />
      </Paper>

      {/* Status Update Dialog */}
      <Dialog open={updateDialog} onClose={() => !updating && setUpdateDialog(false)}>
        <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Đơn hàng #{order.order_id}
          </Typography>
          <TextField
            select
            fullWidth
            label="Trạng thái mới"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={updating}
          >
            {(nextTransitions[order.status] || []).map(s => (
              <MenuItem key={s} value={s}>{statusLabels[s]}</MenuItem>
            ))}
          </TextField>
          {newStatus === 'confirmed' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Xác nhận đơn hàng sẽ cập nhật tồn kho và khóa đơn hàng. Không thể hoàn tác!
            </Alert>
          )}
          {newStatus === 'cancelled' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Hủy đơn hàng sẽ khóa đơn hàng. Không thể hoàn tác!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog(false)} disabled={updating}>Hủy</Button>
          <Button onClick={confirmUpdateStatus} variant="contained" disabled={updating || !newStatus}>
            {updating ? 'Đang cập nhật...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>




      {/* Product Selector Dialog */}
      <ProductSelectorDialog
        open={productDialog}
        onClose={() => setProductDialog(false)}
        onAdd={handleAddProduct}
        existingProductIds={order.orderItems?.map(item => item.product_id) || []}
      />
    </Box>
  );
}