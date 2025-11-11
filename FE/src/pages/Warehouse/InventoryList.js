import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
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
  IconButton,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Inventory2 as InventoryIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getAllWarehouseInventory
} from '../../api/inventoryApi';

// =====================================================
// CONSTANTS
// =====================================================

const statusColors = {
  normal: 'success',
  low: 'warning',
  critical: 'error',
  out_of_stock: 'default'
};

const statusLabels = {
  normal: 'Đủ hàng',
  low: 'Sắp hết',
  critical: 'Gần hết',
  out_of_stock: 'Hết hàng'
};

const statusIcons = {
  normal: <CheckIcon fontSize="small" />,
  low: <WarningIcon fontSize="small" />,
  critical: <ErrorIcon fontSize="small" />,
  out_of_stock: <ErrorIcon fontSize="small" />
};

const formatVnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

// =====================================================
// COMPONENT
// =====================================================

const InventoryList = () => {
  const navigate = useNavigate();

  // State
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');

  // =====================================================
  // DATA LOADING
  // =====================================================

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await getAllWarehouseInventory({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter,
        storeId: storeFilter,
        search
      });

      if (response.err === 0) {
        setInventory(response.data.inventory);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        toast.error(response.msg || 'Không thể tải dữ liệu');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [page, rowsPerPage, statusFilter, storeFilter]);

  const handleSearch = () => {
    setPage(0);
    loadInventory();
  };

  const handleRefresh = () => {
    setSearch('');
    setStatusFilter('');
    setStoreFilter('');
    setPage(0);
    loadInventory();
  };

  // FIX: Prevent default navigation and use navigate correctly
  const handleViewDetail = (e, inventoryId) => {
    e.preventDefault();
    navigate(`/warehouse/inventory/${inventoryId}`);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quản lý Tồn Kho Tổng
          </Typography>
          <Typography color="text.secondary">
            Theo dõi và quản lý tồn kho của tất cả chi nhánh
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Làm mới
        </Button>
      </Stack>

      {/* Filters - FIX: Tăng chiều rộng các cột */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search box - tăng từ 4 lên 5 */}
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Tìm theo tên hoặc SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* Status filter - tăng từ 3 lên 3.5 */}
          <Grid item xs={12} sm={6} md={3.5}>
            <TextField
              select
              fullWidth
              label="Trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="normal">Đủ hàng</MenuItem>
              <MenuItem value="low">Sắp hết</MenuItem>
              <MenuItem value="critical">Gần hết</MenuItem>
              <MenuItem value="out_of_stock">Hết hàng</MenuItem>
            </TextField>
          </Grid>

          {/* Store filter - giữ nguyên hoặc giảm xuống 2 */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              label="Chi nhánh"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Store Central</MenuItem>
              <MenuItem value="2">Store North</MenuItem>
              <MenuItem value="3">Store South</MenuItem>
            </TextField>
          </Grid>

          {/* Search button - giảm từ 2 xuống 1.5 */}
          <Grid item xs={12} md={1.5}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
            >
              Tìm
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Inventory Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chi nhánh</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Min/Reorder</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Giá trị</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Alert severity="info">Không có dữ liệu</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.inventory_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.product?.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.product?.name}
                      </Typography>
                      {item.product?.description && (
                        <Typography variant="caption" color="text.secondary">
                          {item.product.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.product?.category?.name || 'N/A'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.store?.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight={700}>
                        {item.stock}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {item.min_stock_level} / {item.reorder_point}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatVnd(item.stockValue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={statusIcons[item.stockStatus]}
                        label={statusLabels[item.stockStatus]}
                        color={statusColors[item.stockStatus]}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {/* FIX: Sử dụng onClick thay vì href */}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => handleViewDetail(e, item.inventory_id)}
                          title="Xem chi tiết"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={(e) => handleViewDetail(e, item.inventory_id)}
                          title="Chỉnh sửa"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
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

export default InventoryList;
