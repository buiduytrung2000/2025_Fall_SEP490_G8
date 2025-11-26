import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
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
  IconButton,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateOrderItemQuantity
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
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

const formatDateOnly = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '-';
    }
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date only:", e, dateString);
    return '-';
  }
};

const OrderShipment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;

        const normalizedStatus =
          orderData.status === 'preparing' ? 'confirmed' : orderData.status;

        if (normalizedStatus === 'pending') {
          toast.warning('Đơn hàng này chưa được xác nhận');
          navigate('/warehouse/branch-orders');
          return;
        }

        if (normalizedStatus === 'cancelled') {
          toast.error('Đơn hàng này đã bị hủy');
          navigate('/warehouse/branch-orders');
          return;
        }

        setOrder({ ...orderData, status: normalizedStatus });
      } else {
        toast.error(response.msg || 'Không thể tải thông tin đơn hàng');
        navigate('/warehouse/branch-orders');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
      navigate('/warehouse/branch-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  // =====================================================
  // HELPER FUNCTIONS - Status Flow
  // =====================================================

  const getStatusStep = (status) => {
    const steps = ['confirmed', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      confirmed: 'shipped',
      shipped: 'delivered'
    };
    return flow[currentStatus] || null;
  };

  const getStatusActionLabel = (status) => {
    const labels = {
      shipped: 'Xuất kho và giao hàng',
      delivered: 'Xác nhận đã giao'
    };
    return labels[status] || 'Cập nhật trạng thái';
  };

  const getStatusActionIcon = (status) => {
    const icons = {
      shipped: <ShippingIcon />,
      delivered: <CheckIcon />
    };
    return icons[status] || <CheckIcon />;
  };

  // =====================================================
  // EVENT HANDLERS - Quantity Update
  // =====================================================

  const handleEditQuantity = (item) => {
    setEditingItemId(item.order_item_id);
    // Tính số lượng theo package unit để hiển thị khi edit
    let editQty = item.quantity; // Mặc định dùng số lượng đặt
    if (item.package_quantity !== null && item.package_quantity !== undefined) {
      editQty = item.package_quantity;
    } else if (item.actual_quantity) {
      // Nếu có actual_quantity, cần tính về package unit
      const packageConversion = item.inventory?.warehouse?.package_conversion;
      if (packageConversion && packageConversion > 1) {
        editQty = parseFloat((item.actual_quantity / packageConversion).toFixed(2));
      } else {
        editQty = item.actual_quantity;
      }
    }
    setEditingQuantity(editQty);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleSaveQuantity = async (itemId) => {
    const qty = parseInt(editingQuantity);

    if (isNaN(qty) || qty < 0) {
      toast.error('Số lượng không hợp lệ');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateOrderItemQuantity(itemId, qty);
      if (response.err === 0) {
        toast.success('Cập nhật số lượng thực tế thành công!');
        handleCancelEdit();
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // EVENT HANDLERS - Status Update
  // =====================================================

  const handleOpenConfirmDialog = () => {
    const next = getNextStatus(order.status);
    if (!next) {
      toast.warning('Không thể cập nhật trạng thái tiếp theo');
      return;
    }
    setNextStatus(next);
    setConfirmDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, nextStatus);
      if (response.err === 0) {
        toast.success(response.msg || 'Cập nhật trạng thái thành công!');
        setConfirmDialog(false);
        loadOrderDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

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

  const totalProducts = order.orderItems?.length || 0; // Số loại sản phẩm
  const totalAmount = order.orderItems?.reduce((sum, item) => {
    // Tính số lượng theo package unit (thùng) để nhân với unit_price (giá 1 thùng)
    let qty = item.quantity; // Mặc định dùng số lượng đặt
    
    if (item.package_quantity !== null && item.package_quantity !== undefined) {
      // Nếu có package_quantity từ backend, dùng nó
      qty = item.package_quantity;
    } else if (item.actual_quantity) {
      // Nếu có actual_quantity (base unit), tính về package unit
      const packageConversion = item.inventory?.warehouse?.package_conversion;
      if (packageConversion && packageConversion > 1) {
        qty = parseFloat((item.actual_quantity / packageConversion).toFixed(2));
      } else {
        // Nếu không có conversion, dùng actual_quantity trực tiếp
        qty = item.actual_quantity;
      }
    }
    
    return sum + (qty * item.unit_price);
  }, 0) || 0;

  const currentStep = getStatusStep(order.status);
  const next = getNextStatus(order.status);
  const canProceed = next && order.status !== 'delivered';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1976d2', color: 'white', px: 4, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ShippingIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              ordershipment
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
                  Đơn hàng #ORD{String(order.order_id).padStart(3, '0')}
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
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày đặt:</strong> {formatDate(order.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ngày giao dự kiến:</strong>{' '}
                    {order.expected_delivery ? (
                      <span style={{ color: '#1976d2', fontWeight: 600 }}>
                        {formatDateOnly(order.expected_delivery)}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Status Stepper */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Tiến trình xuất hàng
              </Typography>
              <Stepper activeStep={currentStep} sx={{ mt: 2 }}>
                <Step>
                  <StepLabel>Đã xác nhận</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Đang giao</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Đã giao</StepLabel>
                </Step>
              </Stepper>
            </Paper>

            {/* Notes from Store (if any) */}
            {order.notes && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="warning.dark">
                  📝 Ghi chú từ cửa hàng
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {order.notes}
                </Typography>
              </Paper>
            )}

            {/* Summary Info */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin đơn hàng
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số sản phẩm:
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {totalProducts} sản phẩm
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng giá trị:
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {formatVnd(totalAmount)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Products Table */}
            <Paper>
              <Box sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                <Typography variant="h6" fontWeight={600}>
                  Chi tiết sản phẩm xuất kho
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mã SP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ĐVT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Đặt</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Thực tế</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Đơn giá</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Thành tiền</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.orderItems?.map((item) => {
                      const isEditing = editingItemId === item.order_item_id;
                      
                      // Lấy tồn kho từ warehouse (ưu tiên) hoặc store
                      const warehouseStock = item.inventory?.warehouse?.base_quantity ?? 0;
                      const storeStock = item.inventory?.store?.base_quantity ?? 0;
                      const stockAvailable = warehouseStock || storeStock;
                      
                      // Lấy thông tin package unit để hiển thị tồn kho theo thùng
                      const packageConversion = item.inventory?.warehouse?.package_conversion;
                      const packageUnit = item.inventory?.warehouse?.package_unit;
                      const packageQuantityFromBackend = item.inventory?.warehouse?.package_quantity;
                      
                      // Tính displayQty: ưu tiên package_quantity từ item, nếu không có thì tính từ actual_quantity
                      let displayQty = item.quantity; // Mặc định dùng số lượng đặt
                      if (item.package_quantity !== null && item.package_quantity !== undefined) {
                        // Nếu có package_quantity từ backend, dùng nó
                        displayQty = item.package_quantity;
                      } else if (item.actual_quantity && packageConversion && packageConversion > 1) {
                        // Nếu có actual_quantity (base unit) và có conversion, tính về package unit
                        displayQty = parseFloat((item.actual_quantity / packageConversion).toFixed(2));
                      } else if (item.actual_quantity) {
                        // Nếu chỉ có actual_quantity mà không có conversion, dùng trực tiếp
                        displayQty = item.actual_quantity;
                      }
                      
                      // Tính tồn kho theo thùng: ưu tiên dùng từ backend, nếu không có thì tính từ base_quantity
                      let stockInPackages = null;
                      let packageUnitLabel = '';
                      
                      if (packageUnit) {
                        packageUnitLabel =  packageUnit.name || 'Thùng';
                        
                        if (packageQuantityFromBackend !== null && packageQuantityFromBackend !== undefined) {
                          stockInPackages = parseFloat(packageQuantityFromBackend);
                        } else if (packageConversion && packageConversion > 1 && stockAvailable > 0) {
                          stockInPackages = parseFloat((stockAvailable / packageConversion).toFixed(2));
                        }
                      }
                      
                      // So sánh tồn kho với số lượng đặt (item.quantity là số thùng)
                      const requiredStock = item.quantity * (packageConversion || 1);
                      const isLowStock = stockAvailable < requiredStock;

                      return (
                        <TableRow key={item.order_item_id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.product?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.product?.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.product?.unit || 'Thùng'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {item.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {isEditing ? (
                              <TextField
                                type="number"
                                size="small"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                sx={{ width: 80 }}
                                InputProps={{
                                  inputProps: {
                                    min: 0,
                                    max: stockInPackages 
                                      ? Math.min(item.quantity, Math.floor(stockInPackages))
                                      : Math.min(item.quantity, stockAvailable)
                                  }
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={displayQty !== item.quantity ? 'warning.main' : 'inherit'}
                              >
                                {displayQty}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {stockInPackages !== null && stockInPackages !== undefined && packageUnitLabel ? (
                              <Box>
                                <Chip
                                  label={`${stockInPackages.toLocaleString('vi-VN')} ${packageUnitLabel}`}
                                  size="small"
                                  sx={{
                                    bgcolor: isLowStock ? '#ff5252' : '#4caf50',
                                    color: 'white',
                                    fontWeight: 700,
                                    minWidth: 80,
                                    mb: 0.5
                                  }}
                                />
                               
                              </Box>
                            ) : (
                              <Chip
                                label={stockAvailable.toLocaleString('vi-VN')}
                                size="small"
                                sx={{
                                  bgcolor: isLowStock ? '#ff5252' : '#4caf50',
                                  color: 'white',
                                  fontWeight: 700,
                                  minWidth: 50
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatVnd(item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {formatVnd(displayQty * item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {order.status !== 'delivered' && order.status !== 'shipped' && (
                              isEditing ? (
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleSaveQuantity(item.order_item_id)}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleCancelEdit}
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditQuantity(item)}
                                  disabled={stockAvailable === 0 || (stockInPackages !== null && stockInPackages < 1)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={7} align="right" sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>
                        Tổng cộng:
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          {formatVnd(totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f5f5f5' }} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column - Action */}
          {order.status !== 'shipped' && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Thao tác xuất kho
                </Typography>
                <Divider sx={{ my: 2 }} />

                {canProceed ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Trạng thái hiện tại: <strong>{statusLabels[order.status]}</strong>
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={getStatusActionIcon(next)}
                      onClick={handleOpenConfirmDialog}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {getStatusActionLabel(next)}
                    </Button>
                  </>
                ) : order.status === 'delivered' ? (
                  <Alert severity="success">
                    ✅ Đơn hàng đã được giao thành công vào {formatDate(order.updated_at)}
                  </Alert>
                ) : (
                  <Alert severity="info">
                    Đơn hàng đang trong quá trình xử lý
                  </Alert>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Status Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => !updating && setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Xác nhận cập nhật trạng thái
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={nextStatus === 'delivered' ? 'success' : 'info'}
            sx={{ mb: 2 }}
          >
            {nextStatus === 'shipped' && '🚚 Xuất kho và bắt đầu vận chuyển đơn hàng'}
            {nextStatus === 'delivered' && '✅ Xác nhận đã giao hàng thành công. Tồn kho sẽ được cập nhật tự động.'}
          </Alert>

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái hiện tại
                </Typography>
                <Chip
                  color={statusColors[order.status]}
                  label={statusLabels[order.status]}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Typography variant="h5" color="text.secondary">→</Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái mới
                </Typography>
                <Chip
                  color={statusColors[nextStatus]}
                  label={statusLabels[nextStatus]}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={updating}
            color={nextStatus === 'delivered' ? 'success' : 'primary'}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : getStatusActionIcon(nextStatus)}
          >
            {updating ? 'Đang cập nhật...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderShipment;
