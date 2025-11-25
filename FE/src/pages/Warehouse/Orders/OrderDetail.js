import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { toast } from "react-toastify";
import {
  getWarehouseSupplierOrderDetail,
  updateWarehouseSupplierOrderStatus,
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

export default function OrderDetail() {
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        setOrder(res.data);
        // setDeliveryDate(
        //   res.data.expected_delivery
        //     ? res.data.expected_delivery.substring(0, 10)
        //     : ""
        // );
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
