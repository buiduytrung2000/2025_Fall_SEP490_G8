import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Skeleton,
  Chip,
  Alert,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { Assignment, Inventory2 } from "@mui/icons-material";
import {
  getRecentPurchaseOrders,
  getWarehouseOrdersSummary,
  getInventoryOverview,
} from "../../api/dashboardApi";
import { ToastNotification } from "../../components/common";

const summaryBoxSx = {
  borderRadius: 2,
  p: 2.5,
  bgcolor: "#f5f7fb",
  border: "1px solid #e5e9f2",
  height: "100%",
};

const orderStatusColorMap = {
  pending: "warning",
  confirmed: "success",
  cancelled: "default",
};

const orderStatusLabelMap = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) => new Intl.NumberFormat("vi-VN").format(value || 0);

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
};

export default function CEOOrdersBoard() {
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouseOrders, setWarehouseOrders] = useState(null);
  const [inventoryOverview, setInventoryOverview] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ordersRes, warehouseRes, inventoryRes] = await Promise.all([
          getRecentPurchaseOrders(12),
          getWarehouseOrdersSummary(),
          getInventoryOverview(),
        ]);

        if (ordersRes.err === 0) setPurchaseOrders(ordersRes.data);
        if (warehouseRes.err === 0) setWarehouseOrders(warehouseRes.data);
        if (inventoryRes.err === 0) setInventoryOverview(inventoryRes.data);
      } catch (error) {
        ToastNotification.error("Không tải được dữ liệu nhập/xuất: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const warehouseSummary = warehouseOrders || {};
  const orderColumns = useMemo(
    () => [
      {
        id: "stt",
        header: "STT",
        size: 60,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "order_code",
        header: "Mã đơn",
        size: 120,
      },
      {
        accessorKey: "supplier_name",
        header: "Nhà cung cấp",
        size: 220,
        Cell: ({ cell, row }) => (
          <Box>
            <Typography fontWeight={600}>{cell.getValue()}</Typography>
            <Typography variant="caption" color="text.secondary">
              Giao dự kiến: {formatDate(row.original.expected_delivery)}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        enableSorting: false,
        Cell: ({ cell }) => (
          <Chip
            label={orderStatusLabelMap[cell.getValue()] || cell.getValue()}
            color={orderStatusColorMap[cell.getValue()] || "default"}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        accessorKey: "total_amount",
        header: "Giá trị",
        muiTableHeadCellProps: { align: "right" },
        muiTableBodyCellProps: { align: "right" },
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: "created_at",
        header: "Ngày tạo",
        muiTableHeadCellProps: { align: "right" },
        muiTableBodyCellProps: { align: "right" },
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
    ],
    []
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Bảng đơn hàng nhập/xuất
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={summaryBoxSx}>
            <Typography variant="caption" color="text.secondary">
              Tổng đơn nhập kho
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatNumber(warehouseSummary.total || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(warehouseSummary.totalAmount || 0)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={summaryBoxSx}>
            <Typography variant="caption" color="text.secondary">
              Đang chờ xác nhận
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatNumber(warehouseSummary.pending || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đơn chưa xử lý
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={summaryBoxSx}>
            <Typography variant="caption" color="text.secondary">
              Đã xác nhận
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatNumber(warehouseSummary.confirmed || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đơn hoàn tất
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={summaryBoxSx}>
            <Typography variant="caption" color="text.secondary">
              Đã hủy
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatNumber(warehouseSummary.cancelled || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đơn không thành công
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="h6"
                mb={2}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Assignment /> Đơn nhập kho gần nhất
              </Typography>
              <MaterialReactTable
                columns={orderColumns}
                data={purchaseOrders}
                state={{ isLoading: loading }}
                muiTableContainerProps={{ sx: { maxHeight: 520 } }}
                enableColumnFilters={false}
                enableColumnActions={false}
                enableStickyHeader
                initialState={{ pagination: { pageSize: 10 }, density: "compact" }}
                renderEmptyRowsFallback={() => (
                  <Alert severity="info" sx={{ m: 2 }}>
                    Chưa có đơn nhập hàng nào.
                  </Alert>
                )}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="h6"
                mb={2}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Inventory2 /> Tồn kho & trạng thái nhập xuất
              </Typography>
              {loading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : inventoryOverview ? (
                <>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Tổng tồn kho
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {formatNumber(inventoryOverview.totalUnits)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Có thể xuất
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {formatNumber(
                          Math.max(inventoryOverview.availableUnits || 0, 0)
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Đang giữ chỗ
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatNumber(inventoryOverview.reservedUnits)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Số SKU
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatNumber(inventoryOverview.skuCount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Giá trị ước tính
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(inventoryOverview.totalValue)}
                      </Typography>
                    </Grid>
                  </Grid>
                  {warehouseOrders && (
                    <Box mt={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Phân bổ trạng thái đơn
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Chip
                          label={`Chờ duyệt: ${formatNumber(
                            warehouseOrders.pending || 0
                          )}`}
                          color="warning"
                          variant="outlined"
                        />
                        <Chip
                          label={`Đã xác nhận: ${formatNumber(
                            warehouseOrders.confirmed || 0
                          )}`}
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          label={`Đã hủy: ${formatNumber(
                            warehouseOrders.cancelled || 0
                          )}`}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  Chưa có dữ liệu tồn kho để hiển thị.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

