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
  Alert
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Visibility as ViewIcon, Replay as RetryIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseSupplierOrders,
  updateWarehouseSupplierOrderStatus
} from '../../../api/warehouseOrderApi';

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

  useEffect(() => { loadOrders(); }, [page, rowsPerPage, debouncedSearch, status]);

  // Auto refresh when a new order created from InventoryList
  useEffect(() => {
    const onCreated = () => loadOrders();
    window.addEventListener('warehouse-order:created', onCreated);
    return () => window.removeEventListener('warehouse-order:created', onCreated);
  }, []);

  const handleUpdateStatus = async (order) => {
    const options = nextTransitions[order.status] || [];
    if (options.length === 0) return;
    const next = window.prompt(`Cập nhật trạng thái đơn #${order.order_id}.\nTrạng thái hiện tại: ${order.status}.\nNhập một trong: ${options.join(', ')}`);
    if (!next) return;
    if (!options.includes(next)) return toast.error('Trạng thái không hợp lệ');
    try {
      const res = await updateWarehouseSupplierOrderStatus(order.order_id, next);
      if (res.err === 0) {
        toast.success('Cập nhật trạng thái thành công');
        loadOrders();
      } else toast.error(res.msg || 'Không thể cập nhật trạng thái');
    } catch (e) {
      toast.error('Lỗi kết nối: ' + e.message);
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Đơn đặt hàng (Kho → NCC)</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Tìm mã đơn / nhà cung cấp" value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }} />
          <TextField select size="small" label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">Tất cả</MenuItem>
            {Object.keys(statusColors).map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
          </TextField>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadOrders}>Tải lại</Button>
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
              ) : orders.map(order => (
                <TableRow key={order.order_id} hover>
                  <TableCell>#{order.order_id}</TableCell>
                  <TableCell>{order.supplier?.name || '—'}</TableCell>
                  <TableCell>{order.creator?.username || order.creator?.email || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" color={statusColors[order.status] || 'default'} label={order.status} />
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                  <TableCell>{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '—'}</TableCell>
                  <TableCell align="right">{Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => navigate(`/warehouse/orders/${order.order_id}`)} title="Xem chi tiết"><ViewIcon /></IconButton>
                    {(nextTransitions[order.status] || []).length > 0 && (
                      <Button size="small" onClick={() => handleUpdateStatus(order)}>Cập nhật</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={totalOrders} page={page} onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
      </Paper>
    </Box>
  );
}

