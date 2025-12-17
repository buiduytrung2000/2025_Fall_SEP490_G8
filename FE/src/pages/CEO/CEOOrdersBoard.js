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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  Stack,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { Assignment, LocalShipping, Visibility as VisibilityIcon, Close as CloseIcon } from "@mui/icons-material";
import {
  getRecentPurchaseOrders,
  getWarehouseOrdersSummary,
  getRecentBranchOrders,
  getBranchOrdersSummary,
} from "../../api/dashboardApi";
import { getWarehouseSupplierOrderDetail } from "../../api/warehouseOrderApi";
import { getStoreOrderDetail } from "../../api/storeOrderApi";
import { ToastNotification, SecondaryButton } from "../../components/common";

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
  preparing: "info",
  shipped: "primary",
  delivered: "success",
};

const orderStatusLabelMap = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  preparing: "Đang chuẩn bị",
  shipped: "Đã giao",
  delivered: "Đã nhận",
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
  const [activeTab, setActiveTab] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [branchOrders, setBranchOrders] = useState([]);
  const [warehouseOrders, setWarehouseOrders] = useState(null);
  const [branchOrdersStats, setBranchOrdersStats] = useState(null);
  
  // Detail modal states
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [purchaseRes, warehouseRes, branchRes, branchStatsRes] = await Promise.all([
          getRecentPurchaseOrders(12),
          getWarehouseOrdersSummary(),
          getRecentBranchOrders(12),
          getBranchOrdersSummary(),
        ]);

        if (purchaseRes.err === 0) setPurchaseOrders(purchaseRes.data);
        if (warehouseRes.err === 0) setWarehouseOrders(warehouseRes.data);
        if (branchRes.err === 0) setBranchOrders(branchRes.data);
        if (branchStatsRes.err === 0) setBranchOrdersStats(branchStatsRes.data);
      } catch (error) {
        ToastNotification.error("Không tải được dữ liệu nhập/xuất: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const warehouseSummary = warehouseOrders || {};
  const branchSummary = branchOrdersStats || {};

  // Handle view purchase order detail
  const handleViewPurchaseOrder = async (order) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setSelectedOrder({ ...order, type: 'purchase' });
    setOrderItems([]);

    try {
      const res = await getWarehouseSupplierOrderDetail(order.order_id);
      if (res.err === 0 && res.data) {
        setOrderItems(res.data.items || []);
      } else {
        ToastNotification.error(res.msg || "Không thể tải chi tiết đơn hàng");
      }
    } catch (error) {
      ToastNotification.error("Lỗi khi tải chi tiết: " + error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle view branch order detail
  const handleViewBranchOrder = async (order) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setSelectedOrder({ ...order, type: 'branch' });
    setOrderItems([]);

    try {
      const res = await getStoreOrderDetail(order.store_order_id);
      if (res.err === 0 && res.data) {
        setOrderItems(res.data.items || []);
      } else {
        ToastNotification.error(res.msg || "Không thể tải chi tiết đơn hàng");
      }
    } catch (error) {
      ToastNotification.error("Lỗi khi tải chi tiết: " + error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedOrder(null);
    setOrderItems([]);
  };

  const purchaseOrderColumns = useMemo(
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
      {
        id: "actions",
        header: "Thao tác",
        size: 80,
        enableSorting: false,
        Cell: ({ row }) => (
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleViewPurchaseOrder(row.original)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const branchOrderColumns = useMemo(
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
        accessorKey: "store_name",
        header: "Chi nhánh",
        size: 200,
        Cell: ({ cell, row }) => (
          <Box>
            <Typography fontWeight={600}>{cell.getValue()}</Typography>
            {row.original.notes && (
              <Typography variant="caption" color="text.secondary">
                {row.original.notes}
              </Typography>
            )}
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
        header: "Giá trị ước tính",
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
      {
        id: "actions",
        header: "Thao tác",
        size: 80,
        enableSorting: false,
        Cell: ({ row }) => (
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleViewBranchOrder(row.original)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Bảng đơn hàng nhập/xuất
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Đơn nhập kho" icon={<Assignment />} iconPosition="start" />
          <Tab label="Đơn xuất chi nhánh" icon={<LocalShipping />} iconPosition="start" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <>
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

          <Card sx={{ mb: 3 }}>
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
                columns={purchaseOrderColumns}
                data={purchaseOrders}
                state={{ isLoading: loading }}
                muiTableContainerProps={{ sx: { maxHeight: 520 } }}
                enableColumnFilters={false}
                enableColumnActions={false}
                enableStickyHeader
                initialState={{ pagination: { pageSize: 10 }, density: "compact" }}
                localization={{
                  rowsPerPage: 'Số dòng mỗi trang',
                }}
                renderEmptyRowsFallback={() => (
                  <Alert severity="info" sx={{ m: 2 }}>
                    Chưa có đơn nhập hàng nào.
                  </Alert>
                )}
              />
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Tổng đơn xuất
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatNumber(branchSummary.total || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(branchSummary.totalAmount || 0)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Đang chuẩn bị
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatNumber(branchSummary.preparing || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đang xử lý
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Đã giao hàng
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatNumber(branchSummary.shipped || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đang vận chuyển
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Đã hoàn thành
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatNumber(branchSummary.delivered || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chi nhánh đã nhận
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                mb={2}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <LocalShipping /> Đơn xuất chi nhánh gần nhất
              </Typography>
              <MaterialReactTable
                columns={branchOrderColumns}
                data={branchOrders}
                state={{ isLoading: loading }}
                muiTableContainerProps={{ sx: { maxHeight: 520 } }}
                enableColumnFilters={false}
                enableColumnActions={false}
                enableStickyHeader
                initialState={{ pagination: { pageSize: 10 }, density: "compact" }}
                localization={{
                  rowsPerPage: 'Số dòng mỗi trang',
                }}
                renderEmptyRowsFallback={() => (
                  <Alert severity="info" sx={{ m: 2 }}>
                    Chưa có đơn xuất hàng nào.
                  </Alert>
                )}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedOrder?.type === 'purchase' ? <Assignment /> : <LocalShipping />}
            Chi tiết {selectedOrder?.type === 'purchase' ? 'đơn nhập' : 'đơn xuất'}
          </Box>
          <IconButton size="small" onClick={handleCloseDetail} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <Skeleton variant="rectangular" width="100%" height={200} />
            </Box>
          ) : selectedOrder ? (
            <>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Mã đơn hàng
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.order_code}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Trạng thái
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={orderStatusLabelMap[selectedOrder.status] || selectedOrder.status}
                      color={orderStatusColorMap[selectedOrder.status] || "default"}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    {selectedOrder.type === 'purchase' ? 'Nhà cung cấp' : 'Chi nhánh'}
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.type === 'purchase' ? selectedOrder.supplier_name : selectedOrder.store_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Ngày tạo
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatDate(selectedOrder.created_at)}
                  </Typography>
                </Grid>
                {selectedOrder.type === 'purchase' && selectedOrder.expected_delivery && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Giao dự kiến
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatDate(selectedOrder.expected_delivery)}
                    </Typography>
                  </Grid>
                )}
                {selectedOrder.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Ghi chú
                    </Typography>
                    <Typography variant="body2">
                      {selectedOrder.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                Danh sách sản phẩm
              </Typography>

              {orderItems.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>STT</TableCell>
                      <TableCell>Tên sản phẩm</TableCell>
                      <TableCell align="right">Số lượng</TableCell>
                      <TableCell align="right">Đơn giá</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {item.product_name || item.name || 'N/A'}
                          </Typography>
                          {item.sku && (
                            <Typography variant="caption" color="text.secondary">
                              SKU: {item.sku}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{formatNumber(item.quantity || 0)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unit_price || 0)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.subtotal || (item.quantity * item.unit_price) || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>
                        Tổng cộng:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {formatCurrency(
                          orderItems.reduce((sum, item) => sum + (item.subtotal || (item.quantity * item.unit_price) || 0), 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Alert severity="info">Không có sản phẩm nào trong đơn hàng này.</Alert>
              )}
            </>
          ) : (
            <Alert severity="error">Không thể tải thông tin đơn hàng.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={handleCloseDetail}>Đóng</SecondaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

