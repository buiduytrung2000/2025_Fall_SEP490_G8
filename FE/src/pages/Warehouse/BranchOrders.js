// src/pages/Warehouse/BranchOrders.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Stack
} from '@mui/material';
import { getStoreOrders } from '../../api/mockApi';
import { useNavigate } from 'react-router-dom';

const Kpi = ({ label, value }) => (
  <Card sx={{ boxShadow: 1 }}>
    <CardContent>
      <Typography color="text.secondary">{label}</Typography>
      <Typography variant="h6">{value}</Typography>
    </CardContent>
  </Card>
);

const BranchOrders = () => {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const [branch, setBranch] = useState('Tất cả');
  const [status, setStatus] = useState('Tất cả');
  const [date, setDate] = useState('');
  const [code, setCode] = useState('');

  const load = () => { getStoreOrders().then(data => setOrders(data.filter(o => o.type === 'ToWarehouse'))); };
  useEffect(() => { load(); }, []);

  const branches = useMemo(() => ['Tất cả', ...Array.from(new Set(orders.map(o => o.branch || 'CN1')))], [orders]);

  const filtered = useMemo(() => orders.filter(o => {
    if (branch !== 'Tất cả' && (o.branch || 'CN1') !== branch) return false;
    if (status !== 'Tất cả' && o.status !== status) return false;
    if (date && o.date !== date) return false;
    if (code && !o.id.toLowerCase().includes(code.toLowerCase())) return false;
    return true;
  }), [orders, branch, status, date, code]);

  const counts = useMemo(() => ({
    pending: filtered.filter(o => o.status === 'Pending').length,
    processing: filtered.filter(o => ['Approved','SentToSupplier','ForwardedToSupplier'].includes(o.status)).length,
    deliveredToday: filtered.filter(o => o.status === 'SupplierShipped' && o.date === new Date().toISOString().slice(0,10)).length,
    cancelled: filtered.filter(o => ['Rejected','Cancelled'].includes(o.status)).length,
  }), [filtered]);

  const handleUpdate = (order) => {
    navigate(`/warehouse/branch-orders/${order.id}`);
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Quản lý đơn hàng từ chi nhánh</Typography>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <TextField 
            select 
            label="Chi nhánh" 
            size="small" 
            value={branch} 
            onChange={(e) => setBranch(e.target.value)} 
            sx={{ width: { xs: '100%', sm: 220 } }}
          >
            {branches.map(b => (<MenuItem key={b} value={b}>{b}</MenuItem>))}
          </TextField>
          <TextField 
            select 
            label="Trạng thái" 
            size="small" 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            sx={{ width: { xs: '100%', sm: 220 } }}
          >
            {['Tất cả','Pending','Approved','SupplierShipped','Rejected'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
          </TextField>
          <TextField 
            label="Ngày đặt" 
            type="date" 
            size="small" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <TextField 
            placeholder="Mã đơn hàng" 
            size="small" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            sx={{ width: { xs: '100%', sm: 220 } }}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}><Kpi label="Chờ xác nhận" value={`${counts.pending} đơn hàng`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi label="Đang xử lý" value={`${counts.processing} đơn hàng`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi label="Đã giao hôm nay" value={`${counts.deliveredToday} đơn hàng`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi label="Đã hủy" value={`${counts.cancelled} đơn hàng`} /></Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Danh sách đơn hàng</Typography>
      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Mã đơn</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Chi nhánh</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Ngày đặt</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Sản phẩm</TableCell>
              <TableCell sx={{ minWidth: 120, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Tổng tiền</TableCell>
              <TableCell sx={{ minWidth: 100, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Trạng thái</TableCell>
              <TableCell sx={{ minWidth: 120, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id} hover>
                <TableCell>{o.id}</TableCell>
                <TableCell>{o.branch || 'CN1'}</TableCell>
                <TableCell>{o.date}</TableCell>
                <TableCell>{o.items}SP</TableCell>
                <TableCell>{Number(o.total).toLocaleString('vi-VN')}</TableCell>
                <TableCell><Chip size="small" label={o.status} color={o.status==='Rejected'?'error':(o.status==='Pending'?'warning':'success')} /></TableCell>
                <TableCell>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => handleUpdate(o)}
                      fullWidth={{ xs: true, sm: false }}
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                    >
                      Cập nhật
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không có dữ liệu</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BranchOrders;


