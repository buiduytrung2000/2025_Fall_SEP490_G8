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

  // Xác định các ca có tiền đầu ca < tiền cuối ca trước đó (cùng thu ngân)
  // -> highlight cả "tiền cuối ca" của ca trước và "tiền đầu ca" của ca sau
  const { lowOpeningCashShiftIds, highClosingCashShiftIds } = useMemo(() => {
    const lowOpening = new Set();
    const highClosing = new Set();

    if (!Array.isArray(shifts) || shifts.length === 0) {
      return { lowOpeningCashShiftIds: lowOpening, highClosingCashShiftIds: highClosing };
    }

    // Nhóm theo cashier_id (hoặc cashier.user_id)
    const byCashier = new Map();
    shifts.forEach((s) => {
      const cashierIdKey =
        s.cashier_id ||
        s.cashier?.user_id ||
        s.cashier?.id ||
        'unknown';
      if (!byCashier.has(cashierIdKey)) byCashier.set(cashierIdKey, []);
      byCashier.get(cashierIdKey).push(s);
    });

    byCashier.forEach((list) => {
      // Sắp xếp theo thời gian đóng ca (closed_at) hoặc mở ca (opened_at) nếu chưa đóng
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.closed_at || a.opened_at || a.created_at || 0).getTime();
        const tb = new Date(b.closed_at || b.opened_at || b.created_at || 0).getTime();
        return ta - tb; // Sắp xếp tăng dần: ca cũ trước, ca mới sau
      });

      // So sánh từng cặp ca liên tiếp
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        
        // Chuyển đổi sang số, xử lý cả string và number
        const prevClosing = parseFloat(prev.closing_cash) || 0;
        const currOpening = parseFloat(curr.opening_cash) || 0;
        
        // Highlight khi tiền cuối ca trước > tiền đầu ca sau (có chênh lệch bất thường)
        if (prevClosing > currOpening && prevClosing > 0 && currOpening >= 0) {
          // Đánh dấu ca hiện tại có tiền đầu ca thấp hơn tiền cuối ca trước
          if (curr.shift_id) lowOpening.add(curr.shift_id);
          // Đồng thời đánh dấu ca trước có tiền cuối ca cao bất thường
          if (prev.shift_id) highClosing.add(prev.shift_id);
        }
      }
    });

    return { lowOpeningCashShiftIds: lowOpening, highClosingCashShiftIds: highClosing };
  }, [shifts]);

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
      Cell: ({ cell, row }) => {
        const value = cell.getValue() || 0;
        const isLowOpening = lowOpeningCashShiftIds.has(row.original.shift_id);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: isLowOpening ? 700 : 400,
              color: isLowOpening ? '#ff9800' : 'inherit',
              backgroundColor: isLowOpening ? '#ffe0b2' : 'transparent',
              padding: isLowOpening ? '4px 8px' : '0',
              borderRadius: isLowOpening ? '4px' : '0',
            }}
          >
            {formatCurrency(value)}
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
    {
      accessorKey: 'closing_cash',
      header: 'Tiền cuối ca',
      size: 130,
      Cell: ({ cell, row }) => {
        const value = cell.getValue() || 0;
        const isHighClosing = highClosingCashShiftIds.has(row.original.shift_id);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: isHighClosing ? 700 : 400,
              color: isHighClosing ? '#ff9800' : 'inherit',
              backgroundColor: isHighClosing ? '#ffe0b2' : 'transparent',
              padding: isHighClosing ? '4px 8px' : '0',
              borderRadius: isHighClosing ? '4px' : '0',
            }}
          >
            {formatCurrency(value)}
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
  ], [getDiscrepancy, lowOpeningCashShiftIds, highClosingCashShiftIds]);

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
