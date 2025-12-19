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

  // Xác định các cặp ca liên tiếp (theo thời gian) mà tiền cuối ca trước lệch so với tiền đầu ca sau
  // -> highlight cả "tiền cuối ca" của ca trước và "tiền đầu ca" của ca sau, mỗi cặp một màu
  const { openingHighlightMap, closingHighlightMap } = useMemo(() => {
    const openingMap = new Map(); // shift_id -> pairIndex
    const closingMap = new Map(); // shift_id -> pairIndex

    if (!Array.isArray(shifts) || shifts.length === 0) {
      return { openingHighlightMap: openingMap, closingHighlightMap: closingMap };
    }

    // Sắp xếp tất cả ca theo thời gian (không phân biệt thu ngân)
    const sorted = [...shifts].sort((a, b) => {
      const ta = new Date(a.closed_at || a.opened_at || a.created_at || 0).getTime();
      const tb = new Date(b.closed_at || b.opened_at || b.created_at || 0).getTime();
      return ta - tb; // Ca cũ trước, ca mới sau
    });

    let pairIndex = 0;

    // So sánh từng cặp ca liên tiếp
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevClosing = parseFloat(prev.closing_cash) || 0;
      const currOpening = parseFloat(curr.opening_cash) || 0;

      // Highlight khi tiền cuối ca trước > tiền đầu ca sau (có chênh lệch bất thường)
      if (prevClosing > currOpening && prevClosing > 0 && currOpening >= 0) {
        const prevId = prev.shift_id;
        const currId = curr.shift_id;
        if (prevId) closingMap.set(prevId, pairIndex);
        if (currId) openingMap.set(currId, pairIndex);
        pairIndex += 1;
      }
    }

    return { openingHighlightMap: openingMap, closingHighlightMap: closingMap };
  }, [shifts]);

  const highlightColors = [
    { bg: '#fff3e0', color: '#e65100' },
    { bg: '#e3f2fd', color: '#0d47a1' },
    { bg: '#e8f5e9', color: '#1b5e20' },
    { bg: '#f3e5f5', color: '#4a148c' },
    { bg: '#fbe9e7', color: '#bf360c' },
  ];

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
        const pairIndex = openingHighlightMap.get(row.original.shift_id);
        const colorSet =
          typeof pairIndex === 'number'
            ? highlightColors[pairIndex % highlightColors.length]
            : null;
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: colorSet ? 700 : 400,
              color: colorSet ? colorSet.color : 'inherit',
              backgroundColor: colorSet ? colorSet.bg : 'transparent',
              padding: colorSet ? '4px 8px' : '0',
              borderRadius: colorSet ? '4px' : '0',
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
        const pairIndex = closingHighlightMap.get(row.original.shift_id);
        const colorSet =
          typeof pairIndex === 'number'
            ? highlightColors[pairIndex % highlightColors.length]
            : null;
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: colorSet ? 700 : 400,
              color: colorSet ? colorSet.color : 'inherit',
              backgroundColor: colorSet ? colorSet.bg : 'transparent',
              padding: colorSet ? '4px 8px' : '0',
              borderRadius: colorSet ? '4px' : '0',
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
    {
      accessorKey: 'late_minutes',
      header: 'Số phút muộn',
      size: 120,
      Cell: ({ cell, row }) => {
        const lateMinutes = cell.getValue();
        if (!lateMinutes || lateMinutes === 0) return '—';
        // Hiển thị số phút muộn (cộng thêm 5 phút để hiển thị đúng so với giờ bắt đầu ca)
        const displayLateMinutes = lateMinutes + 5;
        // Chuyển đổi phút thành giờ - phút
        const hours = Math.floor(displayLateMinutes / 60);
        const minutes = displayLateMinutes % 60;
        const formattedTime = hours > 0
          ? `${hours} giờ ${minutes} phút`
          : `${minutes} phút`;
        return (
          <Typography
            variant="body2"
            sx={{
              color: 'error.main',
              fontWeight: 600
            }}
          >
            {formattedTime}
          </Typography>
        );
      },
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'early_minutes',
      header: 'Số giờ kết ca sớm',
      size: 140,
      Cell: ({ cell }) => {
        const earlyMinutes = cell.getValue();
        if (!earlyMinutes || earlyMinutes === 0) return '—';
        // Hiển thị số phút kết ca sớm (cộng thêm 5 phút để hiển thị đúng so với giờ kết ca)
        const displayEarlyMinutes = earlyMinutes + 5;
        const hours = Math.floor(displayEarlyMinutes / 60);
        const minutes = displayEarlyMinutes % 60;
        const formattedTime = hours > 0
          ? `${hours} giờ ${minutes} phút`
          : `${minutes} phút`;
        return (
          <Typography
            variant="body2"
            sx={{
              color: 'warning.main',
              fontWeight: 600
            }}
          >
            {formattedTime}
          </Typography>
        );
      },
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'center',
      },
    },
    {
      accessorKey: 'early_reason',
      header: 'Lý do kết ca sớm',
      size: 220,
      Cell: ({ row }) => {
        const earlyMinutes = row.original.early_minutes;
        const note = row.original.note || '';
        if (!earlyMinutes || earlyMinutes === 0 || !note.trim()) return '—';

        // Note được lưu dạng: "Lý do đi muộn | Lý do kết ca sớm" hoặc chỉ "Lý do kết ca sớm"
        const parts = note.split('|').map((p) => p.trim()).filter(Boolean);
        // Nếu có dấu |, lấy phần sau (phần thứ 2). Nếu không có dấu |, lấy toàn bộ note
        const earlyReason = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || note);

        if (!earlyReason) return '—';

        return (
          <Typography
            variant="body2"
            sx={{
              color: 'warning.main',
              fontWeight: 500,
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={earlyReason}
          >
            {earlyReason}
          </Typography>
        );
      },
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'left',
      },
    },
    {
      accessorKey: 'note',
      header: 'Lý do muộn',
      size: 200,
      Cell: ({ cell, row }) => {
        const note = cell.getValue();
        const lateMinutes = row.original.late_minutes;
        // Chỉ hiển thị nếu có lateMinutes > 0
        if (!lateMinutes || lateMinutes === 0 || !note || !note.trim()) return '—';

        // Note được lưu dạng: "Lý do đi muộn | Lý do kết ca sớm" hoặc chỉ "Lý do muộn"
        // Nếu có dấu |, lấy phần trước (phần thứ 1). Nếu không có dấu |, lấy toàn bộ note
        const parts = note.split('|').map((p) => p.trim()).filter(Boolean);
        const lateReason = parts.length > 1 ? parts[0] : (parts[0] || note);

        if (!lateReason) return '—';

        return (
          <Typography
            variant="body2"
            sx={{
              color: 'error.main',
              fontWeight: 600,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={lateReason}
          >
            {lateReason}
          </Typography>
        );
      },
      muiTableHeadCellProps: {
        align: 'center',
      },
      muiTableBodyCellProps: {
        align: 'left',
      },
    },
  ], [getDiscrepancy, openingHighlightMap, closingHighlightMap]);

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
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            whiteSpace: 'normal',
            wordBreak: 'break-word'
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
