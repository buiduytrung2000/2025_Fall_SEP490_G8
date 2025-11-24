import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Divider,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';
import { getWarehouseSupplierOrderDetail, updateWarehouseSupplierOrderStatus, updateWarehouseSupplierExpectedDelivery } from '../../../api/warehouseOrderApi';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'default',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
};

const nextTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  const loadDetail = async () => {
    setLoading(true); setError('');
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        setOrder(res.data);
        setDeliveryDate(res.data.expected_delivery ? res.data.expected_delivery.substring(0, 10) : '');
      } else setError(res.msg || 'Không tìm thấy đơn hàng');
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDetail(); }, [orderId]);

  const handleUpdateStatus = async () => {
    if (!order) return;
    const options = nextTransitions[order.status] || [];
    if (options.length === 0) return;
    const next = window.prompt(`Cập nhật trạng thái đơn #${order.order_id}.\nTrạng thái hiện tại: ${order.status}.\nNhập một trong: ${options.join(', ')}`);
    if (!next) return;
    if (!options.includes(next)) return toast.error('Trạng thái không hợp lệ');
    try {
      const res = await updateWarehouseSupplierOrderStatus(order.order_id, next);
      if (res.err === 0) {
        toast.success('Cập nhật trạng thái thành công');
        loadDetail();
      } else toast.error(res.msg || 'Không thể cập nhật trạng thái');
    } catch (e) { toast.error('Lỗi kết nối: ' + e.message); }
  };

  const handleUpdateDelivery = async () => {
    if (!order) return;
    setUpdatingDelivery(true);
    try {
      const res = await updateWarehouseSupplierExpectedDelivery(order.order_id, deliveryDate || null);
      if (res.err === 0) { toast.success('Cập nhật ngày giao dự kiến thành công'); loadDetail(); }
      else toast.error(res.msg || 'Không thể cập nhật');
    } catch (e) { toast.error('Lỗi kết nối: ' + e.message); }
    finally { setUpdatingDelivery(false); }
  };

  if (loading) return (<Box p={2}><CircularProgress /></Box>);
  if (error) return (<Box p={2}><Alert severity="error">{error}</Alert></Box>);
  if (!order) return null;

  const totalAmount = Number(order.totalAmount || 0);

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Chi tiết đơn hàng #{order.order_id}</Typography>
        <Stack direction="row" spacing={1}>
          <Chip size="small" color={statusColors[order.status] || 'default'} label={order.status} />
          <Button variant="outlined" onClick={() => navigate('/warehouse/orders')}>Quay lại</Button>
          {(nextTransitions[order.status] || []).length > 0 && (
            <Button variant="contained" onClick={handleUpdateStatus}>Cập nhật trạng thái</Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography><b>Nhà cung cấp:</b> {order.supplier?.name || '—'}</Typography>
            <Typography><b>Người tạo:</b> {order.creator?.username || order.creator?.email || '—'}</Typography>
            <Typography><b>Ngày tạo:</b> {new Date(order.created_at).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField type="date" label="Ngày giao dự kiến" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} size="small" />
              <Button onClick={handleUpdateDelivery} disabled={updatingDelivery}>{updatingDelivery ? 'Đang lưu...' : 'Lưu'}</Button>
            </Stack>
            <Typography sx={{ mt: 1 }}><b>Tổng tiền:</b> {totalAmount.toLocaleString('vi-VN')} đ</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>Sản phẩm</Typography>
        <Divider />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Tên sản phẩm</TableCell>
              <TableCell align="right">Số lượng</TableCell>
              <TableCell align="right">Đơn giá</TableCell>
              <TableCell align="right">Thành tiền</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(order.orderItems || []).map(it => (
              <TableRow key={it.order_item_id}>
                <TableCell>{it.product?.sku || '—'}</TableCell>
                <TableCell>{it.product?.name || '—'}</TableCell>
                <TableCell align="right">{Number(it.quantity).toLocaleString('vi-VN')}</TableCell>
                <TableCell align="right">{Number(it.unit_price).toLocaleString('vi-VN')} đ</TableCell>
                <TableCell align="right">{Number(it.subtotal).toLocaleString('vi-VN')} đ</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
