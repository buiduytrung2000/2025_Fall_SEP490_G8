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
  Cancel as CancelIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { ToastNotification, PrimaryButton, SecondaryButton, ActionButton, Icon } from '../../components/common';
import {
  getWarehouseOrderDetail,
  updateWarehouseOrderStatus,
  updateOrderItemQuantity,
  updateExpectedDelivery,
  updateOrderItemDiscrepancyReason
} from '../../api/warehouseOrderApi';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  rejected: 'error'
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  rejected: 'Từ chối'
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

// Trả về chuỗi datetime-local tối thiểu (hiện tại trở đi) cho input
const getMinDeliveryDateTime = () => {
  const now = new Date();
  // Chuyển sang giờ local rồi format theo yyyy-MM-ddTHH:mm
  const tzOffset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
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
  const [inventoryAuditReasons, setInventoryAuditReasons] = useState({}); // Lý do kiểm kê tồn kho cho từng sản phẩm chênh lệch
  const [confirmEditDialog, setConfirmEditDialog] = useState(false);
  const [confirmSaveDialog, setConfirmSaveDialog] = useState(false);
  const [pendingEditItem, setPendingEditItem] = useState(null);
  const [pendingSaveItemId, setPendingSaveItemId] = useState(null);
  const [savingReasons, setSavingReasons] = useState({}); // Track which reasons are being saved
  const saveReasonTimeouts = React.useRef({}); // Store timeout refs for debounce
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await getWarehouseOrderDetail(id);
      if (response.err === 0) {
        const orderData = response.data;

        const normalizedStatus =
          orderData.status === 'preparing' ? 'confirmed' : orderData.status;

        // Xử lý tự động set số lượng thực tế giao = tồn kho nếu số lượng đặt > tồn kho
        // Lưu ý: Vẫn cho phép xem chi tiết đơn hàng đã hủy, chỉ chặn các thao tác xuất kho
        if (orderData.orderItems && orderData.orderItems.length > 0) {
          const itemsToUpdate = [];

          for (const item of orderData.orderItems) {
            // Lấy tồn kho từ warehouse (ưu tiên) hoặc store
            const warehouseStock = item.inventory?.warehouse?.base_quantity ?? 0;
            const storeStock = item.inventory?.store?.base_quantity ?? 0;
            const stockAvailable = warehouseStock || storeStock;

            // Lấy thông tin package conversion
            const packageConversion = item.inventory?.warehouse?.package_conversion;
            const stockConversionFactor = packageConversion && packageConversion > 1 ? packageConversion : null;

            // Tính tồn kho theo đơn vị lớn (thùng)
            let stockInPackages = null;
            if (stockConversionFactor && stockAvailable > 0) {
              stockInPackages = Math.floor(stockAvailable / stockConversionFactor);
            } else if (item.inventory?.warehouse?.package_quantity !== null && item.inventory?.warehouse?.package_quantity !== undefined) {
              stockInPackages = Math.floor(item.inventory.warehouse.package_quantity);
            }

            // Số lượng đặt (theo thùng)
            const orderedQty = item.quantity || 0;

            // Kiểm tra nếu số lượng đặt > tồn kho
            let shouldUpdate = false;
            let targetQty = orderedQty;

            if (stockInPackages !== null && stockInPackages !== undefined) {
              // So sánh theo đơn vị thùng
              if (orderedQty > stockInPackages) {
                shouldUpdate = true;
                targetQty = Math.max(0, stockInPackages); // Đảm bảo không âm
              }
            } else if (stockAvailable > 0) {
              // Nếu không có package conversion, so sánh theo base unit
              const requiredStock = orderedQty * (stockConversionFactor || 1);
              if (requiredStock > stockAvailable) {
                shouldUpdate = true;
                // Tính lại số lượng thực tế theo base unit rồi quy đổi về thùng
                if (stockConversionFactor && stockConversionFactor > 1) {
                  targetQty = Math.floor(stockAvailable / stockConversionFactor);
                } else {
                  targetQty = stockAvailable;
                }
                targetQty = Math.max(0, targetQty);
              }
            }

            // Chỉ cập nhật nếu:
            // 1. Chưa có package_quantity (chưa được set trước đó)
            // 2. Hoặc package_quantity hiện tại > tồn kho
            if (shouldUpdate && (normalizedStatus === 'pending' || normalizedStatus === 'confirmed')) {
              const currentPackageQty = item.package_quantity !== null && item.package_quantity !== undefined
                ? item.package_quantity
                : null;

              if (currentPackageQty === null || currentPackageQty > targetQty) {
                itemsToUpdate.push({
                  order_item_id: item.order_item_id,
                  quantity: targetQty
                });
              }
            }
          }

          // Tự động cập nhật số lượng thực tế giao cho các item cần thiết
          if (itemsToUpdate.length > 0) {
            try {
              await Promise.all(
                itemsToUpdate.map(item => updateOrderItemQuantity(item.order_item_id, item.quantity))
              );
              // Reload lại để lấy dữ liệu mới nhất
              const reloadResponse = await getWarehouseOrderDetail(id);
              if (reloadResponse.err === 0) {
                orderData.orderItems = reloadResponse.data.orderItems;
              }
            } catch (error) {
              console.error('Lỗi khi tự động cập nhật số lượng:', error);
              // Tiếp tục với dữ liệu gốc nếu có lỗi
            }
          }
        }

        // Cho phép xử lý cả đơn đang chờ xác nhận (pending) ngay tại màn hình này
        setOrder({ ...orderData, status: normalizedStatus });

        // Load lý do chênh lệch từ database
        if (orderData.orderItems && orderData.orderItems.length > 0) {
          const reasonsMap = {};
          orderData.orderItems.forEach((item) => {
            if (item.discrepancy_reason || item.audit_reason) {
              reasonsMap[item.order_item_id] = item.discrepancy_reason || item.audit_reason || '';
            }
          });
          setInventoryAuditReasons(reasonsMap);
        }

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
    // Không cho phép chỉnh sửa nếu đơn hàng đã hủy
    if (order.status === 'cancelled') {
      ToastNotification.error('Không thể chỉnh sửa số lượng vì đơn hàng đã bị hủy');
      return;
    }
    // Chỉ cho phép chỉnh sửa số lượng khi đơn đang ở trạng thái "đã xác nhận"
    // Sau khi đã "Xuất kho & giao hàng" (shipped) sẽ không cho chỉnh sửa nữa
    if (order.status !== 'confirmed') {
      ToastNotification.warning('Chỉ cho phép chỉnh sửa số lượng khi đơn đang ở trạng thái đã xác nhận (trước khi xuất kho)');
      return;
    }
    // Hiển thị dialog xác nhận trước khi chỉnh sửa
    setPendingEditItem(item);
    setConfirmEditDialog(true);
  };

  const handleConfirmEdit = () => {
    if (!pendingEditItem) return;

    setEditingItemId(pendingEditItem.order_item_id);
    // LUÔN cho phép chỉnh sửa / nhập theo đơn vị lớn (thùng), KHÔNG quy đổi về đơn vị nhỏ
    // Ưu tiên dùng `package_quantity` (SL thực tế giao theo thùng), nếu chưa có thì dùng `quantity` (SL đặt theo thùng)
    const editQty =
      pendingEditItem.package_quantity !== null && pendingEditItem.package_quantity !== undefined
        ? pendingEditItem.package_quantity
        : pendingEditItem.quantity;

    setEditingQuantity(editQty);
    setConfirmEditDialog(false);
    setPendingEditItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleSaveQuantity = (itemId) => {
    // Hiển thị dialog xác nhận trước khi lưu
    setPendingSaveItemId(itemId);
    setConfirmSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingSaveItemId) return;

    const qty = parseFloat(editingQuantity);

    if (isNaN(qty) || qty < 0) {
      ToastNotification.error('Số lượng không hợp lệ');
      setConfirmSaveDialog(false);
      setPendingSaveItemId(null);
      return;
    }

    // Tìm item để lấy thông tin
    const currentItem = order.orderItems?.find(it => it.order_item_id === pendingSaveItemId);
    if (!currentItem) {
      ToastNotification.error('Không tìm thấy sản phẩm');
      setConfirmSaveDialog(false);
      setPendingSaveItemId(null);
      return;
    }

    // Validation khi trạng thái là "confirmed"
    if (order.status === 'confirmed') {
      // Lấy tồn kho từ warehouse (ưu tiên) hoặc store
      const warehouseStock = currentItem.inventory?.warehouse?.base_quantity ?? 0;
      const storeStock = currentItem.inventory?.store?.base_quantity ?? 0;
      const stockAvailable = warehouseStock || storeStock;

      // Lấy thông tin package conversion
      const packageConversion = currentItem.inventory?.warehouse?.package_conversion;
      const stockConversionFactor = packageConversion && packageConversion > 1 ? packageConversion : null;

      // Tính tồn kho theo đơn vị lớn (thùng)
      let stockInPackages = null;
      if (stockConversionFactor && stockAvailable > 0) {
        stockInPackages = Math.floor(stockAvailable / stockConversionFactor);
      } else if (currentItem.inventory?.warehouse?.package_quantity !== null && currentItem.inventory?.warehouse?.package_quantity !== undefined) {
        stockInPackages = Math.floor(currentItem.inventory.warehouse.package_quantity);
      }

      // Không cho phép số lượng thực tế lớn hơn tồn kho
      if (stockInPackages !== null && stockInPackages !== undefined) {
        if (qty > stockInPackages) {
          ToastNotification.error(`Số lượng thực tế không được lớn hơn tồn kho (${stockInPackages})`);
          setConfirmSaveDialog(false);
          setPendingSaveItemId(null);
          return;
        }
      } else if (stockAvailable > 0) {
        // Nếu không có package conversion, kiểm tra theo base unit
        const requiredStock = qty * (stockConversionFactor || 1);
        if (requiredStock > stockAvailable) {
          const maxQty = stockConversionFactor && stockConversionFactor > 1
            ? Math.floor(stockAvailable / stockConversionFactor)
            : stockAvailable;
          ToastNotification.error(`Số lượng thực tế không được lớn hơn tồn kho (${maxQty})`);
          setConfirmSaveDialog(false);
          setPendingSaveItemId(null);
          return;
        }
      }

      // Không cho phép số lượng thực tế lớn hơn số lượng đặt
      if (qty > currentItem.quantity) {
        ToastNotification.error(`Số lượng thực tế không được lớn hơn số lượng đặt (${currentItem.quantity})`);
        setConfirmSaveDialog(false);
        setPendingSaveItemId(null);
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
        setConfirmSaveDialog(false);
        setPendingSaveItemId(null);
        return;
      }
    }

    setUpdating(true);
    try {
      const response = await updateOrderItemQuantity(pendingSaveItemId, qty);
      if (response.err === 0) {
        ToastNotification.success('Cập nhật số lượng thực tế thành công!');
        // Sau khi backend xử lý quy đổi & tồn kho, reload lại chi tiết đơn hàng
        await loadOrderDetail();
        handleCancelEdit();
      } else {
        ToastNotification.error(response.msg || 'Không thể cập nhật số lượng');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
      setConfirmSaveDialog(false);
      setPendingSaveItemId(null);
    }
  };

  // =====================================================
  // EVENT HANDLERS - Discrepancy Reason Auto Save
  // =====================================================

  const handleDiscrepancyReasonChange = (orderItemId, value) => {
    // Cập nhật state ngay lập tức để UI phản hồi
    setInventoryAuditReasons((prev) => ({
      ...prev,
      [orderItemId]: value
    }));

    // Clear timeout cũ nếu có
    if (saveReasonTimeouts.current[orderItemId]) {
      clearTimeout(saveReasonTimeouts.current[orderItemId]);
    }

    // Set trạng thái đang lưu
    setSavingReasons((prev) => ({
      ...prev,
      [orderItemId]: true
    }));

    // Tạo timeout mới để tự động lưu sau 1.5 giây không gõ
    saveReasonTimeouts.current[orderItemId] = setTimeout(async () => {
      try {
        const response = await updateOrderItemDiscrepancyReason(orderItemId, value || '');
        if (response.err === 0) {
          // Lưu thành công - có thể hiển thị thông báo nhỏ hoặc không
          // ToastNotification.success('Đã lưu lý do chênh lệch');
        } else {
          ToastNotification.error(response.msg || 'Không thể lưu lý do chênh lệch');
        }
      } catch (error) {
        ToastNotification.error('Lỗi kết nối: ' + error.message);
      } finally {
        setSavingReasons((prev) => {
          const newState = { ...prev };
          delete newState[orderItemId];
          return newState;
        });
        delete saveReasonTimeouts.current[orderItemId];
      }
    }, 1500); // Đợi 1.5 giây sau khi người dùng ngừng gõ
  };

  // Cleanup timeouts khi component unmount
  useEffect(() => {
    return () => {
      Object.values(saveReasonTimeouts.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // =====================================================
  // EVENT HANDLERS - Reject Order
  // =====================================================

  const handleOpenRejectDialog = () => {
    // Chỉ cho phép từ chối đơn đang ở trạng thái pending
    if (order.status !== 'pending') {
      ToastNotification.warning('Chỉ có thể từ chối đơn hàng đang chờ xác nhận');
      return;
    }
    setRejectNote('');
    setRejectDialog(true);
  };

  const handleRejectOrder = async () => {
    if (!order) return;

    if (!rejectNote || rejectNote.trim() === '') {
      ToastNotification.error('Vui lòng nhập lý do từ chối đơn hàng');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateWarehouseOrderStatus(id, 'rejected', rejectNote.trim());
      if (response.err === 0) {
        ToastNotification.success('Đã từ chối đơn hàng thành công!');
        setRejectDialog(false);
        setRejectNote('');
        // Reload lại chi tiết đơn hàng
        await loadOrderDetail();
      } else {
        ToastNotification.error(response.msg || 'Không thể từ chối đơn hàng');
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

        // Không cho chọn ngày/giờ giao dự kiến trong quá khứ (kể cả cùng ngày nhưng giờ đã qua)
        try {
          const selectedDateTime = deliveryDate.includes('T')
            ? new Date(deliveryDate)
            : new Date(`${deliveryDate}T00:00`);
          const now = new Date();

          if (isNaN(selectedDateTime.getTime())) {
            ToastNotification.error('Thời gian giao dự kiến không hợp lệ');
            setUpdating(false);
            return;
          }

          if (selectedDateTime.getTime() < now.getTime()) {
            ToastNotification.error('Vui lòng chọn thời gian giao dự kiến trong tương lai');
            setUpdating(false);
            return;
          }
        } catch (e) {
          ToastNotification.error('Thời gian giao dự kiến không hợp lệ');
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
        // Sau khi cập nhật trạng thái, reload lại chi tiết đơn hàng
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
    // Fallback: tính lại nếu không có subtotal, dựa trên package_quantity (thùng)
    const qty = item.package_quantity !== null && item.package_quantity !== undefined
      ? item.package_quantity
      : item.quantity; // nếu chưa có package_quantity thì dùng số lượng đặt (thùng)

    return sum + qty * item.unit_price;
  }, 0) || 0;

  const currentStep = getStatusStep(order.status);
  const next = getNextStatus(order.status);
  const canProceed = next && order.status !== 'delivered';

  // Ghi chú xác nhận từ cửa hàng (khi store bấm "Đã nhận hàng")
  // CHỈ lấy store_receive_note khi status = delivered (không phải rejected)
  const storeConfirmNote =
    (order.status === 'delivered' && order.store_receive_note) ||
    order.store_confirmation_note ||
    order.receive_note ||
    order.store_note ||
    null;

  // Lý do từ chối từ warehouse (khi warehouse từ chối đơn hàng)
  const warehouseRejectNote =
    (order.status === 'rejected' && order.store_receive_note) ||
    null;

  // Các sản phẩm có chênh lệch giữa SL thực tế giao (kho) và SL nhận thực tế (cửa hàng)
  const discrepancyItems =
    order.orderItems
      ?.filter((item) => {
        if (item.received_quantity === null || item.received_quantity === undefined) return false;
        const shippedQty =
          item.package_quantity !== null && item.package_quantity !== undefined
            ? Number(item.package_quantity)
            : Number(item.quantity || 0);
        const receivedQty = Number(item.received_quantity);
        if (isNaN(shippedQty) || isNaN(receivedQty)) return false;
        return receivedQty < shippedQty;
      }) || [];
  const hasDiscrepancy = discrepancyItems.length > 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 1, md: 3 }, py: 2, bgcolor: 'white' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <SecondaryButton
            startIcon={<BackIcon />}
            onClick={() => navigate('/warehouse/branch-orders')}
            sx={{ mr: 1 }}
          >
            Quay lại
          </SecondaryButton>
          <ShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Chi tiết đơn hàng
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} lg={8}>
            {/* Order Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6" fontWeight={700}>
                    Đơn hàng #ORD{String(order.order_id).padStart(3, '0')}
                  </Typography>
                  <Chip
                    label={statusLabels[order.status]}
                    color={statusColors[order.status]}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                {/* Nút in phiếu xuất kho – bấm chủ động, không tự động gây đứng màn hình */}
                {(order.status === 'shipped' || order.status === 'delivered') && (
                  <SecondaryButton
                    variant="outlined"
                    size="small"
                    startIcon={<ShippingIcon />}
                    onClick={() => printShipmentTicket(order)}
                  >
                    In phiếu xuất kho
                  </SecondaryButton>
                )}
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

            {/* Lý do từ chối từ warehouse */}
            {warehouseRejectNote && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="error.dark">
                  ❌ Lý do từ chối đơn hàng từ kho
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {warehouseRejectNote}
                </Typography>
              </Paper>
            )}

            {/* Store confirmation note after receiving goods */}
            {(storeConfirmNote || order.orderItems?.some(item => item.received_quantity !== null && item.received_quantity !== undefined)) && order.status !== 'rejected' && (
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

                {/* Báo cáo kiểm kê tồn kho khi có chênh lệch SL giao / nhận */}
                {hasDiscrepancy && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      📊 Báo cáo kiểm kê tồn kho (khi có chênh lệch)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Có chênh lệch giữa <strong>SL thực tế giao</strong> từ kho và <strong>SL nhận thực tế</strong> tại cửa hàng.
                      Vui lòng nhập lý do để lập báo cáo kiểm kê tồn kho.
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>SL Thực tế giao</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>SL Nhận thực tế</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Chênh lệch</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Lý do chênh lệch</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {discrepancyItems.map((item) => {
                            const shippedQty =
                              item.package_quantity !== null && item.package_quantity !== undefined
                                ? Number(item.package_quantity)
                                : Number(item.quantity || 0);
                            const receivedQty = Number(item.received_quantity || 0);
                            const diff = receivedQty - shippedQty; // âm nếu nhận thiếu
                            const reason = inventoryAuditReasons[item.order_item_id] || '';

                            return (
                              <TableRow key={item.order_item_id}>
                                <TableCell>
                                  {item.product?.name || item.product_name || 'N/A'}
                                </TableCell>
                                <TableCell align="right">{shippedQty}</TableCell>
                                <TableCell align="right">{receivedQty}</TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="error.main"
                                  >
                                    {diff}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ position: 'relative' }}>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      placeholder="Nhập lý do chênh lệch..."
                                      value={reason}
                                      onChange={(e) => handleDiscrepancyReasonChange(item.order_item_id, e.target.value)}
                                      helperText={savingReasons[item.order_item_id] ? 'Đang lưu...' : 'Tự động lưu'}
                                    />
                                    {savingReasons[item.order_item_id] && (
                                      <CircularProgress
                                        size={16}
                                        sx={{
                                          position: 'absolute',
                                          right: 8,
                                          top: '50%',
                                          transform: 'translateY(-50%)'
                                        }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ textAlign: 'right' }}>
                      <PrimaryButton
                        size="small"
                        onClick={() => printInventoryAuditReport(order, discrepancyItems, inventoryAuditReasons)}
                      >
                        In báo cáo kiểm kê tồn kho
                      </PrimaryButton>
                    </Box>
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
              <Box sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
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

                      // Hiển thị SL thực tế giao theo đơn vị lớn (thùng)
                      // CHỈ dùng package_quantity (số thùng) nếu có, KHÔNG tự quy đổi từ đơn vị nhỏ
                      let displayQty = item.quantity; // mặc định = số lượng đặt (thùng)
                      if (item.package_quantity !== null && item.package_quantity !== undefined) {
                        displayQty = item.package_quantity;
                      }

                      // Tính tồn kho theo đơn vị lớn (thùng): luôn tính lại từ base_quantity với package_conversion để đảm bảo chính xác
                      let stockInPackages = null;
                      let packageUnitLabel = '';

                      const stockConversionFactor =
                        packageConversion && packageConversion > 1 ? packageConversion : null;

                      if (packageUnit) {
                        packageUnitLabel = packageUnit.name || 'Thùng';

                        // Luôn tính lại từ base_quantity với conversion factor
                        if (stockConversionFactor && stockAvailable > 0) {
                          stockInPackages = Math.floor(stockAvailable / stockConversionFactor);
                        } else if (
                          packageQuantityFromBackend !== null &&
                          packageQuantityFromBackend !== undefined
                        ) {
                          // Fallback: dùng từ backend nếu không có conversion factor
                          stockInPackages = Math.floor(packageQuantityFromBackend);
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
                                    max: (() => {
                                      // Tính max dựa trên min(số lượng đặt, tồn kho)
                                      let maxByStock = null;

                                      if (stockInPackages !== null && stockInPackages !== undefined) {
                                        maxByStock = Math.floor(stockInPackages);
                                      } else if (stockAvailable > 0) {
                                        if (stockConversionFactor && stockConversionFactor > 1) {
                                          maxByStock = Math.floor(stockAvailable / stockConversionFactor);
                                        } else {
                                          maxByStock = Math.floor(stockAvailable);
                                        }
                                      }

                                      if (order.status === 'confirmed') {
                                        // Giới hạn theo min(số lượng đặt, tồn kho)
                                        if (maxByStock !== null && maxByStock !== undefined) {
                                          return Math.min(item.quantity, maxByStock);
                                        }
                                        return item.quantity; // Fallback: giới hạn bằng số lượng đặt
                                      }

                                      // Các trạng thái khác: giới hạn theo tồn kho
                                      return maxByStock !== null && maxByStock !== undefined
                                        ? maxByStock
                                        : undefined;
                                    })()
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
                                  order.status === 'cancelled' ||
                                  order.status !== 'confirmed' ||
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
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thao tác xuất kho
              </Typography>
              <Divider sx={{ my: 2 }} />

              {/* Hiển thị cảnh báo nếu đơn hàng đã hủy hoặc bị từ chối */}
              {order.status === 'cancelled' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Đơn hàng này đã bị hủy. Không thể thực hiện các thao tác xuất kho.
                  </Typography>
                  {/* Hiển thị note từ store khi hủy */}
                  {order.notes && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      <strong>Lý do hủy từ cửa hàng:</strong> {order.notes}
                    </Typography>
                  )}
                </Alert>
              )}
              {order.status === 'rejected' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Đơn hàng này đã bị từ chối.
                  </Typography>
                  {/* Hiển thị note từ warehouse khi từ chối */}
                  {warehouseRejectNote && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      <strong>Lý do từ chối:</strong> {warehouseRejectNote}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Ngày giao dự kiến – chọn khi xác nhận đơn */}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
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
                    disabled={order.status === 'cancelled'}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: getMinDeliveryDateTime()
                    }}
                    helperText={
                      order.status === 'pending'
                        ? 'Bắt buộc chọn ngày giao trước khi xác nhận đơn hàng'
                        : 'Có thể điều chỉnh nếu cần'
                    }
                  />
                </Box>
              )}

              {order.status === 'cancelled' ? (
                <Alert severity="warning">
                  Đơn hàng đã bị hủy. Chỉ có thể xem thông tin, không thể thực hiện thao tác.
                </Alert>
              ) : order.status === 'rejected' ? (
                <Alert severity="error">
                  Đơn hàng đã bị từ chối. Không thể thực hiện thao tác.
                </Alert>
              ) : order.status === 'delivered' ? (
                <Alert severity="success">
                  ✅ Đơn hàng đã được giao thành công vào {formatDate(order.updated_at)}
                </Alert>
              ) : canProceed ? (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Trạng thái hiện tại: <strong>{statusLabels[order.status]}</strong>
                  </Alert>
                  <PrimaryButton
                    fullWidth
                    size="large"
                    startIcon={getStatusActionIcon(next)}
                    onClick={handleOpenConfirmDialog}
                    sx={{ py: 1.5, fontWeight: 600, mb: 2 }}
                  >
                    {getStatusActionLabel(next)}
                  </PrimaryButton>

                  {/* Nút từ chối đơn hàng (chỉ hiển thị khi pending) */}
                  {order.status === 'pending' && (
                    <SecondaryButton
                      fullWidth
                      size="large"
                      startIcon={<BlockIcon />}
                      onClick={handleOpenRejectDialog}
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        mb: 2,
                        color: 'error.main',
                        borderColor: 'error.main',
                        '&:hover': {
                          borderColor: 'error.dark',
                          bgcolor: 'error.light',
                          color: 'error.dark'
                        }
                      }}
                    >
                      Từ chối đơn hàng
                    </SecondaryButton>
                  )}
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Đơn hàng đang trong quá trình xử lý
                  </Alert>
                </>
              )}
            </Paper>
          </Grid>
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

      {/* Confirm Edit Dialog */}
      <Dialog
        open={confirmEditDialog}
        onClose={() => !updating && setConfirmEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Xác nhận chỉnh sửa số lượng
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Bạn có chắc muốn chỉnh sửa số lượng thực tế giao cho sản phẩm này?
          </Alert>
          {pendingEditItem && (
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sản phẩm:
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {pendingEditItem.product?.name || pendingEditItem.product_name || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Số lượng đặt: <strong>{pendingEditItem.quantity}</strong>
              </Typography>
              {pendingEditItem.package_quantity !== null && pendingEditItem.package_quantity !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Số lượng thực tế hiện tại: <strong>{pendingEditItem.package_quantity}</strong>
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <SecondaryButton onClick={() => setConfirmEditDialog(false)} disabled={updating}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleConfirmEdit}
            disabled={updating}
            startIcon={<EditIcon />}
          >
            Xác nhận chỉnh sửa
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog
        open={confirmSaveDialog}
        onClose={() => !updating && setConfirmSaveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Xác nhận lưu số lượng
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bạn có chắc muốn lưu số lượng thực tế giao đã chỉnh sửa? Hành động này sẽ cập nhật tồn kho.
          </Alert>
          {pendingSaveItemId && (() => {
            const currentItem = order.orderItems?.find(it => it.order_item_id === pendingSaveItemId);
            if (!currentItem) return null;

            const oldQty = currentItem.package_quantity !== null && currentItem.package_quantity !== undefined
              ? currentItem.package_quantity
              : currentItem.quantity;
            const newQty = parseFloat(editingQuantity);

            return (
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Sản phẩm:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {currentItem.product?.name || currentItem.product_name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Số lượng đặt: <strong>{currentItem.quantity}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Số lượng thực tế hiện tại: <strong>{oldQty}</strong>
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                  Số lượng thực tế mới: <strong>{newQty}</strong>
                </Typography>
                {newQty !== oldQty && (
                  <Typography variant="body2" color={newQty > oldQty ? 'success.main' : 'error.main'} sx={{ mt: 0.5 }}>
                    {newQty > oldQty ? '↑ Tăng' : '↓ Giảm'} {Math.abs(newQty - oldQty)} đơn vị
                  </Typography>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <SecondaryButton onClick={() => setConfirmSaveDialog(false)} disabled={updating}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleConfirmSave}
            disabled={updating}
            loading={updating}
            startIcon={<SaveIcon />}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            Xác nhận lưu
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Reject Order Dialog */}
      <Dialog
        open={rejectDialog}
        onClose={() => !updating && setRejectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600} color="error">
            Xác nhận từ chối đơn hàng
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              ⚠️ Bạn có chắc chắn muốn từ chối đơn hàng này?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Hành động này sẽ từ chối đơn hàng và thông báo cho cửa hàng. Lý do từ chối sẽ được lưu vào hệ thống.
            </Typography>
          </Alert>

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Mã đơn hàng:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              #ORD{String(order.order_id).padStart(3, '0')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cửa hàng: <strong>{order.store?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trạng thái hiện tại: <strong>{statusLabels[order.status]}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tổng giá trị: <strong>{formatVnd(totalAmount)}</strong>
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Lý do từ chối đơn hàng *"
            placeholder="Nhập lý do từ chối đơn hàng (bắt buộc)..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            required
            helperText="Lý do từ chối sẽ được gửi đến cửa hàng"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <SecondaryButton onClick={() => {
            setRejectDialog(false);
            setRejectNote('');
          }} disabled={updating}>
            Không từ chối
          </SecondaryButton>
          <PrimaryButton
            onClick={handleRejectOrder}
            disabled={updating || !rejectNote || !rejectNote.trim()}
            loading={updating}
            startIcon={<BlockIcon />}
            sx={{
              bgcolor: 'error.main',
              '&:hover': { bgcolor: 'error.dark' }
            }}
          >
            Xác nhận từ chối
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderShipment;

// ============================
// Helper: In phiếu xuất kho
// ============================
const printShipmentTicket = async (order) => {
  if (!order) throw new Error('Missing order data to print');

  const formatCurrency = (n) => {
    const num = Number(n);
    if (isNaN(num) || !isFinite(num)) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };
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
    } catch {
      return '-';
    }
  };

  const itemsHTML = (order.orderItems || []).map((item, idx) => {
    const name = item.product?.name || item.product_name || 'N/A';
    const sku = item.product?.sku || item.product_sku || '';
    const qtyOrdered = Number(item.quantity) || 0;
    // SL Thực tế giao: luôn dùng đúng số thùng (package_quantity) nếu có, không quy đổi
    const qtyDelivered =
      item.package_quantity !== null && item.package_quantity !== undefined
        ? Number(item.package_quantity) || 0
        : qtyOrdered;
    const unitPrice = Number(item.unit_price) || 0;
    // Tính subtotal: ưu tiên dùng subtotal từ DB, nếu không có thì tính lại
    let subtotal = 0;
    if (item.subtotal !== null && item.subtotal !== undefined && !isNaN(Number(item.subtotal))) {
      subtotal = Number(item.subtotal);
    } else {
      subtotal = Number(qtyDelivered) * Number(unitPrice);
      // Đảm bảo không phải NaN
      if (isNaN(subtotal)) subtotal = 0;
    }

    return `
      <tr>
        <td style="text-align:center;padding:6px;">${idx + 1}</td>
        <td style="padding:6px;">
          <div style="font-weight:600;">${name}</div>
          <div style="color:#777;font-size:12px;">${sku}</div>
        </td>
        <td style="text-align:right;padding:6px;">${qtyOrdered}</td>
        <td style="text-align:right;padding:6px;font-weight:700;color:#1976d2;">${qtyDelivered}</td>
        <td style="text-align:right;padding:6px;">${formatCurrency(unitPrice)}</td>
        <td style="text-align:right;padding:6px;font-weight:700;">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }).join('');

  // Tính tổng tiền: đảm bảo tất cả giá trị đều là số hợp lệ
  const totalAmount = (order.orderItems || []).reduce((sum, item) => {
    const qtyDelivered =
      item.package_quantity !== null && item.package_quantity !== undefined
        ? Number(item.package_quantity) || 0
        : Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    // Tính subtotal: ưu tiên dùng subtotal từ DB, nếu không có thì tính lại
    let subtotal = 0;
    if (item.subtotal !== null && item.subtotal !== undefined && !isNaN(Number(item.subtotal))) {
      subtotal = Number(item.subtotal);
    } else {
      subtotal = Number(qtyDelivered) * Number(unitPrice);
      // Đảm bảo không phải NaN
      if (isNaN(subtotal)) subtotal = 0;
    }

    // Đảm bảo subtotal là số hợp lệ trước khi cộng
    const validSubtotal = isNaN(subtotal) ? 0 : subtotal;
    return sum + validSubtotal;
  }, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Phiếu xuất kho #ORD${String(order.order_id).padStart(3, '0')}</title>
      <style>
        body { font-family: Arial, sans-serif; margin:0; padding:20px; background:#f5f5f5; }
        .container { max-width: 960px; margin: 0 auto; background:#fff; padding:24px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
        h1 { margin:0; font-size:22px; }
        .muted { color:#666; font-size:13px; }
        table { width:100%; border-collapse: collapse; margin-top:16px; }
        th { background:#f0f0f0; text-align:left; padding:8px; font-size:13px; border-bottom:2px solid #ccc; }
        td { border-bottom:1px solid #eee; font-size:13px; }
        .row { display:flex; justify-content:space-between; margin-top:12px; }
        .row div { flex:1; }
        .summary { margin-top:18px; text-align:right; font-weight:700; font-size:14px; }
        @media print {
          body { background:#fff; }
          .container { box-shadow:none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h1>PHIẾU XUẤT KHO</h1>
            <div class="muted">Mã đơn: #ORD${String(order.order_id).padStart(3, '0')}</div>
          </div>
          <div style="text-align:right;" class="muted">
            Ngày in: ${formatDate(new Date())}
          </div>
        </div>

        <div class="row" style="margin-top:16px;">
          <div>
            <strong>Cửa hàng nhận:</strong><br/>
            ${order.store?.name || 'N/A'}
          </div>
          <div>
            <strong>Ngày đặt:</strong><br/>
            ${formatDate(order.created_at)}
          </div>
          <div>
            <strong>Ngày giao dự kiến:</strong><br/>
            ${formatDate(order.expected_delivery)}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:5%;">#</th>
              <th style="width:35%;">Sản phẩm</th>
              <th style="width:10%;text-align:right;">SL Đặt</th>
              <th style="width:15%;text-align:right;">SL Thực tế</th>
              <th style="width:15%;text-align:right;">Đơn giá</th>
              <th style="width:20%;text-align:right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="summary">
          Tổng cộng: ${formatCurrency(totalAmount)}
        </div>

        <div style="margin-top:18px;" class="muted">
          Ghi chú xác nhận: ${order.store_receive_note || order.store_confirmation_note || order.receive_note || order.store_note || 'Không có'}
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '', 'height=800,width=1000');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
};

// ============================
// Helper: In Báo cáo Kiểm kê Tồn kho khi có chênh lệch
// ============================
const printInventoryAuditReport = (order, discrepancyItems, reasonsMap) => {
  if (!order || !discrepancyItems || discrepancyItems.length === 0) return;

  const formatCurrency = (n) => {
    const num = Number(n);
    if (isNaN(num) || !isFinite(num)) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };
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
    } catch {
      return '-';
    }
  };

  const rowsHtml = discrepancyItems
    .map((item, idx) => {
      const name = item.product?.name || item.product_name || 'N/A';
      const sku = item.product?.sku || item.product_sku || '';
      const qtyOrdered = Number(item.quantity || 0);
      const shippedQty =
        item.package_quantity !== null && item.package_quantity !== undefined
          ? Number(item.package_quantity)
          : qtyOrdered;
      const receivedQty = Number(item.received_quantity) || 0;
      const diff = receivedQty - shippedQty;
      const unitPrice = Number(item.unit_price) || 0;

      // Tính số tiền hàng bị chênh lệch = số lượng chênh lệch * đơn giá
      const discrepancyAmount = Number(diff) * Number(unitPrice);
      const validDiscrepancyAmount = isNaN(discrepancyAmount) ? 0 : discrepancyAmount;

      const reason = reasonsMap?.[item.order_item_id] || '';

      return `
        <tr>
          <td style="text-align:center;padding:6px;">${idx + 1}</td>
          <td style="padding:6px;">
            <div style="font-weight:600;">${name}</div>
            <div style="color:#777;font-size:12px;">${sku}</div>
          </td>
          <td style="text-align:right;padding:6px;">${qtyOrdered}</td>
          <td style="text-align:right;padding:6px;">${shippedQty}</td>
          <td style="text-align:right;padding:6px;">${receivedQty}</td>
          <td style="text-align:right;padding:6px;color:${diff < 0 ? '#d32f2f' : '#2e7d32'};font-weight:600;">
            ${diff > 0 ? '+' : ''}${diff}
          </td>
          <td style="text-align:right;padding:6px;">${formatCurrency(unitPrice)}</td>
          <td style="text-align:right;padding:6px;font-weight:700;color:${validDiscrepancyAmount < 0 ? '#d32f2f' : validDiscrepancyAmount > 0 ? '#2e7d32' : 'inherit'};">
            ${formatCurrency(validDiscrepancyAmount)}
          </td>
          <td style="padding:6px;">${reason || ''}</td>
        </tr>
      `;
    })
    .join('');

  // Tính tổng số tiền hàng bị chênh lệch
  const totalDiscrepancyAmount = discrepancyItems.reduce((sum, item) => {
    const shippedQty =
      item.package_quantity !== null && item.package_quantity !== undefined
        ? Number(item.package_quantity)
        : Number(item.quantity || 0);
    const receivedQty = Number(item.received_quantity) || 0;
    const diff = receivedQty - shippedQty;
    const unitPrice = Number(item.unit_price) || 0;

    // Tính số tiền chênh lệch = số lượng chênh lệch * đơn giá
    const discrepancyAmount = Number(diff) * Number(unitPrice);
    const validDiscrepancyAmount = isNaN(discrepancyAmount) ? 0 : discrepancyAmount;
    return sum + validDiscrepancyAmount;
  }, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Báo cáo kiểm kê tồn kho #ORD${String(order.order_id).padStart(3, '0')}</title>
      <style>
        body { font-family: Arial, sans-serif; margin:0; padding:20px; background:#f5f5f5; }
        .container { max-width: 960px; margin: 0 auto; background:#fff; padding:24px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
        h1 { margin:0; font-size:22px; }
        .muted { color:#666; font-size:13px; }
        table { width:100%; border-collapse: collapse; margin-top:16px; }
        th { background:#f0f0f0; text-align:left; padding:8px; font-size:13px; border-bottom:2px solid #ccc; }
        td { border-bottom:1px solid #eee; font-size:13px; }
        .row { display:flex; justify-content:space-between; margin-top:12px; }
        .row div { flex:1; }
        .summary { margin-top:18px; text-align:right; font-weight:700; font-size:14px; }
        @media print {
          body { background:#fff; }
          .container { box-shadow:none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h1>BÁO CÁO KIỂM KÊ TỒN KHO</h1>
            <div class="muted">Mã đơn xuất: #ORD${String(order.order_id).padStart(3, '0')}</div>
          </div>
          <div style="text-align:right;" class="muted">
            Ngày in: ${formatDate(new Date())}
          </div>
        </div>

        <div class="row" style="margin-top:16px;">
          <div>
            <strong>Cửa hàng:</strong><br/>
            ${order.store?.name || 'N/A'}
          </div>
          <div>
            <strong>Ngày xuất kho:</strong><br/>
            ${formatDate(order.updated_at || order.created_at)}
          </div>
          <div>
            <strong>Người lập báo cáo:</strong><br/>
            ..................................
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:4%;">#</th>
              <th style="width:26%;">Sản phẩm</th>
              <th style="width:8%;text-align:right;">SL Đặt</th>
              <th style="width:10%;text-align:right;">SL Thực tế giao</th>
              <th style="width:10%;text-align:right;">SL Nhận thực tế</th>
              <th style="width:8%;text-align:right;">Chênh lệch</th>
              <th style="width:12%;text-align:right;">Đơn giá</th>
              <th style="width:12%;text-align:right;">Số tiền hàng bị chênh lệch</th>
              <th style="width:20%;">Lý do kiểm kê</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary">
          Tổng số tiền hàng bị chênh lệch: ${formatCurrency(totalDiscrepancyAmount)}
        </div>

        <div style="margin-top:24px; display:flex; justify-content:space-between;">
          <div style="text-align:center; flex:1;">
            <strong>Người lập báo cáo</strong><br/><br/><br/>
            (Ký, ghi rõ họ tên)
          </div>
          <div style="text-align:center; flex:1;">
            <strong>Thủ kho</strong><br/><br/><br/>
            (Ký, ghi rõ họ tên)
          </div>
          <div style="text-align:center; flex:1;">
            <strong>Quản lý</strong><br/><br/><br/>
            (Ký, ghi rõ họ tên)
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '', 'height=800,width=1000');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
};
