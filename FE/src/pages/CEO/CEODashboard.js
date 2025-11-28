import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Skeleton,
  Alert,
  LinearProgress,
  TextField,
  MenuItem,
} from "@mui/material";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  Store,
  Warning,
} from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  getCompanyKPIs,
  getCompanyRevenueLast30Days,
  getCompanyTopProducts,
  getCompanyRevenueMix,
  getStorePerformance,
  getCompanyLowStock,
} from "../../api/dashboardApi";
import { toast } from "react-toastify";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({
  label,
  value,
  icon,
  gradient,
  loading = false,
  subtitle,
}) => (
  <Card
    elevation={0}
    sx={{
      background: gradient,
      color: "white",
      position: "relative",
      overflow: "hidden",
      borderRadius: 3,
      height: "100%",
      "&:hover": {
        transform: "translateY(-8px)",
        boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}
  >
    <CardContent sx={{ position: "relative", zIndex: 1, p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.95,
              mb: 1.5,
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton
              variant="text"
              width={120}
              height={40}
              sx={{ bgcolor: "rgba(255,255,255,0.3)" }}
            />
          ) : (
            <>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: "1.75rem", sm: "2rem" },
                  lineHeight: 1.2,
                  textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.9, mt: 0.5, display: "block" }}
                >
                  {subtitle}
                </Typography>
              )}
            </>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: "rgba(255,255,255,0.25)",
            width: { xs: 48, sm: 64 },
            height: { xs: 48, sm: 64 },
          }}
        >
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

export default function CEODashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [storePerformance, setStorePerformance] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [revenueMix, setRevenueMix] = useState([]);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = Array.from({ length: 5 }, (_, idx) => currentYear - idx);

  const loadDashboardData = async (year = selectedYear) => {
    setLoading(true);
    try {
      const [
        kpisRes,
        revenueRes,
        revenueMixRes,
        productsRes,
        storesRes,
        lowStockRes,
      ] = await Promise.all([
        getCompanyKPIs(),
        getCompanyRevenueLast30Days(year),
        getCompanyRevenueMix(),
        getCompanyTopProducts(10),
        getStorePerformance(),
        getCompanyLowStock(10),
      ]);

      if (kpisRes.err === 0) setKpis(kpisRes.data);
      if (revenueRes.err === 0) setRevenueData(revenueRes.data);
      if (revenueMixRes.err === 0) setRevenueMix(revenueMixRes.data);
      if (productsRes.err === 0) setTopProducts(productsRes.data);
      if (storesRes.err === 0) setStorePerformance(storesRes.data);
      if (lowStockRes.err === 0) setLowStock(lowStockRes.data);
    } catch (error) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(selectedYear);
  }, [selectedYear]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  const revenueChartData = revenueData
    ? {
        labels: revenueData.map((d) => d.label || d.name),
        datasets: [
          {
            label: "Doanh thu (VNĐ)",
            data: revenueData.map((d) => d.DoanhThu),
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.4,
          },
        ],
      }
    : null;

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Doanh thu theo tháng",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return formatCurrency(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Đơn vị: k",
        },
        ticks: {
          callback: function (value) {
            const scaled = value / 1000;
            return `${scaled.toLocaleString("vi-VN")}k`;
          },
        },
      },
    },
  };

  const colorPalette = [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ab",
  ];

  const revenueMixChartData =
    revenueMix && revenueMix.length
      ? {
          labels: revenueMix.map((item) => item.name || "Khác"),
          datasets: [
            {
              label: "Doanh thu",
              data: revenueMix.map((item) => item.revenue),
              backgroundColor: revenueMix.map(
                (_, idx) => colorPalette[idx % colorPalette.length]
              ),
              borderWidth: 1,
            },
          ],
        }
      : null;

  const revenueMixChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "right",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total =
              context.dataset.data?.reduce?.(
                (sum, val) => sum + Number(val || 0),
                0
              ) || 0;
            const value = context.parsed;
            const percent = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percent}%)`;
          },
        },
      },
    },
  };

  const topStores = storePerformance.slice(0, 5);
  const topStoreChartData =
    topStores && topStores.length
      ? {
          labels: topStores.map((store) => store.name),
          datasets: [
            {
              label: "Doanh thu (VNĐ)",
              data: topStores.map((store) => store.revenue),
              backgroundColor: topStores.map(
                (_, idx) => colorPalette[idx % colorPalette.length]
              ),
              borderRadius: 8,
              barThickness: 24,
            },
          ],
        }
      : null;

  const topStoreChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return formatCurrency(context.parsed.x);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value) => {
            const scaled = Number(value) / 1000;
            return `${scaled.toLocaleString("vi-VN")}k`;
          },
        },
      },
      y: {
        ticks: {
          autoSkip: false,
          font: { weight: 600 },
        },
      },
    },
  };

  if (loading && !kpis) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Box mt={3}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" height={60} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Bảng điều khiển CEO
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Doanh thu hôm nay"
            value={kpis ? formatCurrency(kpis.today.revenue) : "0 ₫"}
            icon={<AttachMoney />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            loading={loading}
            subtitle={`${kpis?.today.orders || 0} đơn hàng`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Doanh thu tháng này"
            value={kpis ? formatCurrency(kpis.thisMonth.revenue) : "0 ₫"}
            icon={<TrendingUp />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            loading={loading}
            subtitle={`${kpis?.thisMonth.orders || 0} đơn hàng`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Tổng doanh thu"
            value={kpis ? formatCurrency(kpis.allTime.revenue) : "0 ₫"}
            icon={<ShoppingCart />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            loading={loading}
            subtitle={`${kpis?.allTime.orders || 0} đơn hàng`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Tổng số cửa hàng"
            value={kpis ? formatNumber(kpis.stores.total) : "0"}
            icon={<Store />}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            loading={loading}
            subtitle="Đang hoạt động"
          />
        </Grid>
      </Grid>

      {/* Revenue Trend & Mix */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8} lg={8}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="h6">Doanh thu theo tháng</Typography>
                <TextField
                  select
                  size="small"
                  label="Năm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{ minWidth: 140 }}
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              {revenueChartData ? (
                <Box sx={{ height: { xs: 320, md: 420 }, width: "100%" }}>
                  <Line data={revenueChartData} options={revenueChartOptions} />
                </Box>
              ) : (
                <Skeleton variant="rectangular" height={360} />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4} lg={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Cơ cấu doanh thu (30 ngày)
              </Typography>
              {revenueMixChartData && revenueMix.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 3,
                    alignItems: "center",
                    minHeight: 280,
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 240 }}>
                    <Doughnut
                      data={revenueMixChartData}
                      options={revenueMixChartOptions}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {revenueMix.map((item, idx) => (
                      <Box
                        key={`${item.name}-${idx}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1.5,
                          pb: 1.5,
                          borderBottom:
                            idx === revenueMix.length - 1
                              ? "none"
                              : "1px dashed #eee",
                        }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography>{formatCurrency(item.revenue)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : loading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : (
                <Alert severity="info">
                  Chưa có dữ liệu giao dịch cho 30 ngày gần nhất.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Stores */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={12}>
          <Card sx={{ width: "600px" }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Top cửa hàng bán chạy
              </Typography>
              {topStoreChartData && topStores.length > 0 ? (
                <Box sx={{ height: 320 }}>
                  <Bar
                    data={topStoreChartData}
                    options={topStoreChartOptions}
                  />
                </Box>
              ) : loading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : (
                <Alert severity="info">
                  Chưa có dữ liệu doanh thu cửa hàng trong 30 ngày.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Store Performance & Top Products */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ width: "100%", height: "300px" }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Hiệu suất cửa hàng (30 ngày)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cửa hàng</TableCell>
                      <TableCell align="right">Đơn hàng</TableCell>
                      <TableCell align="right">Doanh thu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton variant="text" />
                        </TableCell>
                      </TableRow>
                    ) : storePerformance.length > 0 ? (
                      storePerformance.map((store) => (
                        <TableRow key={store.store_id}>
                          <TableCell>{store.name}</TableCell>
                          <TableCell align="right">
                            {formatNumber(store.orders)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(store.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Chưa có dữ liệu
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ width: "100%", height: "300px" }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Sản phẩm bán chạy (30 ngày)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell align="right">Đã bán</TableCell>
                      <TableCell align="right">Doanh thu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton variant="text" />
                        </TableCell>
                      </TableRow>
                    ) : topProducts.length > 0 ? (
                      topProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell align="right">
                            {formatNumber(product.sold)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Chưa có dữ liệu
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              mb={2}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Warning color="warning" /> Cảnh báo tồn kho thấp
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">Tồn kho</TableCell>
                    <TableCell align="right">Mức tối thiểu</TableCell>
                    <TableCell>Vị trí</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatNumber(item.stock)}
                          size="small"
                          color="error"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(item.min_stock_level)}
                      </TableCell>
                      <TableCell>{item.location_detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
