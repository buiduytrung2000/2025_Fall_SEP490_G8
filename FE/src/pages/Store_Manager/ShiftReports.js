// src/pages/Store_Manager/ShiftReports.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, TextField,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Chip, Stack, Button, CircularProgress, Alert
} from '@mui/material';
import { getShiftReport } from '../../api/shiftApi';
import { useAuth } from '../../contexts/AuthContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const KpiCard = ({ title, value, color }) => (
  <Card sx={{ boxShadow: 2 }}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom variant="body2">{title}</Typography>
      <Typography variant="h5" color={color || 'inherit'} fontWeight={600}>{value}</Typography>
    </CardContent>
  </Card>
);

const ShiftReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 ngày trước
    return date.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storeId = user?.store_id || null;
      const resp = await getShiftReport({ 
        store_id: storeId,
        date_from: from,
        date_to: to
      });
      
      if (resp && resp.err === 0 && resp.data) {
        setShifts(resp.data.shifts || []);
        setSummary(resp.data.summary || null);
      } else {
        setError(resp?.msg || 'Không thể tải dữ liệu');
        setShifts([]);
        setSummary(null);
      }
    } catch (e) {
      setError('Lỗi khi tải dữ liệu: ' + e.message);
      setShifts([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, user]);

  useEffect(() => { 
    load(); 
  }, [load]);

  // Tính toán KPIs từ summary
  const kpis = useMemo(() => {
    if (!summary) return null;
    const avgOrderValue = summary.total_transactions > 0 
      ? summary.total_sales / summary.total_transactions 
      : 0;
    return {
      totalSales: summary.total_sales,
      totalTransactions: summary.total_transactions,
      avgOrderValue: avgOrderValue,
      totalShifts: summary.total_shifts
    };
  }, [summary]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Báo cáo & Tổng kết ca</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Theo dõi hiệu quả theo từng ca làm việc</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {kpis && !loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard 
              title="Tổng doanh thu" 
              value={formatCurrency(kpis.totalSales)} 
              color="success.main" 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard 
              title="Tổng số giao dịch" 
              value={kpis.totalTransactions} 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard 
              title="Giá trị đơn TB" 
              value={formatCurrency(kpis.avgOrderValue)} 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard 
              title="Tổng số ca" 
              value={kpis.totalShifts} 
            />
          </Grid>
        </Grid>
      )}

      {summary && !loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Tổng tiền mặt
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(summary.total_cash_sales)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tiền đầu ca: {formatCurrency(summary.total_opening_cash)} • 
                  Tiền cuối ca: {formatCurrency(summary.total_closing_cash)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Tổng chuyển khoản
                </Typography>
                <Typography variant="h6" fontWeight={600} color="info.main">
                  {formatCurrency(summary.total_bank_transfer)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tổng doanh thu: {formatCurrency(summary.total_sales)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
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
            disabled={loading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {loading ? <CircularProgress size={20} /> : 'Lọc'}
          </Button>
          <Box flexGrow={1} sx={{ display: { xs: 'none', md: 'block' } }} />
          {summary && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Tổng doanh thu: {formatCurrency(summary.total_sales)}
              </Typography>
              <Typography fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Tổng giao dịch: {summary.total_transactions}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Mã ca</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Ngày giờ</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Thu ngân</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Số GD</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Tiền mặt</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Chuyển khoản</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Tổng doanh thu</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Tiền đầu ca</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Tiền cuối ca</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Chênh lệch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map(shift => {
              const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0);
              const actualCash = parseFloat(shift.closing_cash || 0);
              const discrepancy = actualCash - expectedCash;
              
              return (
                <TableRow key={shift.shift_id} hover>
                  <TableCell>#{shift.shift_id}</TableCell>
                  <TableCell>{formatDate(shift.opened_at)}</TableCell>
                  <TableCell>{shift.cashier?.username || '—'}</TableCell>
                  <TableCell align="right">{shift.transaction_count || 0}</TableCell>
                  <TableCell align="right">{formatCurrency(shift.cash_sales_total || 0)}</TableCell>
                  <TableCell align="right">{formatCurrency(shift.bank_transfer_total || 0)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(shift.total_sales || 0)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(shift.opening_cash || 0)}</TableCell>
                  <TableCell align="right">{formatCurrency(shift.closing_cash || 0)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: discrepancy === 0 ? 'success.main' : discrepancy > 0 ? 'info.main' : 'error.main'
                      }}
                    >
                      {formatCurrency(discrepancy)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !shifts.length && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
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
