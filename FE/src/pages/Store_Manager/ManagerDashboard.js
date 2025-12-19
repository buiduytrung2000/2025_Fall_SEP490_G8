// src/pages/Store_Manager/ManagerDashboard.js
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
  useMediaQuery,
  useTheme,
  Skeleton,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { 
  TrendingUp, 
  CalendarToday, 
  AttachMoney, 
  ShoppingCart, 
  Assessment, 
  Inventory2,
  AccessTime,
  Person
} from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getTodayKPIs, getRevenueLast7Days, getTopSellingProducts, getTodaySchedules, getEmployeeStats, getMonthlyRevenue, getMonthlyPurchaseCost } from '../../api/dashboardApi';
import { ToastNotification } from '../../components/common';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatCard = ({ label, value, icon, gradient, loading = false }) => (
  <Card 
    elevation={0}
    sx={{
      background: gradient,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 3,
      height: '100%',
      '&:hover': { 
        transform: 'translateY(-8px)', 
        boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
      },
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}
  >
    <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.95, 
              mb: 1.5,
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          ) : (
            <Typography 
              variant="h4" 
              fontWeight={700}
              sx={{ 
                fontSize: { xs: '1.75rem', sm: '2rem' },
                lineHeight: 1.2,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
        <Avatar 
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.25)', 
            width: { xs: 48, sm: 64 }, 
            height: { xs: 48, sm: 64 },
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {icon}
        </Avatar>
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
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyRevenue, setMonthlyRevenue] = useState(null);
  const [monthlyPurchaseCost, setMonthlyPurchaseCost] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Load all dashboard data in parallel
        const [kpisRes, revenueRes, productsRes, schedulesRes, empStatsRes] = await Promise.all([
          getTodayKPIs(),
          getRevenueLast7Days(),
          getTopSellingProducts(),
          getTodaySchedules(),
          getEmployeeStats()
        ]);

        if (kpisRes.err === 0) {
          setKpis(kpisRes.data);
        } else {
          console.error('KPIs error:', kpisRes);
          ToastNotification.error(kpisRes.msg || 'Không thể tải KPIs');
          // Set default values to show something
          setKpis({ todayRevenue: 0, todayOrders: 0, newCustomers: 0 });
        }

        if (revenueRes.err === 0) {
          setRevenueData(revenueRes.data || []);
        } else {
          console.error('Revenue error:', revenueRes);
          ToastNotification.error(revenueRes.msg || 'Không thể tải doanh thu');
          setRevenueData([]);
        }

        if (productsRes.err === 0) {
          setTopProducts(productsRes.data || []);
        } else {
          console.error('Products error:', productsRes);
          ToastNotification.error(productsRes.msg || 'Không thể tải sản phẩm');
          setTopProducts([]);
        }

        if (schedulesRes.err === 0) {
          setTodaySchedules(schedulesRes.data || []);
        } else {
          console.error('Schedules error:', schedulesRes);
          ToastNotification.error(schedulesRes.msg || 'Không thể tải lịch làm việc');
          setTodaySchedules([]);
        }

        if (empStatsRes.err === 0) {
          setEmployeeStats(empStatsRes.data);
        } else {
          console.error('Employee stats error:', empStatsRes);
        }
      } catch (error) {
        ToastNotification.error('Lỗi khi tải dữ liệu dashboard: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Load monthly statistics when year/month changes
  useEffect(() => {
    const loadMonthlyStats = async () => {
      setLoadingMonthly(true);
      try {
        const [revenueRes, costRes] = await Promise.all([
          getMonthlyRevenue(null, selectedYear, selectedMonth),
          getMonthlyPurchaseCost(null, selectedYear, selectedMonth)
        ]);

        if (revenueRes.err === 0) {
          setMonthlyRevenue(revenueRes.data);
        } else {
          console.error('Monthly revenue error:', revenueRes);
          setMonthlyRevenue({ revenue: 0, orders: 0 });
        }

        if (costRes.err === 0) {
          setMonthlyPurchaseCost(costRes.data);
        } else {
          console.error('Monthly purchase cost error:', costRes);
          setMonthlyPurchaseCost({ cost: 0, orders: 0 });
        }
      } catch (error) {
        console.error('Error loading monthly stats:', error);
      } finally {
        setLoadingMonthly(false);
      }
    };

    loadMonthlyStats();
  }, [selectedYear, selectedMonth]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const stats = [
    {
      label: "Doanh thu hôm nay",
      value: loading ? '...' : (kpis ? formatCurrency(kpis.todayRevenue || 0) : formatCurrency(0)),
      icon: <AttachMoney />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      label: "Số đơn hôm nay",
      value: loading ? '...' : (kpis?.todayOrders ?? 0),
      icon: <ShoppingCart />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      label: "Ca làm việc",
      value: loading ? '...' : (todaySchedules.length || 0),
      icon: <CalendarToday />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
  ];

  const revenueChartData = {
    labels: revenueData.length > 0 ? revenueData.map(r => r.name) : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: "Doanh thu (VND)",
        data: revenueData.length > 0 
          ? revenueData.map(r => r.DoanhThu || 0)
          : [0, 0, 0, 0, 0, 0, 0],
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
      tooltip: {
        callbacks: {
          label: function(context) {
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            // Format số lớn: nếu >= 1 triệu thì hiển thị triệu, ngược lại hiển thị nghìn
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          }
        },
      },
    },
  };

  return (
    <Box sx={{ 
      px: { xs: 2, sm: 3, md: 4 }, 
      py: { xs: 2, sm: 3 },
      minHeight: '100vh',
      bgcolor: '#f5f7fa'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        justifyContent: 'space-between', 
        mb: 4,
        gap: 2
      }}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
              color: '#1a202c',
              mb: 0.5
            }}
          >
            Tổng quan cửa hàng
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Thống kê và phân tích hoạt động kinh doanh
          </Typography>
        </Box>
      </Box>

      {/* STAT CARDS */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 3,
        mb: 4
      }}>
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} loading={loading} />
        ))}
      </Box>

      {/* MONTHLY STATISTICS */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          mb: 2,
          gap: 2
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: '#1a202c' }}>
            Thống kê theo tháng ({selectedMonth}/{selectedYear})
          </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Năm</InputLabel>
            <Select
              value={selectedYear}
              label="Năm"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <MenuItem key={year} value={year}>{year}</MenuItem>;
              })}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tháng</InputLabel>
            <Select
              value={selectedMonth}
              label="Tháng"
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                return <MenuItem key={month} value={month}>Tháng {month}</MenuItem>;
              })}
            </Select>
          </FormControl>
          </Box>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={6}>
            <Card 
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                height: '100%'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.95, mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                      Doanh thu tháng này
                    </Typography>
                    {loadingMonthly ? (
                      <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                    ) : (
                      <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', sm: '2rem' }, lineHeight: 1.2 }}>
                        {formatCurrency(monthlyRevenue?.revenue || 0)}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                      {monthlyRevenue?.orders || 0} đơn hàng
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 56, height: 56 }}>
                    <AttachMoney />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Card 
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                height: '100%'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.95, mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                      Chi phí nhập hàng tháng này
                    </Typography>
                    {loadingMonthly ? (
                      <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                    ) : (
                      <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', sm: '2rem' }, lineHeight: 1.2 }}>
                        {formatCurrency(monthlyPurchaseCost?.cost || 0)}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                      {monthlyPurchaseCost?.orders || 0} đơn nhập
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 56, height: 56 }}>
                    <ShoppingCart />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* CHARTS & TOP PRODUCTS SECTION - Equal width 50/50 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        mb: 4
      }}>
        <Card 
          elevation={0}
          sx={{ 
            height: '100%',
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                <TrendingUp />
              </Avatar>
              <Typography variant="h6" fontWeight={600} sx={{ color: '#1a202c' }}>
                Doanh thu 7 ngày qua
              </Typography>
            </Box>
            <Box sx={{ height: { xs: 280, sm: 320 }, width: '100%' }}>
              {loading ? (
                <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
              ) : (
                <Bar data={revenueChartData} options={revenueChartOptions} />
              )}
            </Box>
          </CardContent>
        </Card>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <Inventory2 />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ color: '#1a202c' }}>
                  Top sản phẩm bán chạy
                </Typography>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 320 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#495057', py: 1 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#495057', py: 1 }}>Sản phẩm</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#495057', py: 1 }}>Đã bán</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton width={20} height={20} /></TableCell>
                          <TableCell><Skeleton width="70%" height={20} /></TableCell>
                          <TableCell align="right"><Skeleton width={30} height={20} /></TableCell>
                        </TableRow>
                      ))
                    ) : topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Inventory2 sx={{ fontSize: 36, color: 'text.disabled', opacity: 0.5 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Chưa có dữ liệu
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProducts.map((row, i) => (
                        <TableRow 
                          key={row.id || i} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: '#f8f9fa' },
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <TableCell sx={{ py: 1 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: i < 3 ? 'primary.main' : 'grey.200',
                                color: i < 3 ? 'white' : 'text.primary',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            >
                              {i + 1}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, fontSize: '0.8125rem', py: 1 }}>{row.name}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8125rem', py: 1 }}>{row.sold || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
      </Box>

      {/* SCHEDULES SECTION */}
      <Box>
        <Card 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            height: '100%'
          }}
        >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <CalendarToday />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ color: '#1a202c' }}>
                  Ca làm việc hôm nay
                </Typography>
              </Box>
              <Box>
                {loading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                    ))}
                  </Box>
                ) : todaySchedules.length === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      Không có ca làm việc hôm nay
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {todaySchedules.map((schedule, i) => {
                      const startTime = schedule.start_time ? schedule.start_time.substring(0, 5) : '';
                      const endTime = schedule.end_time ? schedule.end_time.substring(0, 5) : '';
                      return (
                        <Paper
                          key={schedule.schedule_id || i}
                          elevation={0}
                          sx={{
                            p: 2,
                            bgcolor: '#f8f9fa',
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: '#e9ecef',
                              transform: 'translateX(4px)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <AccessTime sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography fontWeight={600} color="primary" sx={{ fontSize: '0.9375rem' }}>
                              {startTime} - {endTime}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              {schedule.employee_name}
                            </Typography>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
      </Box>
    </Box>
  );
};

export default ManagerDashboard;
