import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { ActionButton, ToastNotification, Alert, Icon } from '../../components/common';
import { getAllStockCountReports, getStockCountStatistics } from '../../api/inventoryApi';

const formatQty = (value) =>
  Number(value ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

const reportTypeColors = {
  shortage: 'error',
  excess: 'warning',
  normal: 'success'
};

const reportTypeLabels = {
  shortage: 'Thiếu hàng',
  excess: 'Thừa hàng',
  normal: 'Đúng'
};

const StockCountReports = () => {
  // State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Statistics
  const [statistics, setStatistics] = useState(null);

  // =====================================================
  // DATA LOADING
  // =====================================================

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await getAllStockCountReports({
        page: page + 1,
        limit: rowsPerPage,
        reportType: reportTypeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined
      });

      if (response.err === 0) {
        setReports(response.data.reports);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        ToastNotification.error(response.msg || 'Không thể tải dữ liệu');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await getStockCountStatistics({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (response.err === 0) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, reportTypeFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRefresh = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setReportTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
    loadReports();
    loadStatistics();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            <Icon name="Assessment" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Báo cáo Kiểm kê Tồn kho
          </Typography>
          <Typography color="text.secondary">
            Xem các báo cáo kiểm kê thiếu hoặc thừa hàng
          </Typography>
        </Box>
      </Stack>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Tổng số báo cáo
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {statistics.totalReports}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Thiếu hàng
                </Typography>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {statistics.shortageCount}
                </Typography>
               
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Thừa hàng
                </Typography>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {statistics.excessCount}
                </Typography>
              
              </CardContent>
            </Card>
          </Grid>
         
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <TextField
            fullWidth
            placeholder="Tìm theo tên hoặc SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon name="Search" color="action" />
                </InputAdornment>
              )
            }}
            sx={{ flex: 1 }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              select
              size="small"
              label="Loại báo cáo"
              value={reportTypeFilter}
              onChange={(e) => {
                setReportTypeFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="shortage">Thiếu hàng</MenuItem>
              <MenuItem value="excess">Thừa hàng</MenuItem>
              <MenuItem value="normal">Đúng</MenuItem>
            </TextField>

            <TextField
              type="date"
              size="small"
              label="Từ ngày"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />

            <TextField
              type="date"
              size="small"
              label="Đến ngày"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Reports Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 50 }}>STT</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho hệ thống</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Số lượng thực tế</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Chênh lệch</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Loại</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lý do</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Người báo cáo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                    <Alert severity="info">Không có dữ liệu</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report, index) => {
                  const difference = report.difference || 0;
                  const diffColor = difference > 0 ? 'success.main' : difference < 0 ? 'error.main' : 'text.secondary';
                  
                  return (
                    <TableRow key={report.report_id} hover>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(report.created_at).toLocaleString('vi-VN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {report.product?.sku || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {report.product?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {report.package_conversion
                            ? `${formatQty(report.system_stock_packages)} ${report.package_unit_label || 'Thùng'}`
                            : `${formatQty(report.system_stock)} ${report.product?.baseUnit?.symbol || ''}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {report.package_conversion
                            ? `${formatQty(report.actual_stock_packages)} ${report.package_unit_label || 'Thùng'}`
                            : `${formatQty(report.actual_stock)} ${report.product?.baseUnit?.symbol || ''}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={diffColor}
                        >
                          {report.package_conversion
                            ? `${difference > 0 ? '+' : ''}${formatQty(report.difference_packages)} ${report.package_unit_label || 'Thùng'}`
                            : `${difference > 0 ? '+' : ''}${formatQty(difference)} ${report.product?.baseUnit?.symbol || ''}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={reportTypeLabels[report.report_type]}
                          color={reportTypeColors[report.report_type]}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {report.reason || '—'}
                        </Typography>
                        {report.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {report.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {report.reporter?.full_name || report.reporter?.username || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
        />
      </Paper>
    </Box>
  );
};

export default StockCountReports;

