import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, DangerButton, Icon } from '../../components/common';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateExpectedDelivery
} from '../../api/warehouseOrderApi';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const formatVnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';
const formatQty = (n) =>
  Number(n ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrderUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;
        const normalizedStatus =
          orderData.status === 'preparing' ? 'confirmed' : orderData.status;
        setOrder({ ...orderData, status: normalizedStatus });

        if (orderData.expected_delivery) {
          const date = new Date(orderData.expected_delivery);
          const formatted = date.toISOString().slice(0, 16);
          setNewDeliveryDate(formatted);
        }
      } else {
        ToastNotification.error(response.msg || 'Không thể tải thông tin đơn hàng');
        navigate('/warehouse/branch-orders');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
      navigate('/warehouse/branch-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  const handleConfirmOrder = async () => {
    if (!newDeliveryDate) {
      ToastNotification.error('Vui lòng chọn ngày giao dự kiến trước khi xác nhận');
      return;
    }

    setUpdating(true);
    try {
      // Lưu ngày giao dự kiến trước
      const formattedDate = newDeliveryDate.includes('T')
        ? newDeliveryDate.replace('T', ' ').substring(0, 16) + ':00'
        : `${newDeliveryDate} 00:00:00`;

      const deliveryRes = await updateExpectedDelivery(id, formattedDate);
      if (deliveryRes.err !== 0) {
        ToastNotification.error('Không thể lưu ngày giao dự kiến: ' + (deliveryRes.msg || ''));
        setUpdating(false);
        return;
      }

      // Sau đó xác nhận đơn hàng
      const response = await updateWarehouseOrderStatus(id, 'confirmed');
      if (response.err === 0) {
        ToastNotification.success('Xác nhận đơn hàng thành công!');
        setConfirmDialog(false);
        loadOrderDetail();
      } else {
        ToastNotification.error(response.msg || 'Không thể xác nhận đơn hàng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      ToastNotification.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, 'cancelled', rejectReason);
      if (response.err === 0) {
        ToastNotification.success('Đã từ chối đơn hàng');
        setRejectDialog(false);
        navigate('/warehouse/branch-orders');
      } else {
        ToastNotification.error(response.msg || 'Không thể từ chối đơn hàng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!newDeliveryDate) {
      ToastNotification.error('Vui lòng chọn ngày giao hàng');
      return;
    }

    setUpdating(true);
    try {
      // Format date: YYYY-MM-DDTHH:mm -> YYYY-MM-DD HH:mm:00
      const formattedDate = newDeliveryDate.includes('T') 
        ? newDeliveryDate.replace('T', ' ').substring(0, 16) + ':00'
        : `${newDeliveryDate} 00:00:00`;
      
      const response = await updateExpectedDelivery(id, formattedDate);
      if (response.err === 0) {
        ToastNotification.success('Cập nhật ngày giao hàng thành công!');
        setDeliveryDialog(false);
        loadOrderDetail();
      } else {
        ToastNotification.error(response.msg || 'Không thể cập nhật ngày giao hàng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGoToShipment = async () => {
    // Nếu có ngày giao dự kiến mới, lưu trước khi chuyển
    if (newDeliveryDate) {
      setUpdating(true);
      try {
        // Format date: YYYY-MM-DDTHH:mm -> YYYY-MM-DD HH:mm:00
        const formattedDate = newDeliveryDate.includes('T') 
          ? newDeliveryDate.replace('T', ' ').substring(0, 16) + ':00'
          : `${newDeliveryDate} 00:00:00`;
        
        const response = await updateExpectedDelivery(id, formattedDate);
        if (response.err === 0) {
          ToastNotification.success('Đã lưu ngày giao dự kiến');
          // Reload order để có dữ liệu mới nhất
          await loadOrderDetail();
        } else {
          ToastNotification.warning('Không thể lưu ngày giao dự kiến: ' + (response.msg || ''));
        }
      } catch (error) {
        ToastNotification.warning('Lỗi khi lưu ngày giao dự kiến: ' + error.message);
      } finally {
        setUpdating(false);
      }
    }
    
    navigate(`/warehouse/order-shipment/${id}`);
  };

  const getUnitLabel = (unit) => {
    if (!unit) return '';
    return unit.name || '';
  };

  const buildPackagingInfo = (item) => {
    const unitLabel = getUnitLabel(item.unit) || 'đơn vị';
    const requestedQty = item.quantity ?? 0;
    const baseQty = item.quantity_in_base ?? requestedQty;
    const actualBaseQty = item.actual_quantity ?? baseQty;
    const warehouseInfo = item.inventory?.warehouse;

    const pkgLabel = getUnitLabel(item.packageUnit);
    const warehousePkgUnitLabel =
      warehouseInfo?.package_unit?.symbol || warehouseInfo?.package_unit?.name || '';
    const resolvedPkgLabel = pkgLabel || warehousePkgUnitLabel;

    const warehouseConversion = warehouseInfo?.package_conversion;
    const pkgFromActual =
      item.package_quantity && item.package_quantity > 0
        ? item.package_quantity
        : null;

    const conversionFromActual =
      pkgFromActual && actualBaseQty
        ? actualBaseQty / pkgFromActual
        : null;

    const conversion = warehouseConversion || conversionFromActual || null;

    let pkgQty = pkgFromActual;
    if (!pkgQty && conversion && actualBaseQty) {
      pkgQty = Math.ceil(actualBaseQty / conversion);
    }

    const effectiveBaseQty =
      pkgQty && conversion ? pkgQty * conversion : actualBaseQty;

    return {
      unitLabel,
      requestedQty,
      baseQty,
      actualBaseQty,
      pkgQty,
      resolvedPkgLabel,
      warehousePkgQty: warehouseInfo?.package_quantity,
      warehousePkgUnit: warehouseInfo?.package_unit,
      conversion,
      effectiveBaseQty,
      displayUnitLabel: resolvedPkgLabel || unitLabel,
      displayQty: pkgQty ?? requestedQty
    };
  };

  const derivedTotalAmount = useMemo(() => {
    if (!order?.orderItems) return 0;
    return order.orderItems.reduce((sum, item) => {
      const packagingInfo = buildPackagingInfo(item);
      const displayQty = packagingInfo.displayQty ?? item.quantity ?? 0;
      const itemTotal = displayQty * (item.unit_price || 0);
      return sum + itemTotal;
    }, 0);
  }, [order]);

  const renderWarehouseStock = (item) => {
    const warehouse = item.inventory?.warehouse;
    if (!warehouse) {
      return { label: '0', baseQuantity: 0 };
    }

    const baseQuantity = warehouse.base_quantity ?? 0;
    const packagingInfo = buildPackagingInfo(item);
    const pkgConversion = warehouse.package_conversion || packagingInfo.conversion;
    const pkgUnit =
      warehouse.package_unit?.symbol ||
      warehouse.package_unit?.name ||
      packagingInfo.resolvedPkgLabel;

    if (pkgConversion && pkgUnit && pkgConversion > 0) {
      const pkgQty = baseQuantity / pkgConversion;
      return {
        label: `${formatQty(pkgQty)} ${pkgUnit}`,
        baseQuantity
      };
    }

    return {
      label: `${formatQty(baseQuantity)} ${packagingInfo.unitLabel}`,
      baseQuantity
    };
  };

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

  const normalizedStatus = order.status === 'preparing' ? 'confirmed' : order.status;
  const isPending = normalizedStatus === 'pending';
  const canShip = ['confirmed', 'shipped'].includes(normalizedStatus);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#2e7d32', color: 'white', px: 4, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <CheckIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              orderupdate
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Kiểm tra và xác nhận đơn hàng từ chi nhánh
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: 4, py: 3 }}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={8}>
            {/* Order Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  Thông tin đơn hàng #ORD{String(order.order_id).padStart(3, '0')}
                </Typography>
                <Chip
                  label={statusLabels[order.status]}
                  color={statusColors[order.status]}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Chi nhánh:</strong> {order.store?.name}
                  </Typography>
                  {order.perishable && (
                    <Chip
                      size="small"
                      color="warning"
                      label="Hàng tươi sống"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày đặt:</strong> {formatDate(order.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Người đặt:</strong> {order.creator?.username || order.store?.contact || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày cần hàng:</strong> {formatDate(order.expected_delivery)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Điện thoại:</strong> {order.store?.phone}
                  </Typography>
                </Grid>
              </Grid>

              {/* Notes from Store */}
              {order.notes && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
                  <Typography variant="subtitle2" fontWeight={600} color="warning.dark" gutterBottom>
                    📝 Ghi chú từ cửa hàng
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {order.notes}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Products Table */}
            <Paper>
              <Box sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                <Typography variant="h6" fontWeight={600}>
                  Danh sách sản phẩm
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mã SP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Đơn vị</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL yêu cầu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Đơn giá</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.orderItems?.map((item, index) => {
                      const warehouseStock = renderWarehouseStock(item);
                      const requestedBase = item.quantity_in_base ?? item.quantity ?? 0;
                      const packagingInfo = buildPackagingInfo(item);
                      const effectiveBaseQty = packagingInfo.effectiveBaseQty ?? requestedBase;
                      const isLowStock = warehouseStock.baseQuantity < requestedBase;
                      const unitPriceDisplay = formatVnd(item.unit_price);
                      const displayQty = packagingInfo.displayQty ?? item.quantity ?? 0;
                      const totalPriceDisplay = formatVnd(displayQty * item.unit_price);

                      return (
                        <TableRow key={item.order_item_id} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.product?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {packagingInfo.displayUnitLabel || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatQty(packagingInfo.displayQty)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={warehouseStock.label}
                              size="small"
                              sx={{
                                bgcolor: isLowStock ? '#ff5252' : '#4caf50',
                                color: 'white',
                                fontWeight: 700,
                                minWidth: 70
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {unitPriceDisplay}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {totalPriceDisplay}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={8} align="right" sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>
                        Tổng cộng:
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          {formatVnd(derivedTotalAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column - Actions */}
          {order.status !== 'delivered' && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Thao tác
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ngày giao dự kiến
                    </Typography>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      size="small"
                      value={newDeliveryDate}
                      onChange={(e) => setNewDeliveryDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  {/* 
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ghi chú phản hồi
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      placeholder="Nhập ghi chú..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </Box> */}

                  <Divider />

                  {/* Single Update Button */}
                  {isPending && (
                    <>
                      <PrimaryButton
                        fullWidth
                        size="large"
                        startIcon={<Icon name="CheckCircle" />}
                        onClick={() => setConfirmDialog(true)}
                        disabled={!newDeliveryDate}
                        sx={{ 
                          py: 1.5, 
                          fontWeight: 600,
                          bgcolor: 'success.main',
                          '&:hover': { bgcolor: 'success.dark' }
                        }}
                      >
                        Xác nhận đơn hàng
                      </PrimaryButton>
                      <DangerButton
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<Icon name="Cancel" />}
                        onClick={() => setRejectDialog(true)}
                        sx={{ py: 1.5, fontWeight: 600 }}
                      >
                        Từ chối đơn hàng
                      </DangerButton>
                    </>
                  )}

                  {canShip && (
                    <PrimaryButton
                      fullWidth
                      size="large"
                      startIcon={<Icon name="LocalShipping" />}
                      onClick={handleGoToShipment}
                      disabled={updating}
                      loading={updating}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      Chuyển sang xuất hàng
                    </PrimaryButton>
                  )}

                  {!isPending && !canShip && (
                    <PrimaryButton
                      fullWidth
                      size="large"
                      onClick={handleUpdateDelivery}
                      disabled={updating}
                      loading={updating}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      Cập nhật ngày giao
                    </PrimaryButton>
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onClose={() => !updating && setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Xác nhận đơn hàng</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Bạn đang xác nhận đơn hàng <strong>#ORD{String(order.order_id).padStart(3, '0')}</strong>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái "Đã xác nhận" và bắt đầu quá trình chuẩn bị hàng.
          </Typography>
          {!newDeliveryDate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              ⚠️ Vui lòng chọn ngày giao dự kiến trước khi xác nhận đơn hàng.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <SecondaryButton onClick={() => setConfirmDialog(false)} disabled={updating}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleConfirmOrder}
            disabled={updating}
            loading={updating}
            startIcon={<Icon name="CheckCircle" />}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            Xác nhận
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => !updating && setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối đơn hàng</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ Bạn đang từ chối đơn hàng <strong>#ORD{String(order.order_id).padStart(3, '0')}</strong>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vui lòng nhập lý do từ chối để thông báo cho chi nhánh.
          </Typography>
          <TextField
            fullWidth
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={updating}
            multiline
            minRows={3}
            placeholder="Ví dụ: Sản phẩm hết hàng, cần điều chỉnh số lượng..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <SecondaryButton onClick={() => setRejectDialog(false)} disabled={updating}>
            Hủy
          </SecondaryButton>
          <DangerButton
            onClick={handleRejectOrder}
            disabled={updating}
            loading={updating}
            startIcon={<Icon name="Cancel" />}
          >
            Từ chối
          </DangerButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderUpdate;
