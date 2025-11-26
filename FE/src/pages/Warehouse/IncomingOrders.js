// src/pages/Warehouse/IncomingOrders.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  MenuItem,
  TextField,
  Stack
} from '@mui/material';
import { toast } from 'react-toastify';
import { getAllWarehouseOrders, updateWarehouseOrderStatus } from '../../api/warehouseOrderApi';

const STATUS_OPTIONS = [
  { value: 'All', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'confirmed', label: 'Đã duyệt' },
  { value: 'shipped', label: 'Đã xuất kho' },
  { value: 'delivered', label: 'Cửa hàng đã nhận' },
  { value: 'cancelled', label: 'Đã hủy' }
];

const STATUS_META = {
  pending: { label: 'Chờ duyệt', color: 'warning' },
  confirmed: { label: 'Đã duyệt', color: 'info' },
  shipped: { label: 'Đã xuất kho', color: 'primary' },
  delivered: { label: 'Cửa hàng đã nhận', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'default' }
};

const STATUS_ACTIONS = {
  pending: { label: 'Duyệt đơn', nextStatus: 'confirmed' },
  confirmed: { label: 'Xuất kho', nextStatus: 'shipped' }
};

const IncomingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllWarehouseOrders({
        status: status === 'All' ? undefined : status,
        limit: 50,
        page: 1
      });

      if (response.err === 0) {
        setOrders(response.data?.orders || []);
      } else {
        toast.error(response.msg || 'Không thể tải danh sách đơn');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading warehouse orders:', error);
      toast.error('Lỗi kết nối máy chủ');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (status === 'All') return orders;
    return orders.filter(order => order.status === status);
  }, [orders, status]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      const response = await updateWarehouseOrderStatus(orderId, nextStatus);
      if (response.err === 0) {
        toast.success(response.msg || 'Cập nhật trạng thái thành công');
        await fetchOrders();
      } else {
        toast.error(response.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');
  const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : 'N/A';

  const renderStatusChip = (statusValue) => {
    const meta = STATUS_META[statusValue?.toLowerCase()] || STATUS_META.pending;
    return <Chip size="small" label={meta.label} color={meta.color} />;
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        justifyContent="space-between" 
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Đơn nhập từ cửa hàng
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Tiếp nhận và duyệt đơn do cửa hàng gửi
          </Typography>
        </Box>
        <TextField 
          select 
          size="small" 
          value={status} 
          onChange={(e) => setStatus(e.target.value)} 
          label="Lọc trạng thái" 
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          {STATUS_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Cửa hàng</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Người tạo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Số dòng</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Tổng tiền</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => {
              const statusKey = r.status?.toLowerCase();
              const action = STATUS_ACTIONS[statusKey];
              const canCancel = ['pending', 'confirmed'].includes(statusKey);
              const items = r.orderItems || r.storeOrderItems || [];
              return (
                <TableRow key={r.store_order_id} hover>
                  <TableCell>{r.store_order_id}</TableCell>
                  <TableCell>{r.store?.name || 'N/A'}</TableCell>
                  <TableCell>{r.creator?.username || r.creator?.email || 'N/A'}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                  <TableCell align="right">{items.length}</TableCell>
                  <TableCell align="right">{formatCurrency(r.totalAmount || r.total_amount)} đ</TableCell>
                  <TableCell>{renderStatusChip(r.status)}</TableCell>
                  <TableCell>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: 200, sm: 'auto' } }}>
                      {action && (
                        <Button 
                          disabled={updatingId === r.store_order_id}
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleUpdateStatus(r.store_order_id, action.nextStatus)}
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          {action.label}
                        </Button>
                      )}
                      {canCancel && (
                        <Button 
                          disabled={updatingId === r.store_order_id}
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={() => handleUpdateStatus(r.store_order_id, 'cancelled')}
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          Hủy đơn
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {loading ? 'Đang tải...' : 'Không có dữ liệu'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default IncomingOrders;


