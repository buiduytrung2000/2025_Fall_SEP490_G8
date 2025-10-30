// src/pages/Manager/ManagerDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { getRevenueLast7Days, getTopSellingProducts, getManagerKpis } from '../../api/mockApi';

// Import Thư viện Biểu đồ
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Import MUI và Icons
import { Grid, Paper, Typography, Box, CircularProgress, Avatar } from '@mui/material';
import { MonetizationOn, ShoppingCart, PeopleAlt } from '@mui/icons-material';
import { MaterialReactTable } from 'material-react-table';

// Hàm helper format tiền (giữ nguyên)
const formatCurrency = (number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

// Component Card KPI (giữ nguyên)
const KpiCard = ({ title, value, icon, color }) => (
    <Paper 
        sx={{ 
            p: 2.5, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e0e0e0' 
        }}
    >
        <Avatar sx={{ bgcolor: `${color}.light`, width: 56, height: 56 }}>
            {React.cloneElement(icon, { sx: { color: `${color}.dark` } })}
        </Avatar>
        <Box>
            <Typography variant="h6" color="text.secondary" fontWeight="500">
                {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
                {value}
            </Typography>
        </Box>
    </Paper>
);

const ManagerDashboard = () => {
    const [kpis, setKpis] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getManagerKpis(),
            getRevenueLast7Days(),
            getTopSellingProducts()
        ]).then(([kpiData, revenue, products]) => {
            setKpis(kpiData);
            setRevenueData(revenue);
            setTopProducts(products);
            setLoading(false);
        }).catch(console.error);
    }, []);

    // Cột cho Bảng Top Sản Phẩm (giữ nguyên)
    const columns = useMemo(() => [
        { accessorKey: 'name', header: 'Tên Sản Phẩm' },
        { accessorKey: 'sold', header: 'Đã bán', size: 100 },
        { 
            accessorKey: 'revenue', 
            header: 'Doanh Thu',
            Cell: ({ cell }) => formatCurrency(cell.getValue()),
        },
    ], []);

    // Style chung cho các Paper chứa biểu đồ/bảng
    const paperStyle = {
        p: 2.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid #e0e0e0',
        borderRadius: 3,
        height: '480px' // <-- Tăng chiều cao lên 480px (trước là 420px)
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
                Tổng quan Cửa hàng
            </Typography>

            {/* Hàng 1: 3 Thẻ KPI */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <KpiCard 
                        title="Doanh thu hôm nay" 
                        value={formatCurrency(kpis.todayRevenue)}
                        icon={<MonetizationOn />}
                        color="success" 
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KpiCard 
                        title="Số đơn hàng" 
                        value={kpis.todayOrders.toString()}
                        icon={<ShoppingCart />}
                        color="primary" 
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KpiCard 
                        title="Khách hàng mới" 
                        value={kpis.newCustomers.toString()}
                        icon={<PeopleAlt />}
                        color="warning" 
                    />
                </Grid>
            </Grid>

            {/* Hàng 2: Biểu đồ và Bảng */}
            <Grid container spacing={3}>
                {/* Biểu đồ Doanh thu */}
                <Grid item xs={12} lg={8}> {/* <-- ĐÃ SỬA: Tăng độ rộng lên 8/12 */}
                    <Paper sx={paperStyle}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                            Doanh thu 7 ngày qua
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                {/* SỬA LỖI TRỤC X: Đặt interval = 0 để hiển thị tất cả nhãn */}
                                <XAxis dataKey="name" interval={0} /> 
                                <YAxis 
                                    tickFormatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                                    width={80} 
                                />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="DoanhThu" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Bảng Top Sản phẩm */}
                <Grid item xs={12} lg={4}> {/* <-- ĐÃ SỬA: Giảm độ rộng xuống 4/12 */}
                    <Paper sx={paperStyle}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                            Sản phẩm bán chạy
                        </Typography> {/* <-- ĐÃ SỬA: Đổi tiêu đề */}
                        <MaterialReactTable
                            columns={columns}
                            data={topProducts}
                            enableToolbarInternalActions={false}
                            enablePagination={false}
                            enableSorting={false}
                            // Điều chỉnh chiều cao cho phù hợp với 480px của paperStyle
                            muiTableContainerProps={{ sx: { height: 'calc(480px - 70px)' } }} 
                        />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ManagerDashboard;