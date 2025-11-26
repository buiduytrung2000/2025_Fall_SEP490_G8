import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Divider,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import {
  getWarehouseSupplierOrderDetail,
  updateWarehouseSupplierOrderStatus,
} from "../../api/warehouseOrderApi";
import { toast } from "react-toastify";

const statusColors = {
  pending: "warning",
  confirmed: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
};

const statusLabels = {
  pending: "Đang chờ",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const SupplierOrderDetail = () => {
  const { orderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getWarehouseSupplierOrderDetail(orderId);
      if (res.err === 0) {
        const normalizedStatus =
          res.data.status === "preparing" ? "confirmed" : res.data.status;
        setOrder({ ...res.data, status: normalizedStatus });
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

  const handleUpdateStatus = async (next) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await updateWarehouseSupplierOrderStatus(order.order_id, next);
      if (res.err === 0) {
        toast.success(
          next === "confirmed" ? "Đã xác nhận đơn hàng" : "Đã từ chối đơn hàng"
        );
        await loadDetail();
      } else {
        toast.error(res.msg || "Không thể cập nhật trạng thái");
      }
    } catch (e) {
      toast.error("Lỗi kết nối: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const canConfirm = order?.status === "pending";
  const canReject = order?.status === "pending";

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
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        mb={2}
        spacing={2}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Đơn hàng {orderCode}
          </Typography>
          <Typography color="text.secondary">
            Đây là thông tin chi tiết đơn hàng kho đã gửi cho bạn.
          </Typography>
        </Box>
       
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Button
          variant="contained"
          color="success"
          disabled={!canConfirm || updating}
          onClick={() => handleUpdateStatus("confirmed")}
        >
          {updating && canConfirm ? "Đang xử lý..." : "Xác nhận đơn hàng"}
        </Button>
        <Button
          variant="outlined"
          color="error"
          disabled={!canReject || updating}
          onClick={() => handleUpdateStatus("cancelled")}
        >
          {updating && !canConfirm ? "Đang xử lý..." : "Từ chối đơn hàng"}
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography>
              <b>Nhà cung cấp:</b> {order.supplier?.name || "—"}
            </Typography>
            <Typography>
              <b>Người tạo:</b>{" "}
              {order.creator?.username || order.creator?.email || "—"}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              <b>Ngày tạo:</b>{" "}
              {order.created_at
                ? new Date(order.created_at).toLocaleString("vi-VN")
                : "—"}
            </Typography>
            <Typography>
              <b>Ngày giao dự kiến:</b>{" "}
              {order.expected_delivery
                ? new Date(order.expected_delivery).toLocaleDateString("vi-VN")
                : "—"}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              <b>Tổng tiền:</b>{" "}
              {totalAmount.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
                minimumFractionDigits: 0,
              })}
            </Typography>
          </Grid>
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
                  {(() => {
                    const resolvedStatus =
                      it.status === "preparing"
                        ? "confirmed"
                        : it.status || order.status;
                    return (
                      <Chip
                        size="small"
                        color={statusColors[resolvedStatus] || "default"}
                        label={statusLabels[resolvedStatus] || resolvedStatus || "—"}
                      />
                    );
                  })()}
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
};

export default SupplierOrderDetail;

