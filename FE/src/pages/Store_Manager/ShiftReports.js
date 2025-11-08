// src/pages/Store_Manager/ShiftReports.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, TextField,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Button
} from '@mui/material';
import { getShiftKpis, getShiftSummaries } from '../../api/mockApi';

const KpiCard = ({ title, value, color }) => (
  <Card sx={{ boxShadow: 2 }}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>{title}</Typography>
      <Typography variant="h5" color={color || 'inherit'}>{value}</Typography>
    </CardContent>
  </Card>
);

const ShiftReports = () => {
  const [kpis, setKpis] = useState(null);
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState('2025-11-03');
  const [to, setTo] = useState('2025-11-04');

  const load = useCallback(() => {
    getShiftKpis().then(setKpis);
    getShiftSummaries(from, to).then(setRows);
  }, [from, to]);

  useEffect(() => { 
    load(); 
  }, [load]);

  const totalRevenue = useMemo(() => rows.reduce((s, r) => s + r.revenue, 0), [rows]);
  const totalOrders = useMemo(() => rows.reduce((s, r) => s + r.orders, 0), [rows]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Báo cáo & Tổng kết ca</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Theo dõi hiệu quả theo từng ca làm việc</Typography>

      {kpis && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}><KpiCard title="Doanh thu hôm nay" value={kpis.revenueToday.toLocaleString('vi-VN')} color="success.main" /></Grid>
          <Grid item xs={12} md={3}><KpiCard title="Số đơn hôm nay" value={kpis.ordersToday} /></Grid>
          <Grid item xs={12} md={3}><KpiCard title="Giá trị đơn TB" value={kpis.avgOrderValue.toLocaleString('vi-VN')} /></Grid>
          <Grid item xs={12} md={3}><KpiCard title="Tỉ lệ hoàn" value={`${kpis.refundRate}%`} color="warning.main" /></Grid>
        </Grid>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <TextField 
            label="Từ ngày" 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)} 
            size="small" 
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <TextField 
            label="Đến ngày" 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)} 
            size="small" 
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <Button 
            variant="contained" 
            onClick={load}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Lọc
          </Button>
          <Box flexGrow={1} sx={{ display: { xs: 'none', md: 'block' } }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Tổng doanh thu: {totalRevenue.toLocaleString('vi-VN')} đ
            </Typography>
            <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Tổng đơn: {totalOrders}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Mã ca</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Ngày</TableCell>
              <TableCell sx={{ minWidth: 80, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Ca</TableCell>
              <TableCell sx={{ minWidth: 120, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Thu ngân</TableCell>
              <TableCell sx={{ minWidth: 80, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Số đơn</TableCell>
              <TableCell sx={{ minWidth: 120, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Doanh thu</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Hoàn tiền</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Chênh lệch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} hover>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell><Chip size="small" label={r.shift} /></TableCell>
                <TableCell>{r.cashier}</TableCell>
                <TableCell>{r.orders}</TableCell>
                <TableCell>{r.revenue.toLocaleString('vi-VN')}</TableCell>
                <TableCell>{r.refunds}</TableCell>
                <TableCell>{r.missing}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ShiftReports;





