import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Grid,
  Skeleton,
  Alert,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { getBranchProductSales } from "../../api/dashboardApi";
import { ToastNotification } from "../../components/common";

const summaryBoxSx = {
  borderRadius: 2,
  p: 2,
  bgcolor: "#f5f7fb",
  border: "1px solid #e5e9f2",
  height: "100%",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) => new Intl.NumberFormat("vi-VN").format(value || 0);

export default function CEORevenueBoard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filters, setFilters] = useState({
    period: "month",
    storeId: "all",
    year: currentYear,
    month: currentMonth,
  });
  const [branchSalesData, setBranchSalesData] = useState({
    stores: [],
    sales: [],
    filters: null,
  });
  const [loading, setLoading] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, idx) => currentYear - idx);
  const monthOptions = Array.from({ length: 12 }, (_, idx) => idx + 1);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: field === "year" || field === "month" ? Number(value) : value,
    }));
  };

  useEffect(() => {
    const fetchBranchSales = async () => {
      try {
        setLoading(true);
        const payload = {
          period: filters.period,
          year: filters.year,
          limit: 50,
        };

        if (filters.storeId && filters.storeId !== "all") {
          payload.storeId = Number(filters.storeId);
        }

        if (filters.period === "month") {
          payload.month = filters.month;
        }

        const response = await getBranchProductSales(payload);
        if (response.err === 0) {
          setBranchSalesData(response.data);
        } else {
          throw new Error(response.msg || "Không tải được dữ liệu.");
        }
      } catch (error) {
        ToastNotification.error(error.message || "Không tải được dữ liệu doanh thu.");
      } finally {
        setLoading(false);
      }
    };

    fetchBranchSales();
  }, [filters.period, filters.storeId, filters.year, filters.month]);

  const branchStoreOptions = branchSalesData?.stores || [];
  const branchSalesRows = branchSalesData?.sales || [];

  const columns = useMemo(
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
        accessorKey: "product_name",
        header: "Sản phẩm",
        size: 220,
      },
      {
        accessorKey: "store_name",
        header: "Chi nhánh",
        size: 180,
      },
      {
        accessorKey: "quantity",
        header: "Đã bán",
        muiTableHeadCellProps: { align: "right" },
        muiTableBodyCellProps: { align: "right" },
        Cell: ({ cell }) => formatNumber(cell.getValue()),
      },
      {
        accessorKey: "revenue",
        header: filters.period === "month" ? "Doanh thu tháng" : "Doanh thu năm",
        muiTableHeadCellProps: { align: "right" },
        muiTableBodyCellProps: { align: "right" },
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
    ],
    [filters.period]
  );

  const { totalRevenue, totalQuantity, productCount, storeCount } = useMemo(() => {
    const revenue = branchSalesRows.reduce(
      (sum, row) => sum + Number(row.revenue || 0),
      0
    );
    const quantity = branchSalesRows.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0
    );
    const uniqueProducts = new Set(branchSalesRows.map((row) => row.product_id));
    const uniqueStores = new Set(
      branchSalesRows.map((row) => row.store_id || "all")
    );

    return {
      totalRevenue: revenue,
      totalQuantity: quantity,
      productCount: uniqueProducts.size,
      storeCount: filters.storeId === "all" ? uniqueStores.size : 1,
    };
  }, [branchSalesRows, filters.storeId]);

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Bảng doanh thu
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h6">Doanh số theo chi nhánh</Typography>
              <Typography variant="body2" color="text.secondary">
                Theo dõi doanh thu từng sản phẩm tại mỗi chi nhánh
              </Typography>
            </Box>
            <Tabs
              value={filters.period}
              onChange={(_, newValue) => handleFilterChange("period", newValue)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": { minHeight: 36, fontSize: "0.9rem" },
              }}
            >
              <Tab label="Tháng" value="month" />
              <Tab label="Năm" value="year" />
            </Tabs>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              select
              size="small"
              label="Chi nhánh"
              value={filters.storeId}
              onChange={(e) => handleFilterChange("storeId", e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              {branchStoreOptions.map((store) => (
                <MenuItem key={store.store_id} value={String(store.store_id)}>
                  {store.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Năm"
              value={filters.year}
              onChange={(e) => handleFilterChange("year", e.target.value)}
              sx={{ minWidth: 140 }}
            >
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
            {filters.period === "month" && (
              <TextField
                select
                size="small"
                label="Tháng"
                value={filters.month}
                onChange={(e) => handleFilterChange("month", e.target.value)}
                sx={{ minWidth: 140 }}
              >
                {monthOptions.map((month) => (
                  <MenuItem key={month} value={month}>
                    Tháng {month}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>

          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6} md={6}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Tổng doanh thu
                </Typography>
                <Typography variant="h6">{formatCurrency(totalRevenue)}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Box sx={summaryBoxSx}>
                <Typography variant="caption" color="text.secondary">
                  Tổng sản phẩm bán
                </Typography>
                <Typography variant="h6">{formatNumber(totalQuantity)}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Box mt={3}>
            <MaterialReactTable
              columns={columns}
              data={branchSalesRows}
              state={{ isLoading: loading }}
              enableStickyHeader
              muiTableContainerProps={{ sx: { maxHeight: 520 } }}
              initialState={{ pagination: { pageSize: 10 }, density: "compact" }}
              enableColumnActions={false}
              enableColumnFilters={false}
              localization={{
                rowsPerPage: 'Số dòng mỗi trang',
              }}
              renderEmptyRowsFallback={() => (
                <Alert severity="info" sx={{ m: 2 }}>
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
                </Alert>
              )}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

