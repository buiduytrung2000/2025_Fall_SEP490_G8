// src/pages/Store_Manager/PurchaseOrders.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Grid,
  useMediaQuery,
  useTheme,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import { createStoreOrder, getStoreOrders, updateStoreOrderStatus } from '../../api/storeOrderApi';
import { PrimaryButton, SecondaryButton, ActionButton, ToastNotification, Icon } from '../../components/common';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

const emptyLine = () => ({ sku: '', name: '', qty: 1, price: 0 });

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: 'All' },
  { label: 'Đang chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'confirmed' },
  { label: 'Đang giao', value: 'shipped' },
  { label: 'Đã nhận', value: 'delivered' },
  { label: 'Đã hủy', value: 'cancelled' },
  { label: 'Từ chối', value: 'rejected' }
];

const STATUS_META = {
  pending: { label: 'Đang chờ duyệt', color: 'warning' },
  confirmed: { label: 'Đã duyệt', color: 'info' },
  approved: { label: 'Đã duyệt', color: 'info' },
  shipped: { label: 'Đang giao', color: 'primary' },
  delivered: { label: 'Đã nhận', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'default' },
  rejected: { label: 'Từ chối', color: 'error' }
};

const PurchaseOrders = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [target, setTarget] = useState('Main Warehouse');
  const [supplier, setSupplier] = useState('Coca-Cola');
  const [lines, setLines] = useState([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [perishable, setPerishable] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [openCreateOrderModal, setOpenCreateOrderModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [confirmReceivedDialog, setConfirmReceivedDialog] = useState(false);
  const [receiveNote, setReceiveNote] = useState('');

  const getStatusMeta = useCallback((status) => {
    if (!status) return STATUS_META.pending;
    const key = status.toLowerCase();
    return STATUS_META[key] || STATUS_META.pending;
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0), [lines]);

  const addLine = () => {
    setLines(prev => {
      // Xóa các dòng trống trước khi thêm dòng mới
      const filtered = prev.filter(l => !(l.sku === '' && l.name === '' && l.qty === 1 && l.price === 0));
      return [...filtered, emptyLine()];
    });
  };
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, key, val) => {
    setLines(prev => {
      const updated = prev.map((l, i) => i === idx ? { ...l, [key]: val } : l);
      // Khi nhập SKU hoặc tên hàng, tự động xóa các dòng trống khác
      if (key === 'sku' || key === 'name') {
        const currentLine = updated[idx];
        const hasData = (currentLine.sku && currentLine.sku.trim() !== '') || 
                       (currentLine.name && currentLine.name.trim() !== '');
        
        if (hasData) {
          // Giữ dòng hiện tại và các dòng có dữ liệu, xóa các dòng trống khác
          const filtered = updated.filter((l, i) => {
            if (i === idx) return true; // Luôn giữ dòng đang được cập nhật
            // Giữ dòng nếu có dữ liệu (có SKU hoặc tên hàng)
            return (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== '');
          });
          // Luôn giữ ít nhất một dòng trống ở cuối để thêm sản phẩm mới
          const hasEmptyLine = filtered.some(l => l.sku === '' && l.name === '');
          return hasEmptyLine ? filtered : [...filtered, emptyLine()];
        }
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    // Validation: Check if there are any items
    if (lines.length === 0 || lines.every(l => !l.sku && !l.name)) {
      ToastNotification.error('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }

    // Validation: Check target_warehouse
    if (!target || target.trim() === '') {
      ToastNotification.error('Vui lòng nhập tên kho nhận hàng');
      return;
    }

    // Validation: Validate each item
    const validItems = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      
      // Skip completely empty lines
      if ((!l.sku || l.sku.trim() === '') && (!l.name || l.name.trim() === '') && (!l.qty || l.qty === '') && (!l.price || l.price === '')) {
        continue;
      }
      
      // Validate SKU - required
      if (!l.sku || l.sku.trim() === '') {
        ToastNotification.error(`Dòng ${i + 1}: Vui lòng nhập mã SKU`);
        return;
      }
      
      // Validate name - required
      if (!l.name || l.name.trim() === '') {
        ToastNotification.error(`Dòng ${i + 1}: Vui lòng nhập tên hàng`);
        return;
      }
      
      // Validate quantity
      const qty = parseInt(l.qty);
      if (isNaN(qty) || qty <= 0) {
        ToastNotification.error(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
      
      // Validate unit price - required and must be > 0
      const price = parseFloat(l.price);
      if (isNaN(price) || price <= 0) {
        ToastNotification.error(`Dòng ${i + 1}: Đơn giá phải lớn hơn 0`);
        return;
      }
      
      validItems.push({
        sku: (l.sku || '').trim(),
        name: (l.name || '').trim(),
        quantity: qty,
        unit_price: price
      });
    }

    // Validation: Check if there are valid items
    if (validItems.length === 0) {
      ToastNotification.error('Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_type: 'ToWarehouse',
        target_warehouse: target.trim(),
        supplier_id: null,
        items: validItems,
        perishable: perishable,
        notes: null
      };

      const result = await createStoreOrder(payload);
      
      if (result.err === 0) {
        ToastNotification.success('Tạo đơn hàng thành công!');
        // Reset đơn
        setLines([emptyLine()]);
        setPerishable(false);
        setTarget('Main Warehouse');
        setSupplier('Coca-Cola');
        // Đóng modal tạo đơn
        setOpenCreateOrderModal(false);
        await fetchOrders(false);
      } else {
        ToastNotification.error('Lỗi: ' + (result.msg || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      ToastNotification.error('Lỗi khi tạo đơn hàng: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoadingOrders(true);
    }
    try {
      const data = await getStoreOrders({
        status: statusFilter
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading store orders:', error);
      setOrders([]);
    } finally {
      if (showLoading) {
        setLoadingOrders(false);
      }
    }
  }, [statusFilter]);

  useEffect(() => {
    // Không hiển thị loading khi filter thay đổi
    fetchOrders(false);
  }, [fetchOrders]);

  // Định nghĩa cột cho bảng đơn nhập hàng
  const columns = useMemo(() => [
    {
      accessorKey: 'index',
      header: 'STT',
      size: 60,
      Cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'store_order_id',
      header: 'Mã đơn',
      size: 100,
      Cell: ({ cell }) => cell.getValue() || 'N/A',
    },
    {
      accessorKey: 'order_type',
      header: 'Loại',
      size: 100,
      Cell: ({ cell }) => cell.getValue() || 'N/A',
    },
    {
      accessorKey: 'target_warehouse',
      header: 'Nơi nhận/NCC',
      size: 150,
      Cell: ({ row }) => row.original.target_warehouse || row.original.supplier_name || 'N/A',
    },
    {
      accessorKey: 'created_at',
      header: 'Ngày',
      size: 100,
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString('vi-VN'),
    },
    {
      accessorKey: 'items',
      header: 'Số dòng',
      size: 80,
      Cell: ({ cell }) => cell.getValue() ? cell.getValue().length : 0,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'total_amount',
      header: 'Tổng tiền',
      size: 120,
      Cell: ({ cell }) => `${Number(cell.getValue() || 0).toLocaleString('vi-VN')} đ`,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      size: 100,
      Cell: ({ row }) => {
        const statusMeta = getStatusMeta(row.original.status);
        return (
          <Chip 
            size="small" 
            label={statusMeta.label}
            color={statusMeta.color}
          />
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      size: 100,
      enableColumnFilter: false,
      enableSorting: false,
      Cell: ({ row }) => (
        <Tooltip title="Xem chi tiết">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOrder(row.original);
              setOpenModal(true);
            }}
            color="primary"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
  ], [getStatusMeta]);

  const handleOpenConfirmReceived = () => {
    setReceiveNote('');
    setConfirmReceivedDialog(true);
  };

  const handleConfirmReceived = async () => {
    if (!selectedOrder) return;

    setUpdatingStatus(true);
    try {
      const response = await updateStoreOrderStatus(selectedOrder.store_order_id, 'delivered', receiveNote);
      if (response.err === 0) {
        ToastNotification.success('Xác nhận đã nhận hàng thành công!');
        setConfirmReceivedDialog(false);
        await fetchOrders(false);
        // Update selected order
        setSelectedOrder({ ...selectedOrder, status: 'delivered' });
      } else {
        ToastNotification.error(response.msg || 'Không thể cập nhật trạng thái đơn hàng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Đơn nhập hàng</Typography>
        <Typography color="text.secondary">Theo dõi đơn đã tạo</Typography>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField 
            size="small" 
            label="Tìm kiếm mã đơn hàng" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Nhập mã đơn hàng..."
            sx={{ width: { xs: '100%', sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField 
            select 
            size="small" 
            label="Trạng thái" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            sx={{ width: { xs: '100%', sm: 220 } }}
          >
            {STATUS_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <MaterialReactTable
        columns={columns}
        data={loadingOrders ? [] : orders.filter(order => {
          if (!searchTerm.trim()) return true;
          const orderId = String(order.store_order_id || '').toLowerCase();
          return orderId.includes(searchTerm.toLowerCase().trim());
        })}
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={true}
        enableTopToolbar={false}
        enableBottomToolbar={true}
        enablePagination={true}
        muiTableContainerProps={{
          sx: { maxHeight: { xs: '70vh', md: 'none' } }
        }}
        muiTablePaperProps={{
          elevation: 0,
          sx: { boxShadow: 'none' }
        }}
        muiTableHeadCellProps={{
          sx: {
            fontWeight: 700,
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
        state={{
          isLoading: loadingOrders,
          showProgressBars: loadingOrders
        }}
        localization={MRT_Localization_VI}
        initialState={{
          pagination: { pageSize: 10, pageIndex: 0 },
        }}
      />

      {/* Create Order Modal */}
      <Dialog
        open={openCreateOrderModal}
        onClose={() => setOpenCreateOrderModal(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Tạo đơn hàng mới
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
              <TextField 
                label="Kho nhận" 
                size="small" 
                value={target} 
                onChange={(e) => setTarget(e.target.value)} 
                sx={{ width: { xs: '100%', sm: 280, md: 320 } }} 
              />
              <TextField 
                select 
                size="small" 
                label="Hàng tươi sống?" 
                value={perishable ? 'Yes' : 'No'} 
                onChange={(e) => setPerishable(e.target.value === 'Yes')} 
                sx={{ width: { xs: '100%', sm: 180 } }}
              >
                <MenuItem value="No">No</MenuItem>
                <MenuItem value="Yes">Yes</MenuItem>
              </TextField>
              {perishable && (
                <TextField 
                  label="Nhà cung cấp tươi sống" 
                  size="small" 
                  value={supplier} 
                  onChange={(e) => setSupplier(e.target.value)} 
                  sx={{ width: { xs: '100%', sm: 240, md: 260 } }} 
                />
              )}
            </Stack>
          </Paper>

          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Chi tiết sản phẩm</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: { xs: '50vh', md: '60vh' }, overflowX: 'auto' }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>SKU</TableCell>
                  <TableCell sx={{ minWidth: { xs: 150, sm: 200 } }}>Tên hàng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>Số lượng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 160 } }}>Đơn giá</TableCell>
                  <TableCell width={64}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField 
                        size="small" 
                        value={l.sku} 
                        onChange={(e) => updateLine(idx, 'sku', e.target.value)} 
                        sx={{ width: { xs: 100, sm: 120 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        fullWidth 
                        value={l.name} 
                        onChange={(e) => updateLine(idx, 'name', e.target.value)} 
                        sx={{ minWidth: { xs: 150, sm: 200 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        type="number" 
                        value={l.qty} 
                        onChange={(e) => updateLine(idx, 'qty', e.target.value)} 
                        sx={{ width: { xs: 80, sm: 120 } }} 
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        type="number" 
                        value={l.price} 
                        onChange={(e) => updateLine(idx, 'price', e.target.value)} 
                        sx={{ width: { xs: 100, sm: 160 } }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <ActionButton
                        icon={<Icon name="Delete" />}
                        action="delete"
                        size="small"
                        onClick={() => removeLine(idx)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5}>
                    <PrimaryButton startIcon={<Icon name="Add" />} onClick={addLine} size="small">Thêm dòng</PrimaryButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>
                    Tổng tiền:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>
                    {total.toLocaleString('vi-VN')} đ
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setOpenCreateOrderModal(false)} disabled={submitting}>
            Hủy
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={submitting || !lines.length} loading={submitting}>
            Tạo đơn hàng
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Order Detail Modal */}
      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Chi tiết đơn hàng #{selectedOrder?.store_order_id || 'N/A'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              {/* Order Information */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Mã đơn hàng</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.store_order_id || selectedOrder.order_code || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Loại đơn</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.order_type === 'ToWarehouse' ? 'Nhập từ Kho' : 'Nhập từ Nhà cung cấp'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedOrder.order_type === 'ToWarehouse' ? 'Kho nhận' : 'Nhà cung cấp'}
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.target_warehouse || selectedOrder.supplier_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Ngày tạo</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Trạng thái</Typography>
                  {(() => {
                    const statusMeta = getStatusMeta(selectedOrder.status);
                    return (
                      <Chip 
                        size="small" 
                        label={statusMeta.label}
                        color={statusMeta.color}
                        sx={{ mt: 0.5 }}
                      />
                    );
                  })()}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Hàng tươi sống</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.perishable ? 'Có' : 'Không'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Tổng tiền</Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    {Number(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} đ
                  </Typography>
                </Grid>
                {selectedOrder.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Ghi chú</Typography>
                    <Typography variant="body1">
                      {selectedOrder.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Danh sách sản phẩm ({selectedOrder.items?.length || 0} sản phẩm)
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tên hàng</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Đơn giá</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{item.sku || 'N/A'}</TableCell>
                          <TableCell>{item.product_name || item.name || 'N/A'}</TableCell>
                          <TableCell align="right">{item.quantity || 0}</TableCell>
                          <TableCell align="right">
                            {Number(item.unit_price || 0).toLocaleString('vi-VN')} đ
                          </TableCell>
                          <TableCell align="right">
                            {Number(item.subtotal || (item.quantity || 0) * (item.unit_price || 0)).toLocaleString('vi-VN')} đ
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          Không có sản phẩm
                        </TableCell>
                      </TableRow>
                    )}
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>
                          Tổng cộng:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>
                          {Number(selectedOrder.total_amount || 0).toLocaleString('vi-VN')} đ
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedOrder?.status?.toLowerCase() === 'shipped' && (
            <PrimaryButton 
              onClick={handleOpenConfirmReceived} 
              disabled={updatingStatus}
              loading={updatingStatus}
              sx={{ 
                mr: 'auto',
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              Đã nhận hàng
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => setOpenModal(false)} disabled={updatingStatus}>
            Đóng
          </SecondaryButton>
        </DialogActions>
      </Dialog>

      {/* Confirm Received Dialog */}
      <Dialog
        open={confirmReceivedDialog}
        onClose={() => !updatingStatus && setConfirmReceivedDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Xác nhận đã nhận hàng
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bạn có chắc chắn đã nhận hàng cho đơn hàng #{selectedOrder?.store_order_id}?
          </Typography>
          <TextField
            label="Ghi chú khi nhận hàng"
            placeholder="Nhập ghi chú (nếu có vấn đề về hàng hóa, số lượng...)"
            multiline
            rows={3}
            fullWidth
            value={receiveNote}
            onChange={(e) => setReceiveNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setConfirmReceivedDialog(false)} disabled={updatingStatus}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleConfirmReceived}
            disabled={updatingStatus}
            loading={updatingStatus}
            sx={{ 
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' }
            }}
          >
            Xác nhận nhận hàng
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrders;


