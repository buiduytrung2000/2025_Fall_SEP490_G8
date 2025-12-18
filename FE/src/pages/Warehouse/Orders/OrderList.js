import React, { useEffect, useState } from 'react';
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
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Visibility as ViewIcon, 
  Lock as LockIcon,
  CheckCircle as ConfirmIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, Alert, Icon } from '../../../components/common';
import {
  getWarehouseSupplierOrders,
  updateWarehouseSupplierOrderStatus,
  getWarehouseSupplierOrderDetail,
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

// Làm tròn an toàn tổng tiền để tránh hiển thị 999.999,96 thay vì 1.000.000
const formatTotalAmount = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';

  // Làm tròn về số nguyên gần nhất (VND không có số lẻ)
  // Nếu giá trị rất gần số nguyên (chênh lệch < 1) thì làm tròn lên
  const nearestInt = Math.round(num);
  const diff = Math.abs(num - nearestInt);
  
  // Nếu chênh lệch < 1 VND thì làm tròn về số nguyên
  if (diff < 1) {
    return nearestInt.toLocaleString('vi-VN');
  }

  // Nếu giá trị >= 999.999 và < 1.000.000 thì làm tròn lên thành 1.000.000
  if (num >= 999999 && num < 1000000) {
    return '1.000.000';
  }

  // Ngược lại làm tròn 2 chữ số thập phân rồi format
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString('vi-VN');
};

export default function OrderList() {
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

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);

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

  const handleUpdateStatus = (order, desiredStatus) => {
    setSelectedOrder(order);
    const allowedTransitions = nextTransitions[order.status] || [];

    if (desiredStatus) {
      if (allowedTransitions.includes(desiredStatus)) {
        setNewStatus(desiredStatus);
        setUpdateDialog(true);
      } else {
        ToastNotification.info('Không thể cập nhật trạng thái cho đơn này');
      }
      return;
    }

    if (allowedTransitions.length > 0) {
      setNewStatus(allowedTransitions[0]);
      setUpdateDialog(true);
    } else {
      ToastNotification.info('Không thể thay đổi trạng thái của đơn hàng này');
    }
  };

  const confirmUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setUpdating(true);
    try {
      const res = await updateWarehouseSupplierOrderStatus(selectedOrder.order_id, newStatus);
      if (res.err === 0) {
        ToastNotification.success('Cập nhật trạng thái thành công');
        setUpdateDialog(false);
        loadOrders();
      } else {
        ToastNotification.error(res.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (e) {
      ToastNotification.error('Lỗi kết nối: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const isOrderEditable = (orderStatus) => {
    return orderStatus === 'pending';
  };

  const handleOpenDetail = async (orderId) => {
    setDetailDialogOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        setDetailOrder(res.data);
      } else {
        ToastNotification.error(res.msg || 'Không thể tải chi tiết đơn hàng');
      }
    } catch (e) {
      ToastNotification.error('Lỗi kết nối: ' + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Quản lý phiếu nhập hàng
          </Typography>
          <Typography color="text.secondary" fontSize="0.95rem">
            Theo dõi và cập nhật trạng thái các đơn mua hàng từ nhà cung cấp
          </Typography>
        </Box>
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
                <TableCell>Ngày tạo</TableCell>
                <TableCell>Ngày giao dự kiến</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={8} align="center"><Alert severity="error" message={error} action={<PrimaryButton size="small" startIcon={<Icon name="Replay" />} onClick={loadOrders}>Thử lại</PrimaryButton>} /></TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center"><Alert severity="info">Không có dữ liệu</Alert></TableCell></TableRow>
              ) : orders.map(order => {
                const editable = isOrderEditable(order.status);
                
                return (
                  <TableRow
                    key={order.order_id}
                    hover
                    onClick={() => handleOpenDetail(order.order_id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>#{order.order_id}</TableCell>
                    <TableCell>{order.supplier?.name || '—'}</TableCell>
                    <TableCell>{order.creator?.username || order.creator?.email || '—'}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell>{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="right">{formatTotalAmount(order.totalAmount)} đ</TableCell>
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
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Xem chi tiết">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(order.order_id);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xác nhận phiếu nhập">
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={order.status !== 'pending'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(order, 'confirmed');
                              }}
                            >
                              <ConfirmIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Từ chối phiếu nhập">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={order.status !== 'pending'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(order, 'cancelled');
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
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
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trong ${count !== -1 ? count : `hơn ${to}`}`}
        />
      </Paper>

      {/* Order Detail Modal */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => !detailLoading && setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {detailOrder ? `Chi tiết phiếu nhập #${detailOrder.order_id}` : 'Chi tiết phiếu nhập hàng'}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !detailOrder ? (
            <Alert severity="info">Không tìm thấy dữ liệu đơn hàng</Alert>
          ) : (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Thông tin chung
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography><b>Nhà cung cấp:</b> {detailOrder.supplier?.name || '—'}</Typography>
                  <Typography><b>Người tạo:</b> {detailOrder.creator?.username || detailOrder.creator?.email || '—'}</Typography>
                  <Typography><b>Ngày tạo:</b> {new Date(detailOrder.created_at).toLocaleString('vi-VN')}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography><b>Ngày giao dự kiến:</b>{' '}
                    {detailOrder.expected_delivery
                      ? new Date(detailOrder.expected_delivery).toLocaleDateString('vi-VN')
                      : '—'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      color={statusColors[detailOrder.status] || 'default'}
                      label={statusLabels[detailOrder.status] || detailOrder.status}
                    />
                  </Stack>
                </Box>
              </Stack>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Sản phẩm trong đơn
              </Typography>
              <Table size="small">
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
                  {(detailOrder.orderItems || []).map((item, idx) => {
                  const quantityPerCase = Number(
                    item.display_quantity ?? item.quantity ?? 0,
                  );
                  // Làm tròn đơn giá và thành tiền về số nguyên (VND) để tránh lệch 1đ kiểu 999.999,99
                  const rawPricePerCase = Number(
                    item.display_unit_price ?? item.unit_price ?? 0,
                  );
                  const pricePerCase = Math.round(rawPricePerCase);
                  const rawSubtotalBase = Number(
                    item.subtotal ?? quantityPerCase * rawPricePerCase,
                  );
                  const subtotalBase = Math.round(rawSubtotalBase);
                    const unitLabel =
                      item.display_unit_label ||
                      item.unit?.name ||
                      item.unit?.symbol ||
                      'đơn vị';

                    return (
                      <TableRow key={item.order_item_id || idx}>
                        <TableCell>{item.product?.sku || '—'}</TableCell>
                        <TableCell>{item.product?.name || '—'}</TableCell>
                        <TableCell align="right">
                          {quantityPerCase.toLocaleString('vi-VN')} {unitLabel}
                        </TableCell>
                        <TableCell align="right">
                          {pricePerCase.toLocaleString('vi-VN')} đ/{unitLabel}
                        </TableCell>
                        <TableCell align="right">
                          {subtotalBase.toLocaleString('vi-VN')} đ
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!detailOrder.orderItems || detailOrder.orderItems.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Không có sản phẩm nào trong đơn
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDetailDialogOpen(false)} disabled={detailLoading}>
            Đóng
          </SecondaryButton>
        </DialogActions>
      </Dialog>

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
            <Alert severity="info" message="Xác nhận đơn hàng sẽ cập nhật tồn kho và khóa đơn hàng. Không thể hoàn tác!" sx={{ mt: 2 }} />
          )}
          {newStatus === 'cancelled' && (
            <Alert severity="warning" message="Hủy đơn hàng sẽ khóa đơn hàng. Không thể hoàn tác!" sx={{ mt: 2 }} />
          )}
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setUpdateDialog(false)} disabled={updating}>Hủy</SecondaryButton>
          <PrimaryButton onClick={confirmUpdateStatus} disabled={updating || !newStatus} loading={updating}>
            Xác nhận
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}