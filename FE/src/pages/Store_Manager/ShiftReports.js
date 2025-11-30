// src/pages/Store_Manager/ShiftReports.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, TextField,
  Chip, Stack, Alert,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
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

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
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
        // Không clear dữ liệu để tránh nháy
      }
    } catch (e) {
      setError('Lỗi khi tải dữ liệu: ' + e.message);
      // Không clear dữ liệu để tránh nháy
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [from, to, cashierId, user]);

  useEffect(() => { 
    loadCashiers();
  }, [loadCashiers]);

  useEffect(() => { 
    // Không hiển thị loading khi filter thay đổi
    load(false); 
  }, [load]);

  useEffect(() => {
    const range = getRangeForPeriod(periodView);
    const newFrom = range.start;
    const newTo = range.end;
    setFrom(newFrom);
    setTo(newTo);
    // Load trực tiếp với dates mới, không hiển thị loading và giữ dữ liệu cũ để tránh nháy
    if (user?.store_id) {
      const storeId = user?.store_id || null;
      setError(null);
      getShiftReport({ 
        store_id: storeId,
        cashier_id: cashierId || null,
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
      }).catch(e => {
        // Chỉ set error, không clear dữ liệu để tránh nháy
        setError('Lỗi khi tải dữ liệu: ' + e.message);
      });
    }
  }, [periodView, cashierId, user]);

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
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'shift_id',
      header: 'Mã ca',
      size: 100,
      Cell: ({ cell }) => `#${cell.getValue()}`,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'opened_at',
      header: 'Ngày giờ',
      size: 150,
      Cell: ({ cell }) => formatDate(cell.getValue()),
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'cashier.username',
      header: 'Thu ngân',
      size: 120,
      Cell: ({ row }) => row.original.cashier?.username || '—',
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'transaction_count',
      header: 'Số GD',
      size: 100,
      Cell: ({ cell }) => cell.getValue() || 0,
      enableColumnFilter: false,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'cash_sales_total',
      header: 'Tiền mặt',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'bank_transfer_total',
      header: 'Chuyển khoản',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
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
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'opening_cash',
      header: 'Tiền đầu ca',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'closing_cash',
      header: 'Tiền cuối ca',
      size: 130,
      Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
      enableColumnFilter: false,
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
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
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
  ], [getDiscrepancy]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Tổng kết ca làm việc</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Xem tổng kết các ca làm việc</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {summary && (
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
        </Stack>
      </Paper>

      <MaterialReactTable
        columns={columns}
        data={shifts}
        enableStickyHeader
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={true}
        enableTopToolbar={false}
        enableBottomToolbar={true}
        enablePagination={true}
        layoutMode="grid"
        initialState={{ 
          density: 'compact',
          pagination: { pageSize: 10, pageIndex: 0 }
        }}
        state={{ isLoading: loading }}
        localization={MRT_Localization_VI}
        muiTableContainerProps={{
          sx: { maxHeight: { xs: '70vh', md: '600px' } }
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
        muiTableBodyCellProps={{
          sx: { whiteSpace: 'normal', wordBreak: 'break-word' }
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
