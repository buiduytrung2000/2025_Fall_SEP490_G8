// src/pages/Store_Manager/ShiftReports.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, TextField,
  Chip, Stack, CircularProgress, Alert,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { getShiftReport } from '../../api/shiftApi';
import { fetchEmployees } from '../../api/employeeApi';
import { useAuth } from '../../contexts/AuthContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const getDateString = (date) => date.toISOString().split('T')[0];

const getRangeForPeriod = (period) => {
  const now = new Date();
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: getDateString(start), end: getDateString(now) };
  }
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  return { start: getDateString(start), end: getDateString(now) };
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
  const [cashierId, setCashierId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [loadingCashiers, setLoadingCashiers] = useState(false);
  const [periodView, setPeriodView] = useState('week');
  const initialRange = getRangeForPeriod('week');
  const [from, setFrom] = useState(initialRange.start);
  const [to, setTo] = useState(initialRange.end);

  // Load danh sách thu ngân
  const loadCashiers = useCallback(async () => {
    if (!user?.store_id) return;
    setLoadingCashiers(true);
    try {
      const resp = await fetchEmployees({
        store_id: user.store_id,
        role: 'Cashier',
        status: 'active',
        limit: 100 // Lấy tất cả thu ngân
      });
      if (resp && resp.err === 0 && resp.data) {
        setCashiers(resp.data || []);
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách thu ngân:', e);
    } finally {
      setLoadingCashiers(false);
    }
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storeId = user?.store_id || null;
      const resp = await getShiftReport({ 
        store_id: storeId,
        cashier_id: cashierId || null,
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
  }, [from, to, cashierId, user]);

  useEffect(() => { 
    loadCashiers();
  }, [loadCashiers]);

  useEffect(() => { 
    load(); 
  }, [load]);

  useEffect(() => {
    const range = getRangeForPeriod(periodView);
    setFrom(range.start);
    setTo(range.end);
  }, [periodView]);

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

  // Định nghĩa cột cho bảng shift reports
  const getDiscrepancy = useCallback((shift) => {
    const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0);
    const actualCash = parseFloat(shift.closing_cash || 0);
    return actualCash - expectedCash;
  }, []);

  const totalNegativeDiscrepancy = useMemo(() => {
    return shifts.reduce((sum, shift) => {
      const diff = getDiscrepancy(shift);
      return diff < 0 ? sum + diff : sum;
    }, 0);
  }, [getDiscrepancy, shifts]);

  const columns = useMemo(() => [
    {
      accessorKey: 'index',
      header: 'STT',
      size: 60,
      Cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'shift_id',
      header: 'Mã ca',
      size: 100,
      Cell: ({ cell }) => `#${cell.getValue()}`,
    },
    {
      accessorKey: 'opened_at',
      header: 'Ngày giờ',
      size: 150,
      Cell: ({ cell }) => formatDate(cell.getValue()),
    },
    {
      accessorKey: 'cashier.username',
      header: 'Thu ngân',
      size: 120,
      Cell: ({ row }) => row.original.cashier?.username || '—',
    },
    {
      accessorKey: 'transaction_count',
      header: 'Số GD',
      size: 100,
      Cell: ({ cell }) => cell.getValue() || 0,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'cash_sales_total',
      header: 'Tiền mặt',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'bank_transfer_total',
      header: 'Chuyển khoản',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'total_sales',
      header: 'Tổng doanh thu',
      size: 140,
      Cell: ({ cell }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatCurrency(cell.getValue() || 0)}
        </Typography>
      ),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'opening_cash',
      header: 'Tiền đầu ca',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'closing_cash',
      header: 'Tiền cuối ca',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'discrepancy',
      header: 'Chênh lệch',
      size: 130,
      Cell: ({ row }) => {
        const discrepancy = getDiscrepancy(row.original);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: discrepancy === 0 ? 'success.main' : discrepancy > 0 ? 'info.main' : 'error.main'
            }}
          >
            {formatCurrency(discrepancy)}
          </Typography>
        );
      },
    },
  ], [getDiscrepancy]);

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
          <Tabs
            value={periodView}
            onChange={(_, value) => setPeriodView(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 40 }}
          >
            <Tab label="Theo tuần" value="week" />
            <Tab label="Theo tháng" value="month" />
          </Tabs>
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
          <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 } }}>
            <InputLabel id="cashier-select-label">Thu ngân</InputLabel>
            <Select
              labelId="cashier-select-label"
              id="cashier-select"
              value={cashierId}
              label="Thu ngân"
              onChange={(e) => setCashierId(e.target.value)}
              disabled={loadingCashiers}
            >
              <MenuItem value="">
                <em>Tất cả thu ngân</em>
              </MenuItem>
              {cashiers.map((cashier) => (
                <MenuItem key={cashier.user_id} value={cashier.user_id}>
                  {cashier.username} {cashier.name ? `(${cashier.name})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

      <MaterialReactTable
        columns={columns}
        data={shifts}
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={true}
        enableTopToolbar={false}
        enableBottomToolbar={true}
        enablePagination={true}
        muiTableContainerProps={{
          sx: { maxHeight: { xs: '70vh', md: 'none' } }
        }}
        muiTablePaperProps={{
          elevation: 0,
          sx: { boxShadow: 'none' }
        }}
        muiTableHeadCellProps={{
          sx: {
            fontWeight: 700,
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
        localization={{
          noRecordsToDisplay: 'Không có dữ liệu'
        }}
        initialState={{
          pagination: { pageSize: 10, pageIndex: 0 },
        }}
      />

      {shifts.length > 0 && (
        <Box mt={2} textAlign="right">
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color={totalNegativeDiscrepancy < 0 ? 'error.main' : 'text.primary'}
          >
            Tổng tiền âm khấu trừ: {formatCurrency(totalNegativeDiscrepancy)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            (Khoản âm sẽ khấu trừ vào lương thu ngân liên quan)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ShiftReports;
