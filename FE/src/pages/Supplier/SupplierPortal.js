// src/pages/Supplier/SupplierPortal.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ActionButton, Icon } from '../../components/common';
import { getWarehouseSupplierOrders } from '../../api/warehouseOrderApi';

const statusLabels = {
  pending: 'Đang chờ',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('vi-VN') : '—';

  const formatOrderCode = (order) =>
    order.order_code || `ORD${String(order.order_id || '').padStart(3, '0')}`;

const SupplierPortal = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const formatQuantityLabel = (order) => {
    const quantity = Number(order.displayPackageQuantity ?? order.totalItems ?? 0);
    const unitLabel = order.displayPackageUnit || 'đơn vị';
    return `${quantity.toLocaleString('vi-VN')} ${unitLabel}`;
  };

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWarehouseSupplierOrders({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });

      if (res.err === 0) {
        const mapped = (res.data?.orders || []).map((order) => ({
          ...order,
          quantityLabel: formatQuantityLabel(order),
        }));
        setOrders(mapped);
        setTotalOrders(res.data?.pagination?.totalOrders || 0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, debouncedSearch]);

  const columns = useMemo(
    () => [
      { key: 'stt', label: 'STT', align: 'center' },
      { key: 'order_id', label: 'Mã đơn' },
      { key: 'creator', label: 'Người tạo' },
      { key: 'created_at', label: 'Ngày tạo' },
      { key: 'totalItems', label: 'Số lượng' },
      { key: 'totalAmount', label: 'Tổng tiền', align: 'right' },
      { key: 'status', label: 'Trạng thái' },
    ],
    []
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Đơn hàng từ kho
          </Typography>
          <Typography color="text.secondary">
            Danh sách đơn đặt hàng mà kho đã gửi cho bạn
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Tìm theo mã đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            select
            size="small"
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.keys(statusLabels).map((key) => (
              <MenuItem key={key} value={key}>
                {statusLabels[key]}
              </MenuItem>
            ))}
          </TextField>
          
        </Stack>
      </Stack>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || 'left'}>
                    {col.label}
                  </TableCell>
                ))}
                <TableCell align="center">Chi tiết</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Alert severity="error">{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Alert severity="info">Chưa có đơn hàng nào từ kho.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order, index) => (
                  <TableRow key={order.order_id} hover>
                    <TableCell align="center">
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{formatOrderCode(order)}</Typography>
                    </TableCell>
                    <TableCell>
                      {order.creator?.username || 'Kho'}
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{order.quantityLabel}</TableCell>
                    <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      {(() => {
                        const normalizedStatus =
                          order.status === 'preparing' ? 'confirmed' : order.status;
                        return (
                          <Chip
                            size="small"
                            color={statusColors[normalizedStatus] || 'default'}
                            label={statusLabels[normalizedStatus] || normalizedStatus}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <ActionButton
                        icon={<Icon name="Visibility" />}
                        onClick={() => navigate(`/supplier/orders/${order.order_id}`)}
                        tooltip="Xem chi tiết"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalOrders}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Số dòng mỗi trang"
        />
      </Paper>
    </Box>
  );
};

export default SupplierPortal;