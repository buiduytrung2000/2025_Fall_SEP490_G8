import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Refresh as RefreshIcon, 
  Visibility as ViewIcon, 
  Replay as RetryIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseSupplierOrders,
  updateWarehouseSupplierOrderStatus
} from '../../../api/warehouseOrderApi';

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

// Valid status transitions (three-stage system)
const nextTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: [], // No transitions from confirmed
  cancelled: []  // No transitions from cancelled
};

export default function OrderList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  // Status update dialog
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadOrders = async () => {
    setLoading(true); setError('');
    try {
      const res = await getWarehouseSupplierOrders({
        page: page + 1,
        limit: rowsPerPage,
        status: status || undefined,
        search: debouncedSearch || undefined
      });
      if (res.err === 0) {
        setOrders(res.data.orders || []);
        setTotalOrders(res.data.pagination?.totalOrders || 0);
      } else {
        setError(res.msg || 'Không thể tải danh sách đơn hàng');
      }
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, rowsPerPage, debouncedSearch, status]);

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    const allowedTransitions = nextTransitions[order.status] || [];
    if (allowedTransitions.length > 0) {
      setNewStatus(allowedTransitions[0]);
      setUpdateDialog(true);
    } else {
      toast.info('Không thể thay đổi trạng thái của đơn hàng này');
    }
  };

  const confirmUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setUpdating(true);
    try {
      const res = await updateWarehouseSupplierOrderStatus(selectedOrder.order_id, newStatus);
      if (res.err === 0) {
        toast.success('Cập nhật trạng thái thành công');
        setUpdateDialog(false);
        loadOrders();
      } else {
        toast.error(res.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (e) {
      toast.error('Lỗi kết nối: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const isOrderEditable = (orderStatus) => {
    return orderStatus === 'pending';
  };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Đơn đặt hàng (Kho → NCC)</Typography>
        <Stack direction="row" spacing={1}>
          <TextField 
            size="small" 
            placeholder="Tìm mã đơn / nhà cung cấp" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }} 
          />
          <TextField 
            select 
            size="small" 
            label="Trạng thái" 
            value={status} 
            onChange={e => { setStatus(e.target.value); setPage(0); }} 
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.keys(statusColors).map(s => (
              <MenuItem key={s} value={s}>{statusLabels[s]}</MenuItem>
            ))}
          </TextField>
          <IconButton onClick={loadOrders} title="Làm mới"><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn</TableCell>
                <TableCell>Nhà cung cấp</TableCell>
                <TableCell>Người tạo</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell>Ngày giao dự kiến</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={8} align="center"><Alert severity="error" action={<Button size="small" startIcon={<RetryIcon />} onClick={loadOrders}>Thử lại</Button>}>{error}</Alert></TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center"><Alert severity="info">Không có dữ liệu</Alert></TableCell></TableRow>
              ) : orders.map(order => {
                const editable = isOrderEditable(order.status);
                const canTransition = (nextTransitions[order.status] || []).length > 0;
                
                return (
                  <TableRow key={order.order_id} hover>
                    <TableCell>#{order.order_id}</TableCell>
                    <TableCell>{order.supplier?.name || '—'}</TableCell>
                    <TableCell>{order.creator?.username || order.creator?.email || '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip 
                          size="small" 
                          color={statusColors[order.status] || 'default'} 
                          label={statusLabels[order.status] || order.status} 
                        />
                        {!editable && <LockIcon fontSize="small" color="disabled" titleAccess="Đơn hàng đã khóa, không thể chỉnh sửa" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell>{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="right">{Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => navigate(`/warehouse/orders/${order.order_id}`)} title="Xem chi tiết">
                        <ViewIcon />
                      </IconButton>
                      {canTransition && (
                        <Button size="small" onClick={() => handleUpdateStatus(order)}>Cập nhật</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination 
          component="div" 
          count={totalOrders} 
          page={page} 
          onPageChange={(e, p) => setPage(p)} 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} 
        />
      </Paper>

      {/* Status Update Dialog */}
      <Dialog open={updateDialog} onClose={() => !updating && setUpdateDialog(false)}>
        <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Đơn hàng #{selectedOrder?.order_id}
          </Typography>
          <TextField
            select
            fullWidth
            label="Trạng thái mới"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={updating}
          >
            {(nextTransitions[selectedOrder?.status] || []).map(s => (
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
    </Box>
  );
}

