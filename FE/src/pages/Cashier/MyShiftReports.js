// src/pages/Cashier/MyShiftReports.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, TextField,
  Chip, Stack, CircularProgress, Alert, Tabs, Tab
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { getShiftReport } from '../../api/shiftApi';
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

const MyShiftReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periodView, setPeriodView] = useState('week');
  const initialRange = getRangeForPeriod('week');
  const [from, setFrom] = useState(initialRange.start);
  const [to, setTo] = useState(initialRange.end);
  const isChangingPeriodRef = useRef(false);

  const load = useCallback(async (dateFrom, dateTo, showLoading = false) => {
    if (!user?.user_id) return;
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const storeId = user?.store_id || null;
      const resp = await getShiftReport({ 
        store_id: storeId,
        cashier_id: user.user_id, // Chỉ lấy ca của chính nhân viên này
        date_from: dateFrom || from,
        date_to: dateTo || to
      });
      
      if (resp && resp.err === 0 && resp.data) {
        setShifts(resp.data.shifts || []);
        setSummary(resp.data.summary || null);
      } else {
        setError(resp?.msg || 'Không thể tải dữ liệu');
        // Không clear dữ liệu để tránh nháy
      }
    } catch (e) {
      setError('Lỗi khi tải dữ liệu: ' + e.message);
      // Không clear dữ liệu để tránh nháy
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      isChangingPeriodRef.current = false;
    }
  }, [from, to, user]);

  useEffect(() => { 
    // Chỉ load nếu không đang trong quá trình chuyển period
    // Không hiển thị loading khi thay đổi date filter
    if (!isChangingPeriodRef.current) {
      load(undefined, undefined, false); 
    }
  }, [load]);

  useEffect(() => {
    isChangingPeriodRef.current = true;
    const range = getRangeForPeriod(periodView);
    const newFrom = range.start;
    const newTo = range.end;
    setFrom(newFrom);
    setTo(newTo);
    // Load trực tiếp với dates mới, không hiển thị loading và giữ dữ liệu cũ để tránh nháy
    if (user?.user_id) {
      const storeId = user?.store_id || null;
      // Không set loading = true và không clear dữ liệu cũ để tránh nháy nháy
      setError(null);
      getShiftReport({ 
        store_id: storeId,
        cashier_id: user.user_id,
        date_from: newFrom,
        date_to: newTo
      }).then(resp => {
        if (resp && resp.err === 0 && resp.data) {
          // Chỉ update khi có dữ liệu mới
          setShifts(resp.data.shifts || []);
          setSummary(resp.data.summary || null);
        } else {
          // Chỉ set error, không clear dữ liệu để tránh nháy
          setError(resp?.msg || 'Không thể tải dữ liệu');
        }
        isChangingPeriodRef.current = false;
      }).catch(e => {
        // Chỉ set error, không clear dữ liệu để tránh nháy
        setError('Lỗi khi tải dữ liệu: ' + e.message);
        isChangingPeriodRef.current = false;
      });
    }
  }, [periodView, user]);

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
      enableColumnFilter: false,
    },
  ], [getDiscrepancy]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Tổng kết ca làm việc</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Xem tổng kết các ca làm việc của bạn</Typography>

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


      {summary && !loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 2, minWidth: '500px' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Tổng doanh thu
                </Typography>
                <Typography variant="h6" fontWeight={600} color="success.main">
                  {formatCurrency(summary.total_sales)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tiền mặt: {formatCurrency(summary.total_cash_sales)} • 
                  Chuyển khoản: {formatCurrency(summary.total_bank_transfer)}
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
            (Khoản âm sẽ được khấu trừ vào lương)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MyShiftReports;

