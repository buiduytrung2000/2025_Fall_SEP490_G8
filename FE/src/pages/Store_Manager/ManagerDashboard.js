// src/pages/Store_Manager/ManagerDashboard.js
import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  LinearProgress,
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { TrendingUp, People, Inventory2, CalendarToday } from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const stats = [
  { label: "Doanh thu hôm nay", value: "12.500.000₫", icon: <TrendingUp />, color: "primary.main" },
  { label: "Số nhân viên", value: 18, icon: <People />, color: "success.main" },
  { label: "Sản phẩm hiện có", value: 158, icon: <Inventory2 />, color: "warning.main" },
  { label: "Ca làm việc hôm nay", value: 6, icon: <CalendarToday />, color: "secondary.main" },
];

// Dummy chart data
const revenueChartData = {
  labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  datasets: [
    {
      label: "Doanh thu (triệu VND)",
      data: [12, 14, 9, 13, 17, 11, 15],
      backgroundColor: "#1976d2",
    },
  ],
};

const revenueChartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: { y: { beginAtZero: true } },
  height: 120,
};

const topProducts = [
  { name: "Cà phê Latte", sold: 120, revenue: "6.000.000₫" },
  { name: "Bánh Mì Trứng", sold: 95, revenue: "2.850.000₫" },
  { name: "Sữa tươi", sold: 80, revenue: "1.600.000₫" },
  { name: "Trà đào", sold: 71, revenue: "2.130.000₫" },
];

const todayShifts = [
  { time: "06:00-14:00", staff: ["Nguyễn Văn A", "Trần Thị B"] },
  { time: "14:00-22:00", staff: ["Phạm Văn C", "Lê Thị D"] },
  { time: "22:00-06:00", staff: ["Đặng Văn E"] },
];

const ManagerDashboard = () => {
  const theme = useTheme();

  return (
    <Box p={{ xs: 1, sm: 3 }}>
      {/* TITLE */}
      <Typography variant="h4" fontWeight={700} mb={3}>Tổng quan cửa hàng</Typography>

      {/* STAT CARDS */}
      <Grid container spacing={3} mb={3}>
        {stats.map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>{stat.icon}</Avatar>
              <Box>
                <Typography variant="h6">{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* REVENUE CHART */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>Doanh thu tuần này</Typography>
          {/* BIỂU ĐỒ DOANH THU - CÓ THỂ THAY ĐỔI BẰNG CHART KHÁC */}
          <Bar data={revenueChartData} options={revenueChartOptions} height={120}/>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* TOP PRODUCTS */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={1}>Top sản phẩm bán chạy</Typography>
              {/* BẢNG SẢN PHẨM */}
              <TableContainer component={Paper} sx={{ boxShadow: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Sản phẩm</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Lượt bán</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Doanh thu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts.map((row, i) => (
                      <TableRow key={row.name}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.sold}</TableCell>
                        <TableCell>{row.revenue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        {/* TODAY'S SHIFTS (SCHEDULING) */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={1}>Phân ca hôm nay</Typography>
              {/* BẢNG PHÂN CA */}
              {todayShifts.map((shift, idx) => (
                <Box key={shift.time} mb={idx === todayShifts.length - 1 ? 0 : 2}>
                  <Typography fontWeight={500}>{shift.time}</Typography>
                  <Box pl={2}>
                    {shift.staff.map(staff => (
                      <Typography variant="body2" key={staff}>
                        • {staff}
                      </Typography>
                    ))}
                  </Box>
                  {idx < todayShifts.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Chú thích code:
        - Phần STAT CARDS: các chỉ số tổng quan (dummy data).
        - Phần REVENUE CHART: biểu đồ trụ doanh thu 7 ngày.
        - Phần TOP PRODUCTS: bảng sản phẩm bán chạy.
        - Phần TODAY'S SHIFTS: bảng phân ca làm việc hôm nay.
        Các data là mẫu, dev tự fetch sau.
      */}
    </Box>
  );
};

export default ManagerDashboard;
