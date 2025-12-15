import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MenuItem,
  TextField,
  Stack,
  TablePagination,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { PrimaryButton, ActionButton, ToastNotification, Icon } from '../../components/common';
import { getAllWarehouseOrders } from '../../api/warehouseOrderApi';

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

const getOrderCode = (order) => {
  if (!order) return '';
  if (order.order_code) return order.order_code;
  return `ORD${String(order.order_id || '').padStart(3, '0')}`;
};

const BranchOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await getAllWarehouseOrders({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });

      if (response.err === 0) {
        setOrders(response.data.orders || []);
        setTotalOrders(response.data.pagination.totalOrders || 0);
      } else {
        ToastNotification.error(response.msg || 'Không thể tải danh sách đơn hàng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, rowsPerPage, statusFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (orderId) => {
    // Trang chi tiết & xử lý đơn hàng chi nhánh đang dùng chung component OrderShipment
    // và được khai báo route là: /warehouse/order-shipment/:id (xem trong App.js)
    // Vì vậy cần điều hướng về đúng path này, nếu không router sẽ không match và không hiển thị gì.
    navigate(`/warehouse/order-shipment/${orderId}`);
  };

  const handleShipOrder = (orderId) => {
    navigate(`/warehouse/order-shipment/${orderId}`);
  };

  const handleSearch = () => {
    setPage(0);
    loadOrders();
  };

  const handleRefresh = () => {
    setPage(0);
    setStatusFilter('');
    setSearchTerm('');
    loadOrders();
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Quản lý đơn hàng chi nhánh
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Xem và cập nhật trạng thái đơn đặt hàng từ các chi nhánh
          </Typography>
        </Box>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Trạng thái"
            sx={{ width: { xs: '100%', sm: 200 } }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="pending">Chờ xử lý</MenuItem>
            <MenuItem value="confirmed">Đã xác nhận</MenuItem>
            <MenuItem value="shipped">Đang giao</MenuItem>
            <MenuItem value="delivered">Đã giao</MenuItem>
            <MenuItem value="cancelled">Đã hủy</MenuItem>
          </TextField>

          <TextField
            size="small"
            placeholder="Tìm kiếm theo tên cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1 }}
          />

          <PrimaryButton
            startIcon={<Icon name="Filter" />}
            onClick={handleSearch}
            sx={{ minWidth: 120 }}
          >
            Tìm kiếm
          </PrimaryButton>
        </Stack>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 50 }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Cửa hàng</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Loại đơn</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Dự kiến giao</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Số lượng</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tổng tiền</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                  Không có đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => {
                const orderCode = getOrderCode(order);
                return (
                <TableRow
                  key={order.order_id}
                  hover
                  onClick={() => handleViewDetail(order.order_id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>#{orderCode}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {order.store?.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {order.store?.phone}
                      </Typography>
                      
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={order.perishable ? 'warning' : 'default'}
                      label={order.perishable ? 'Đơn tươi sống' : 'Đơn thường'}
                    />
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell>{formatDate(order.expected_delivery)}</TableCell>
                  <TableCell>{order.totalItems || 0} sản phẩm</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {formatVnd(order.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const normalizedStatus =
                        order.status === 'preparing' ? 'confirmed' : order.status;
                      return (
                        <Chip
                          size="small"
                          color={statusColors[normalizedStatus]}
                          label={statusLabels[normalizedStatus]}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <ActionButton
                        icon={<Icon name="View" />}
                        action="view"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(order.order_id);
                        }}
                        tooltip="Xem chi tiết"
                      />
                      {['confirmed', 'shipped'].includes(
                        order.status === 'preparing' ? 'confirmed' : order.status
                      ) && (
                        <ActionButton
                          icon={<Icon name="Upload" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShipOrder(order.order_id);
                          }}
                          color="success"
                          tooltip="Xuất đơn hàng"
                        />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalOrders}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trong ${count}`}
        />
      </TableContainer>
    </Box>
  );
};

export default BranchOrders;
