import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ToastNotification, PrimaryButton, SecondaryButton, ActionButton, Icon } from '../../components/common';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateOrderItemQuantity,
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
  const [deliveryDate, setDeliveryDate] = useState(''); // ngày giao dự kiến do kho chọn

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;

        const normalizedStatus =
          orderData.status === 'preparing' ? 'confirmed' : orderData.status;

        // Nếu đơn đã bị hủy thì không xử lý xuất kho
        if (normalizedStatus === 'cancelled') {
          ToastNotification.error('Đơn hàng này đã bị hủy');
          navigate('/warehouse/branch-orders');
          return;
        }

        // Cho phép xử lý cả đơn đang chờ xác nhận (pending) ngay tại màn hình này
        setOrder({ ...orderData, status: normalizedStatus });

        // Khởi tạo ngày giao dự kiến cho input (nếu đã có trên đơn)
        if (orderData.expected_delivery) {
          try {
            const d = new Date(orderData.expected_delivery);
            if (!isNaN(d.getTime())) {
              const iso = d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
              setDeliveryDate(iso);
            }
          } catch (e) {
            // ignore parse error, keep empty
          }
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

  // =====================================================
  // HELPER FUNCTIONS - Status Flow
  // =====================================================

  const getStatusStep = (status) => {
    const steps = ['confirmed', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      pending: 'confirmed',   // Bước 1: xác nhận đơn hàng
      confirmed: 'shipped',   // Bước 2: xuất kho & giao hàng
      shipped: 'delivered'    // Bước 3: xác nhận đã giao
    };
    return flow[currentStatus] || null;
  };

  const getStatusActionLabel = (status) => {
    const labels = {
      confirmed: 'Xác nhận đơn hàng',
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
    if (!['confirmed', 'delivered'].includes(order.status)) {
      ToastNotification.warning('Chỉ cho phép chỉnh sửa số lượng khi đơn đã xác nhận hoặc đã giao');
      return;
    }
    setEditingItemId(item.order_item_id);
    // Ưu tiên dùng quantity_in_base từ item (chính xác nhất), sau đó dùng package_conversion từ inventory
    const conversionFactor = item.quantity_in_base && item.quantity_in_base > 1
      ? item.quantity_in_base
      : item.inventory?.warehouse?.package_conversion && item.inventory?.warehouse?.package_conversion > 1
        ? item.inventory?.warehouse?.package_conversion
        : null;

    let editQty = item.quantity; // Mặc định dùng số lượng đặt (thùng)

    if (item.actual_quantity !== null && item.actual_quantity !== undefined) {
      // Quy đổi từ base unit (chai) sang package unit (thùng)
      if (conversionFactor && conversionFactor > 1) {
        editQty = parseFloat((item.actual_quantity / conversionFactor).toFixed(2));
      } else {
        // Nếu không có conversion, coi actual_quantity đã là package unit
        editQty = item.actual_quantity;
      }
    } else if (item.package_quantity !== null && item.package_quantity !== undefined) {
      editQty = item.package_quantity;
    }

    setEditingQuantity(editQty);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleSaveQuantity = async (itemId) => {
    const qty = parseFloat(editingQuantity);

    if (isNaN(qty) || qty < 0) {
      ToastNotification.error('Số lượng không hợp lệ');
      return;
    }

    // Tìm item để lấy thông tin
    const currentItem = order.orderItems?.find(it => it.order_item_id === itemId);
    if (!currentItem) {
      ToastNotification.error('Không tìm thấy sản phẩm');
      return;
    }

    // Validation khi trạng thái là "confirmed"
    if (order.status === 'confirmed') {
      // Không cho phép số lượng thực tế lớn hơn số lượng đặt
      if (qty > currentItem.quantity) {
        ToastNotification.error(`Số lượng thực tế không được lớn hơn số lượng đặt (${currentItem.quantity})`);
        return;
      }

      // Nếu số lượng hiện tại là 1, không cho giảm về 0
      const conversionFactor = currentItem.quantity_in_base && currentItem.quantity_in_base > 1
        ? currentItem.quantity_in_base
        : currentItem.inventory?.warehouse?.package_conversion && currentItem.inventory?.warehouse?.package_conversion > 1
          ? currentItem.inventory?.warehouse?.package_conversion
          : null;

      let currentDisplayQty = currentItem.quantity;
      if (currentItem.actual_quantity !== null && currentItem.actual_quantity !== undefined) {
        if (conversionFactor && conversionFactor > 1) {
          currentDisplayQty = parseFloat((currentItem.actual_quantity / conversionFactor).toFixed(2));
        } else {
          currentDisplayQty = currentItem.actual_quantity;
        }
      } else if (currentItem.package_quantity !== null && currentItem.package_quantity !== undefined) {
        currentDisplayQty = currentItem.package_quantity;
      }

      // Nếu số lượng hiện tại là 1, không cho giảm về 0
      if (currentDisplayQty === 1 && qty < 1) {
        ToastNotification.error('Số lượng thực tế không được nhỏ hơn 1');
        return;
      }
    }

    setUpdating(true);
    try {
      const response = await updateOrderItemQuantity(itemId, qty);
      if (response.err === 0) {
        ToastNotification.success('Cập nhật số lượng thực tế thành công!');
        // Cập nhật ngay trên UI (optimistic) dựa trên kết quả trả về
        setOrder((prev) => {
          if (!prev) return prev;
          const updatedItems = prev.orderItems?.map((it) => {
            if (it.order_item_id !== itemId) return it;

            // Ưu tiên actual_quantity trả về từ backend (đơn vị base/chai)
            const backendActual = response.data?.actual_quantity;
            // Ưu tiên dùng quantity_in_base từ item (chính xác nhất), sau đó dùng package_conversion từ inventory
            const conversionFactor = it.quantity_in_base && it.quantity_in_base > 1
              ? it.quantity_in_base
              : it.inventory?.warehouse?.package_conversion && it.inventory?.warehouse?.package_conversion > 1
                ? it.inventory?.warehouse?.package_conversion
                : null;

            // Backend đã lưu actual_quantity theo base unit (chai), chỉ cần quy đổi về package unit để hiển thị
            const oldActualBase = Number(it.actual_quantity || 0);
            const actualBase = backendActual !== undefined && backendActual !== null
              ? backendActual
              : conversionFactor
                ? qty * conversionFactor  // qty là thùng, quy đổi sang chai
                : qty; // fallback: nếu không có conversion thì coi qty là base unit

            // Tính delta để cập nhật tồn kho
            const delta = actualBase - oldActualBase;

            // Quy đổi từ base unit sang package unit để hiển thị
            const packageQty = conversionFactor && conversionFactor > 0
              ? parseFloat((actualBase / conversionFactor).toFixed(2))
              : actualBase; // Nếu không có conversion thì hiển thị trực tiếp

            // Cập nhật tồn kho: số lượng thực tế tăng → tồn kho giảm, và ngược lại
            const updatedInventory = it.inventory?.warehouse
              ? {
                  ...it.inventory,
                  warehouse: {
                    ...it.inventory.warehouse,
                    base_quantity: Math.max(0, (it.inventory.warehouse.base_quantity || 0) - delta),
                    // Tính lại package_quantity nếu có conversion
                    package_quantity: conversionFactor && conversionFactor > 1
                      ? parseFloat(((Math.max(0, (it.inventory.warehouse.base_quantity || 0) - delta)) / conversionFactor).toFixed(2))
                      : it.inventory.warehouse.package_quantity
                  }
                }
              : it.inventory;

            return {
              ...it,
              actual_quantity: actualBase,      // lưu theo base unit (chai)
              package_quantity: packageQty,     // hiển thị theo thùng
              subtotal: response.data?.subtotal !== undefined && response.data?.subtotal !== null
                ? response.data.subtotal
                : packageQty * parseFloat(it.unit_price), // Cập nhật subtotal từ backend hoặc tính lại
              inventory: updatedInventory       // cập nhật tồn kho
            };
          }) || [];

          return { ...prev, orderItems: updatedItems };
        });

        handleCancelEdit();
      } else {
        ToastNotification.error(response.msg || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
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
      ToastNotification.warning('Không thể cập nhật trạng thái tiếp theo');
      return;
    }
    // Khi xác nhận đơn hàng, bắt buộc phải chọn ngày giao dự kiến
    if (next === 'confirmed' && !deliveryDate) {
      ToastNotification.error('Vui lòng chọn ngày giao dự kiến trước khi xác nhận đơn hàng');
      return;
    }
    setNextStatus(next);
    setConfirmDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    setUpdating(true);
    try {
      // Nếu đang ở bước xác nhận đơn hàng, lưu ngày giao dự kiến trước
      if (nextStatus === 'confirmed') {
        if (!deliveryDate) {
          ToastNotification.error('Vui lòng chọn ngày giao dự kiến');
          setUpdating(false);
          return;
        }

        const formattedDate = deliveryDate.includes('T')
          ? deliveryDate.replace('T', ' ').substring(0, 16) + ':00'
          : `${deliveryDate} 00:00:00`;

        const resDelivery = await updateExpectedDelivery(id, formattedDate);
        if (resDelivery.err !== 0) {
          ToastNotification.error(resDelivery.msg || 'Không thể lưu ngày giao dự kiến');
          setUpdating(false);
          return;
        }
      }

      const response = await updateWarehouseOrderStatus(id, nextStatus);
      if (response.err === 0) {
        ToastNotification.success(response.msg || 'Cập nhật trạng thái thành công!');
        setConfirmDialog(false);
        loadOrderDetail();
      } else {
        ToastNotification.error(response.msg || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
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
  // Dùng trực tiếp subtotal từ database để đảm bảo chính xác
  const totalAmount = order.orderItems?.reduce((sum, item) => {
    // Ưu tiên dùng subtotal từ database (chính xác nhất)
    if (item.subtotal !== null && item.subtotal !== undefined) {
      return sum + parseFloat(item.subtotal);
    }
    // Fallback: tính lại nếu không có subtotal
    const conversionFactor = item.quantity_in_base && item.quantity_in_base > 1
      ? item.quantity_in_base
      : item.inventory?.warehouse?.package_conversion && item.inventory?.warehouse?.package_conversion > 1
        ? item.inventory?.warehouse?.package_conversion
        : null;

    let qty = item.quantity; // Mặc định dùng số lượng đặt

    if (item.actual_quantity !== null && item.actual_quantity !== undefined) {
      // Quy đổi từ base unit (chai) sang package unit (thùng)
      if (conversionFactor && conversionFactor > 1) {
        qty = parseFloat((item.actual_quantity / conversionFactor).toFixed(2));
      } else {
        // Nếu không có conversion, coi actual_quantity đã là package unit
        qty = item.actual_quantity;
      }
    } else if (item.package_quantity !== null && item.package_quantity !== undefined) {
      qty = item.package_quantity;
    }

    return sum + qty * item.unit_price;
  }, 0) || 0;

  const currentStep = getStatusStep(order.status);
  const next = getNextStatus(order.status);
  const canProceed = next && order.status !== 'delivered';

  // Ghi chú xác nhận từ cửa hàng (khi store bấm "Đã nhận hàng")
  const storeConfirmNote =
    order.store_receive_note ||
    order.store_confirmation_note ||
    order.receive_note ||
    order.store_note ||
    null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1976d2', color: 'white', px: 4, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ShippingIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Chi tiết đơn hàng
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

            {/* Notes from Store (initial note on order) */}
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

            {/* Store confirmation note after receiving goods */}
            {(storeConfirmNote || order.orderItems?.some(item => item.received_quantity !== null && item.received_quantity !== undefined)) && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: '#e8f5e9', border: '1px solid #81c784' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="success.dark">
                  ✅ Ghi chú khi cửa hàng xác nhận đã nhận hàng
                </Typography>
                
                {/* Hiển thị số lượng nhận thực tế */}
                {order.orderItems?.some(item => item.received_quantity !== null && item.received_quantity !== undefined) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Số lượng nhận thực tế:
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">SL Đặt</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">SL Nhận thực tế</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {order.orderItems
                            ?.filter(item => item.received_quantity !== null && item.received_quantity !== undefined)
                            .map((item) => {
                              // received_quantity đã được lưu ở đơn vị package (thùng) từ cửa hàng, hiển thị trực tiếp
                              const receivedQtyDisplay = parseFloat(item.received_quantity);
                              
                              return (
                                <TableRow key={item.order_item_id}>
                                  <TableCell>{item.product?.name || item.product_name || 'N/A'}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      color={receivedQtyDisplay !== item.quantity ? 'warning.main' : 'inherit'}
                                    >
                                      {receivedQtyDisplay}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
                
                {/* Hiển thị ghi chú */}
                {storeConfirmNote && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Ghi chú:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {storeConfirmNote}
                    </Typography>
                  </Box>
                )}
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
              <Box sx={{  bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
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
                      <TableCell sx={{ fontWeight: 700 }} align="right">SL Thực tế giao</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        {order.status === 'confirmed' ? 'Tồn kho dự kiến' : 'Tồn kho'}
                      </TableCell>
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
                      
                      // Hiển thị số lượng thực tế đúng như trong database
                      // Ưu tiên dùng quantity_in_base từ item (chính xác nhất), sau đó dùng package_conversion từ inventory
                      let displayQty = item.quantity;
                      if (item.actual_quantity !== null && item.actual_quantity !== undefined) {
                        // Ưu tiên dùng quantity_in_base từ item (nếu có)
                        const conversionFactor = item.quantity_in_base && item.quantity_in_base > 1
                          ? item.quantity_in_base
                          : packageConversion && packageConversion > 1
                            ? packageConversion
                            : null;
                        
                        if (conversionFactor && conversionFactor > 1) {
                          // Quy đổi từ base unit (chai) sang package unit (thùng)
                          displayQty = parseFloat((item.actual_quantity / conversionFactor).toFixed(2));
                        } else {
                          // Nếu không có conversion, coi actual_quantity đã là package unit
                          displayQty = item.actual_quantity;
                        }
                      } else if (item.package_quantity !== null && item.package_quantity !== undefined) {
                        displayQty = item.package_quantity;
                      }
                      
                      // Tính tồn kho theo thùng: luôn tính lại từ base_quantity với quantity_in_base từ item để đảm bảo chính xác
                      let stockInPackages = null;
                      let packageUnitLabel = '';
                      
                      // Ưu tiên dùng quantity_in_base từ item (chính xác nhất), sau đó dùng package_conversion từ inventory
                      const stockConversionFactor = item.quantity_in_base && item.quantity_in_base > 1
                        ? item.quantity_in_base
                        : packageConversion && packageConversion > 1
                          ? packageConversion
                          : null;
                      
                      if (packageUnit) {
                        packageUnitLabel =  packageUnit.name || 'Thùng';
                        
                        // Luôn tính lại từ base_quantity với conversion factor chính xác từ item
                        if (stockConversionFactor && stockConversionFactor > 1 && stockAvailable > 0) {
                          stockInPackages = parseFloat((stockAvailable / stockConversionFactor).toFixed(2));
                        } else if (packageQuantityFromBackend !== null && packageQuantityFromBackend !== undefined) {
                          // Fallback: dùng từ backend nếu không có conversion factor
                          stockInPackages = parseFloat(packageQuantityFromBackend);
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
                                    // Khi trạng thái là "confirmed": giới hạn theo số lượng đặt và không cho giảm về 0 nếu hiện tại là 1
                                    // Khi trạng thái là "delivered": có thể tăng đến tồn kho
                                    min: (() => {
                                      if (order.status === 'confirmed') {
                                        // Tính số lượng thực tế hiện tại để kiểm tra
                                        const currentQty = item.actual_quantity !== null && item.actual_quantity !== undefined
                                          ? (stockConversionFactor && stockConversionFactor > 1
                                              ? parseFloat((item.actual_quantity / stockConversionFactor).toFixed(2))
                                              : item.actual_quantity)
                                          : item.package_quantity !== null && item.package_quantity !== undefined
                                            ? item.package_quantity
                                            : item.quantity;
                                        return currentQty === 1 ? 1 : 0;
                                      }
                                      return 0;
                                    })(),
                                    max: order.status === 'confirmed'
                                      ? item.quantity // Giới hạn bằng số lượng đặt
                                      : stockInPackages !== null && stockInPackages !== undefined
                                        ? Math.floor(stockInPackages)
                                        : stockAvailable > 0
                                          ? Math.floor(stockAvailable)
                                          : undefined
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
                            {(() => {
                              // Tính tồn kho dự kiến khi trạng thái là "confirmed"
                              let displayStock = stockInPackages !== null && stockInPackages !== undefined
                                ? stockInPackages
                                : stockAvailable;
                              
                              let displayStockBase = stockAvailable;
                              
                              if (order.status === 'confirmed') {
                                // Tồn kho dự kiến = tồn kho hiện tại - số lượng đặt (hoặc số lượng thực tế nếu đã có)
                                const qtyToSubtract = displayQty; // Số lượng thực tế hoặc số lượng đặt
                                
                                if (stockInPackages !== null && stockInPackages !== undefined) {
                                  // Tính theo package unit
                                  displayStock = Math.max(0, stockInPackages - qtyToSubtract);
                                } else {
                                  // Tính theo base unit
                                  const qtyToSubtractBase = stockConversionFactor && stockConversionFactor > 1
                                    ? qtyToSubtract * stockConversionFactor
                                    : qtyToSubtract;
                                  displayStockBase = Math.max(0, stockAvailable - qtyToSubtractBase);
                                  displayStock = displayStockBase;
                                }
                              }
                              
                              return stockInPackages !== null && stockInPackages !== undefined && packageUnitLabel ? (
                                <Box>
                                  <Chip
                                    label={`${displayStock.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${packageUnitLabel}`}
                                    size="small"
                                    sx={{
                                      bgcolor: order.status === 'confirmed' 
                                        ? (displayStock < 0 ? '#ff5252' : '#4caf50')
                                        : (isLowStock ? '#ff5252' : '#4caf50'),
                                      color: 'white',
                                      fontWeight: 700,
                                      minWidth: 80,
                                      mb: 0.5
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Chip
                                  label={displayStockBase.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                  size="small"
                                  sx={{
                                    bgcolor: order.status === 'confirmed'
                                      ? (displayStockBase < 0 ? '#ff5252' : '#4caf50')
                                      : (isLowStock ? '#ff5252' : '#4caf50'),
                                    color: 'white',
                                    fontWeight: 700,
                                    minWidth: 50
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatVnd(item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {/* Dùng subtotal từ database để đảm bảo chính xác */}
                              {formatVnd(item.subtotal !== null && item.subtotal !== undefined ? item.subtotal : displayQty * item.unit_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <ActionButton
                                    icon={<Icon name="Save" />}
                                    size="small"
                                    onClick={() => handleSaveQuantity(item.order_item_id)}
                                    sx={{ color: 'success.main' }}
                                  />
                                  <ActionButton
                                    icon={<Icon name="Cancel" />}
                                    action="delete"
                                    size="small"
                                    onClick={handleCancelEdit}
                                  />
                                </Stack>
                              ) : (
                                <ActionButton
                                  icon={<Icon name="Edit" />}
                                  size="small"
                                  onClick={() => handleEditQuantity(item)}
                                  disabled={
                                    !['confirmed', 'delivered'].includes(order.status) ||
                                    stockAvailable === 0 ||
                                    (stockInPackages !== null && stockInPackages < 1)
                                  }
                                />
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

                {/* Ngày giao dự kiến – chọn khi xác nhận đơn */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ngày giao dự kiến
                  </Typography>
                  <TextField
                      fullWidth
                    type="datetime-local"
                    size="small"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText={
                      order.status === 'pending'
                        ? 'Bắt buộc chọn ngày giao trước khi xác nhận đơn hàng'
                        : 'Có thể điều chỉnh nếu cần'
                    }
                  />
                </Box>

                {canProceed ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Trạng thái hiện tại: <strong>{statusLabels[order.status]}</strong>
                    </Alert>
                    <PrimaryButton
                      fullWidth
                      size="large"
                      startIcon={getStatusActionIcon(next)}
                      onClick={handleOpenConfirmDialog}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {getStatusActionLabel(next)}
                    </PrimaryButton>
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
            {nextStatus === 'confirmed'
              ? 'Xác nhận đơn hàng'
              : 'Xác nhận cập nhật trạng thái'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={nextStatus === 'delivered' ? 'success' : 'info'}
            sx={{ mb: 2 }}
          >
            {nextStatus === 'confirmed' &&
              '✅ Bạn đang xác nhận đơn hàng. Sau khi xác nhận có thể tiến hành xuất kho.'}
            {nextStatus === 'shipped' &&
              '🚚 Xuất kho và bắt đầu vận chuyển đơn hàng.'}
            {nextStatus === 'delivered' &&
              '✅ Xác nhận đã giao hàng thành công. Tồn kho sẽ được cập nhật tự động.'}
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
          <SecondaryButton onClick={() => setConfirmDialog(false)} disabled={updating}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleUpdateStatus}
            disabled={updating}
            loading={updating}
            startIcon={getStatusActionIcon(nextStatus)}
            sx={nextStatus === 'delivered' ? { bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } } : {}}
          >
            Xác nhận
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderShipment;
