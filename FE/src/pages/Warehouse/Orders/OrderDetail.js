import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { toast } from "react-toastify";
import {
  getWarehouseSupplierOrderDetail,
  updateWarehouseSupplierOrderStatus,
  updateWarehouseSupplierExpectedDelivery,
} from "../../../api/warehouseOrderApi";

// Three-stage status system
const statusColors = {
  pending: "warning",
  confirmed: "info",
  preparing: "default",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
};

const statusLabels = {
  pending: 'Đang chờ',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy'
};

const nextTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export default function OrderDetail() {
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  // Status update dialog
  const [updateDialog, setUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // Product selector dialog
  const [productDialog, setProductDialog] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        setOrder(res.data);
        setDeliveryDate(
          res.data.expected_delivery
            ? res.data.expected_delivery.substring(0, 10)
            : ""
        );
      } else setError(res.msg || "Không tìm thấy đơn hàng");
    } catch (e) {
      setError("Lỗi kết nối: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [orderId]);

  const canTransitionTo = (target) =>
    (nextTransitions[order?.status] || []).includes(target);

  const handleQuickUpdateStatus = async (targetStatus) => {
    if (!order) return;
    if (!canTransitionTo(targetStatus)) {
      return toast.error("Không thể chuyển trạng thái này");
    }
    try {
      const res = await updateWarehouseSupplierOrderStatus(
        order.order_id,
        targetStatus
      );
      if (res.err === 0) {
        toast.success("Cập nhật trạng thái thành công");
        loadDetail();
      } else toast.error(res.msg || "Không thể cập nhật trạng thái");
    } catch (e) {
      toast.error("Lỗi kết nối: " + e.message);
    }
  };

  const handleUpdateDelivery = async () => {
    if (!deliveryDate) {
      toast.error('Vui lòng chọn ngày giao hàng');
      return;
    }
    if (order.status !== 'pending') {
      toast.error('Chỉ có thể cập nhật ngày giao cho đơn hàng đang chờ');
      return;
    }
    if (deliveryDate === originalDeliveryDate) {
      toast.info('Ngày giao hàng không thay đổi');
      return;
    }

    setUpdatingDelivery(true);
    try {
      const res = await updateWarehouseSupplierExpectedDelivery(
        order.order_id,
        deliveryDate || null
      );
      if (res.err === 0) {
        toast.success("Cập nhật ngày giao dự kiến thành công");
        loadDetail();
      } else toast.error(res.msg || "Không thể cập nhật");
    } catch (e) {
      toast.error("Lỗi kết nối: " + e.message);
    } finally {
      setUpdatingDelivery(false);
    }
  };

  if (loading)
    return (
      <Box p={2}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  if (!order) return null;

  const totalAmount = Number(order.totalAmount || 0);
  const orderCode =
    order.order_code || `ORD${String(order.order_id || "").padStart(3, "0")}`;

  const handleAddProduct = async (newItem) => {
    // Add the new item to existing items and save
    const currentItems = order.orderItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      unit_id: item.unit_id
    }));

    const updatedItems = [...currentItems, {
      product_id: newItem.product_id,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      unit_id: newItem.unit_id
    }];

    await handleSaveOrderItems(updatedItems);
  };

  const isEditable = order?.status === 'pending';
  const hasDeliveryDateChanges = deliveryDate !== originalDeliveryDate;

  if (loading) return <Box p={2}><CircularProgress /></Box>;
  if (error) return <Box p={2}><Alert severity="error">{error}</Alert></Box>;
  if (!order) return <Box p={2}><Alert severity="info">Không tìm thấy đơn hàng</Alert></Box>;

  return (
    <Box p={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          Chi tiết đơn hàng {orderCode}
        </Typography>
      </Stack>

      {!isEditable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Đơn hàng này đã được {order.status === 'confirmed' ? 'xác nhận' : 'hủy'} và không thể chỉnh sửa.
        </Alert>
      )}

      {/* Order Information */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Thông tin đơn hàng</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography>
              <b>Nhà cung cấp:</b> {order.supplier?.name || "—"}
            </Typography>
            <Typography>
              <b>Người tạo:</b>{" "}
              {order.creator?.username || order.creator?.email || "—"}
            </Typography>
            <Typography>
              <b>Ngày tạo:</b> {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              {/* <TextField
                type="date"
                label="Ngày giao dự kiến"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                size="small"
              />
              <Button
                onClick={handleUpdateDelivery}
                disabled={updatingDelivery}
              > */}
                {/* {updatingDelivery ? "Đang lưu..." : "Lưu"}
              </Button> */}
            </Stack>
            {/* <Typography sx={{ mt: 1 }}>
              <b>Tổng tiền:</b> {totalAmount.toLocaleString("vi-VN")} đ
            </Typography> */}
          </Grid>
          {/* <Grid item xs={12} md={4}>
            <Typography>
              <b>Trạng thái:</b>
            </Typography>
            <Chip
              sx={{ mt: 1 }}
              size="medium"
              color={statusColors[order.status] || "default"}
              label={order.status}
            />
          </Grid> */}
        </Grid>
      </Paper>

      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Sản phẩm
        </Typography>
        <Divider />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Tên sản phẩm</TableCell>
              <TableCell align="right">Số lượng</TableCell>
              <TableCell align="right">Đơn giá</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Thành tiền</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(order.orderItems || []).map((it) => (
              <TableRow key={it.order_item_id}>
                <TableCell>{it.product?.sku || "—"}</TableCell>
                <TableCell>{it.product?.name || "—"}</TableCell>
                <TableCell align="right">
                  {(Number(it.display_quantity ?? it.quantity) || 0).toLocaleString("vi-VN")}{" "}
                  {it.display_unit_label || it.unit?.name || it.unit?.symbol || ""}
                </TableCell>
                <TableCell align="right">
                  {Number(it.display_unit_price ?? it.unit_price).toLocaleString("vi-VN")} đ
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    color={statusColors[it.status || order.status] || "default"}
                    label={it.status || order.status || "—"}
                  />
                </TableCell>
                <TableCell align="right">
                  {Number(it.subtotal).toLocaleString("vi-VN")} đ
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Divider />
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Tổng cộng:&nbsp;
            <Typography component="span" color="primary" fontWeight={700}>
              {totalAmount.toLocaleString("vi-VN")} đ
            </Typography>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
