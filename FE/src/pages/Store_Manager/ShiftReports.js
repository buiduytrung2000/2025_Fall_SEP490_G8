// src/pages/Store_Manager/ShiftReports.js
import React, { useEffect, useMemo, useState } from 'react';
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

  const load = () => {
    getShiftKpis().then(setKpis);
    getShiftSummaries(from, to).then(setRows);
  };
  useEffect(() => { load(); }, []);

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

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={load}>Lọc</Button>
          <Box flexGrow={1} />
          <Typography fontWeight={600}>Tổng doanh thu: {totalRevenue.toLocaleString('vi-VN')} đ</Typography>
          <Typography fontWeight={600}>Tổng đơn: {totalOrders}</Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã ca</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Ca</TableCell>
              <TableCell>Thu ngân</TableCell>
              <TableCell>Số đơn</TableCell>
              <TableCell>Doanh thu</TableCell>
              <TableCell>Hoàn tiền</TableCell>
              <TableCell>Chênh lệch</TableCell>
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





