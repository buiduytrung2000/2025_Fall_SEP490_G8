// src/pages/Store_Manager/ManagerDashboard.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
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
  useMediaQuery,
  useTheme
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { TrendingUp, People, CalendarToday, AttachMoney, ShoppingCart, Assessment, Inventory2 } from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getManagerKpis, getRevenueLast7Days, getTopSellingProducts } from '../../api/mockApi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatCard = ({ label, value, icon, gradient }) => (
  <Card elevation={4} sx={{
    background: gradient,
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s ease' },
    transition: 'all 0.3s ease',
  }}>
    <CardContent sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>{label}</Typography>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const ManagerDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    getManagerKpis().then(setKpis);
    getRevenueLast7Days().then(setRevenueData);
    getTopSellingProducts().then(setTopProducts);
  }, []);

  const stats = [
    {
      label: "Doanh thu hôm nay",
      value: kpis ? `${(kpis.todayRevenue / 1000000).toFixed(1)}M ₫` : '...',
      icon: <AttachMoney />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      label: "Số đơn hôm nay",
      value: kpis?.todayOrders || '...',
      icon: <ShoppingCart />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      label: "Khách hàng mới",
      value: kpis?.newCustomers || '...',
      icon: <People />,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      label: "Ca làm việc",
      value: "6",
      icon: <CalendarToday />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
  ];

  const revenueChartData = {
    labels: revenueData.map(r => r.name),
    datasets: [
      {
        label: "Doanh thu (triệu VND)",
        data: revenueData.map(r => r.DoanhThu / 1000000),
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + 'M';
          }
        },
      },
    },
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        justifyContent: 'space-between', 
        mb: 3,
        gap: 2
      }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Tổng quan cửa hàng
        </Typography>
        <Chip icon={<Assessment />} label="Hôm nay" color="primary" size={isMobile ? 'small' : 'medium'} />
      </Box>

      {/* STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* CHARTS SECTION */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="primary" /> Doanh thu 7 ngày qua
              </Typography>
              <Box sx={{ height: { xs: 250, sm: 300 }, width: '100%' }}>
                <Bar data={revenueChartData} options={revenueChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Tổng quan</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Trung bình/ngày</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {kpis ? `${(kpis.todayRevenue / 1000000).toFixed(1)}M ₫` : '...'}
                  </Typography>
                </Box>
                <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Tổng đơn</Typography>
                  <Typography variant="h5" fontWeight={700}>{kpis?.todayOrders || '...'} đơn</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PRODUCTS & SHIFTS */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2 color="primary" /> Top sản phẩm bán chạy
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Sản phẩm</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Đã bán</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Doanh thu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts.map((row, i) => (
                      <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                        <TableCell align="right">{row.sold}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {row.revenue.toLocaleString('vi-VN')} ₫
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday color="primary" /> Ca làm việc hôm nay
              </Typography>
              <Box>
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography fontWeight={600} color="primary">06:00 - 14:00</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>• Nguyễn Văn An</Typography>
                </Box>
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography fontWeight={600} color="primary">14:00 - 22:00</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>• Trần Thị Bình</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagerDashboard;
