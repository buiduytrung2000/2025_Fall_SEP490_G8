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
  Grid,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Inventory2 as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getAllWarehouseInventory
} from '../../api/inventoryApi';
import { createBatchWarehouseOrders } from '../../api/warehouseOrderApi';

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
const formatQty = (value) =>
  Number(value ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

const getDisplayUnitLabel = (item) => {
  if (item?.use_package_unit && item?.package_unit_label) return item.package_unit_label;
  return item?.base_unit_label || '';
};

const toBaseQuantity = (item) => {
  const quantity = Number(item?.quantity) || 0;
  if (item?.use_package_unit && item?.package_conversion) {
    return Math.round(quantity * item.package_conversion);
  }
  return Math.round(quantity);
};

const toBaseUnitPrice = (item) => {
  const price = Number(item?.unit_price) || 0;
  if (item?.use_package_unit && item?.package_conversion) {
    return Number((price / item.package_conversion).toFixed(2));
  }
  return price;
};

const getDisplaySubtotal = (item) => {
  const quantity = Number(item?.quantity) || 0;
  const price = Number(item?.unit_price) || 0;
  return quantity * price;
};

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
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');

  // =============================
  // Selection & Create Order
  // =============================
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [createOrderDialog, setCreateOrderDialog] = useState(false);
  const [orderData, setOrderData] = useState({ expected_delivery: '', notes: '' });
  const [orderItems, setOrderItems] = useState([]);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const handleSelectProduct = (item) => {
    const id = item.warehouse_inventory_id || item.inventory_id;
    const exists = selectedProducts.some(p => (p.warehouse_inventory_id || p.inventory_id) === id);
    const next = exists
      ? selectedProducts.filter(p => (p.warehouse_inventory_id || p.inventory_id) !== id)
      : [...selectedProducts, item];
    setSelectedProducts(next);
    setSelectAll(next.length > 0 && next.length === inventory.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
      setSelectAll(false);
    } else {
      setSelectedProducts([...inventory]);
      setSelectAll(true);
    }
  };

  const isSelected = (item) => selectedProducts.some(p => (p.warehouse_inventory_id || p.inventory_id) === (item.warehouse_inventory_id || item.inventory_id));

  const handleOpenCreateOrder = () => {
    if (!selectedProducts.length) {
      toast.warning('Vui lòng chọn ít nhất 1 sản phẩm');
      return;
    }

    // Group products by supplier
    const groupedBySupplier = {};
    const productsWithoutSupplier = [];

    selectedProducts.forEach(item => {
      const supplierId = item.product?.supplier?.supplier_id;
      const supplierName = item.product?.supplier?.name;

      if (!supplierId) {
        productsWithoutSupplier.push(item);
        return;
      }

      if (!groupedBySupplier[supplierId]) {
        groupedBySupplier[supplierId] = {
          supplier_id: supplierId,
          supplier_name: supplierName,
          items: []
        };
      }

      const baseUnitPrice = Number(item.product?.hq_price) || 0;
      const hasPackageUnit = Boolean(item.package_conversion && item.package_unit_label);
      const initialUnitPrice = hasPackageUnit && item.package_conversion
        ? Number((baseUnitPrice * item.package_conversion).toFixed(2))
        : baseUnitPrice;

      groupedBySupplier[supplierId].items.push({
        product_id: item.product?.product_id,
        product_name: item.product?.name || '',
        sku: item.product?.sku || '',
        quantity: 1,
        unit_price: initialUnitPrice,
        unit_id: item.product?.base_unit_id || null,
        base_unit_label: item.product?.base_unit_label || '',
        stock: item.stock || 0,
        stock_in_packages: item.stock_in_packages || null,
        package_unit_label: item.package_unit_label || null,
        package_conversion: item.package_conversion || null,
        use_package_unit: hasPackageUnit // Mặc định ưu tiên theo thùng nếu có
      });
    });

    if (productsWithoutSupplier.length > 0) {
      toast.warning(`${productsWithoutSupplier.length} sản phẩm không có nhà cung cấp và sẽ bị bỏ qua`);
    }

    const supplierGroups = Object.values(groupedBySupplier);

    if (supplierGroups.length === 0) {
      toast.error('Không có sản phẩm nào có nhà cung cấp');
      return;
    }

    setOrderItems(supplierGroups);
    setOrderData({ expected_delivery: '', notes: '' });
    setCreateOrderDialog(true);
  };

  const handleCloseCreateOrder = () => setCreateOrderDialog(false);

  const handleOrderItemChange = (supplierIndex, itemIndex, field, value) => {
    const next = [...orderItems];
    next[supplierIndex].items[itemIndex][field] = value;
    setOrderItems(next);
  };

  // Handle unit toggle for order items
  const handleUnitToggle = (supplierIndex, itemIndex) => {
    const next = [...orderItems];
    const item = next[supplierIndex].items[itemIndex];

    if (item.package_conversion) {
      const currentQuantity = Number(item.quantity) || 0;
      const currentPrice = Number(item.unit_price) || 0;

      if (item.use_package_unit) {
        // Chuyển từ đơn vị quy đổi về đơn vị cơ sở
        item.quantity = Math.round(currentQuantity * item.package_conversion);
        item.unit_price = Number((currentPrice / item.package_conversion).toFixed(2));
      } else {
        // Chuyển từ đơn vị cơ sở sang đơn vị quy đổi
        item.quantity = Number((currentQuantity / item.package_conversion).toFixed(2));
        item.unit_price = Number((currentPrice * item.package_conversion).toFixed(2));
      }

      item.use_package_unit = !item.use_package_unit;
      setOrderItems(next);
    }
  };

  const handleRemoveOrderItem = (supplierIndex, itemIndex) => {
    const next = [...orderItems];
    next[supplierIndex].items = next[supplierIndex].items.filter((_, i) => i !== itemIndex);

    // Remove supplier group if no items left
    if (next[supplierIndex].items.length === 0) {
      next.splice(supplierIndex, 1);
    }

    setOrderItems(next);
  };

  const handleSubmitOrder = async () => {
    if (!orderItems.length) return toast.error('Đơn hàng phải có ít nhất 1 nhà cung cấp');

    // Validate all items
    for (const group of orderItems) {
      if (!group.items.length) {
        return toast.error(`Nhà cung cấp ${group.supplier_name} không có sản phẩm nào`);
      }

      for (const item of group.items) {
        if (!item.quantity || Number(item.quantity) <= 0) {
          return toast.error(`Số lượng phải > 0: ${item.product_name}`);
        }
        if (!item.unit_price || Number(item.unit_price) <= 0) {
          return toast.error(`Đơn giá phải > 0: ${item.product_name}`);
        }
      }
    }

    setCreatingOrder(true);
    try {
      // Prepare batch payload
      const payload = {
        orders: orderItems.map(group => ({
          supplier_id: Number(group.supplier_id),
          items: group.items.map(item => {
            const baseQuantity = toBaseQuantity(item);
            const baseUnitPrice = toBaseUnitPrice(item);

            return {
              product_id: item.product_id,
              quantity: baseQuantity,
              unit_price: baseUnitPrice,
              unit_id: item.unit_id
            };
          })
        })),
        expected_delivery: orderData.expected_delivery || null,
        notes: orderData.notes || null
      };

      const res = await createBatchWarehouseOrders(payload);

      if (res.err === 0) {
        const { successCount, failCount } = res.data;

        if (failCount === 0) {
          toast.success(`Đã tạo thành công ${successCount} đơn hàng cho ${successCount} nhà cung cấp`);
        } else {
          toast.warning(`Đã tạo ${successCount} đơn hàng thành công, ${failCount} đơn hàng thất bại`);

          // Show details of failed orders
          if (res.data.failed && res.data.failed.length > 0) {
            res.data.failed.forEach(fail => {
              const supplierGroup = orderItems[fail.index];
              toast.error(`Lỗi tạo đơn cho ${supplierGroup?.supplier_name}: ${fail.error}`);
            });
          }
        }

        setCreateOrderDialog(false);
        setSelectedProducts([]);
        setSelectAll(false);
        // Notify other screens (OrderList) to refresh
        try { window.dispatchEvent(new CustomEvent('warehouse-order:created')); } catch { }
        loadInventory();
      } else {
        toast.error(res.msg || 'Không thể tạo đơn hàng');
      }
    } catch (e) {
      toast.error('Lỗi kết nối: ' + e.message);
    } finally {
      setCreatingOrder(false);
    }
  };

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
        search: debouncedSearch
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
  }, [page, rowsPerPage, statusFilter, storeFilter, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearch = () => {
    setPage(0);
    setDebouncedSearch(searchInput.trim());
  };

  const handleRefresh = () => {
    setSearchInput('');
    setDebouncedSearch('');
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
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quản lý Tồn Kho Tổng
          </Typography>
          <Typography color="text.secondary">
            Theo dõi và quản lý tồn kho của tất cả chi nhánh
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {selectedProducts.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ShoppingCartIcon />}
              onClick={handleOpenCreateOrder}
            >
              Tạo Đơn Hàng ({selectedProducts.length})
            </Button>
          )}
          <IconButton onClick={handleSearch} color="primary" title="Làm mới">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Filters - FIX: Tăng chiều rộng các cột */}
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
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              )
            }}
            sx={{ flex: 1 }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              select
              size="small"
              label="Trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="normal">Đủ hàng</MenuItem>
              <MenuItem value="low">Sắp hết</MenuItem>
              <MenuItem value="critical">Gần hết</MenuItem>
              <MenuItem value="out_of_stock">Hết hàng</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Chi nhánh"
              value={storeFilter}
              onChange={(e) => {
                setStoreFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Store Central</MenuItem>
              <MenuItem value="2">Store North</MenuItem>
              <MenuItem value="3">Store South</MenuItem>
            </TextField>

          </Stack>
        </Stack>
      </Paper>

      {/* Inventory Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    checked={inventory.length > 0 && selectAll}
                    indeterminate={selectedProducts.length > 0 && selectedProducts.length < inventory.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho (lẻ)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Quy đổi (thùng)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Min/Reorder</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <Alert severity="info">Không có dữ liệu</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item, index) => {
                  const selected = isSelected(item);
                  return (
                    <TableRow
                      key={item.warehouse_inventory_id || item.inventory_id || `inventory-${index}`}
                      hover
                      onClick={() => handleSelectProduct(item)}
                      role="checkbox"
                      aria-checked={selected}
                      selected={selected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox color="primary" checked={selected} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.product?.sku}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.product?.name}</Typography>
                        {item.product?.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.product.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.product?.category?.name || 'N/A'} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight={700}>
                          {formatQty(item.stock)} {item.product?.base_unit_label || ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.stock_in_packages ? (
                          <Typography variant="h6" fontWeight={700}>
                            {formatQty(item.stock_in_packages)} {item.package_unit_label || ''}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {item.min_stock_level} / {item.reorder_point}
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

      {/* Create Order Dialog */}
      <Dialog open={createOrderDialog} onClose={handleCloseCreateOrder} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Tạo Đơn Hàng Mới</Typography>
            <Chip
              label={`${orderItems.length} nhà cung cấp`}
              color="primary"
              size="small"
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày giao hàng dự kiến (chung)"
                value={orderData.expected_delivery}
                onChange={(e) => setOrderData({ ...orderData, expected_delivery: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={1}
                label="Ghi chú (chung)"
                value={orderData.notes}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }}>Sản phẩm theo nhà cung cấp</Divider>

          {orderItems.map((supplierGroup, supplierIndex) => {
            const totalAmount = supplierGroup.items.reduce((acc, item) => {
              return acc + getDisplaySubtotal(item);
            }, 0);

            return (
              <Paper key={supplierGroup.supplier_id} sx={{ p: 2, mb: 2 }} variant="outlined">
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" color="primary">
                    {supplierGroup.supplier_name}
                  </Typography>
                  <Chip
                    label={`${supplierGroup.items.length} sản phẩm`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell align="right">Tồn kho hiện tại</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                        <TableCell align="center">Xóa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {supplierGroup.items.map((item, itemIndex) => (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.sku}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack alignItems="flex-end" spacing={0.5}>
                             
                              {item.stock_in_packages && item.package_unit_label && (
                                <Typography variant="body2" fontWeight={600}>
                                  {formatQty(item.stock_in_packages)} {item.package_unit_label}
                                </Typography>
                              )}
                               <Typography  variant="caption" color="primary.main" fontWeight={600}>
                               ≈ {formatQty(item.stock)} {item.base_unit_label}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack alignItems="flex-end" spacing={1}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.quantity}
                                onChange={(e) => handleOrderItemChange(supplierIndex, itemIndex, 'quantity', e.target.value)}
                                sx={{ width: 130 }}
                                slotProps={{
                                  input: {
                                    inputProps: { min: item.use_package_unit ? 0.01 : 1, step: item.use_package_unit ? 0.01 : 1 },
                                    endAdornment: getDisplayUnitLabel(item)
                                      ? <InputAdornment position="end">{getDisplayUnitLabel(item)}</InputAdornment>
                                      : null
                                  }
                                }}
                              />
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  Đơn vị: {getDisplayUnitLabel(item) || '—'}
                                </Typography>
                                {item.package_conversion && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleUnitToggle(supplierIndex, itemIndex)}
                                  >
                                    {item.use_package_unit
                                      ? `Sang ${item.base_unit_label || 'đơn vị lẻ'}`
                                      : `Sang ${item.package_unit_label || 'thùng'}`
                                    }
                                  </Button>
                                )}
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.unit_price}
                                onChange={(e) => handleOrderItemChange(supplierIndex, itemIndex, 'unit_price', e.target.value)}
                                sx={{ width: 140 }}
                                slotProps={{
                                  input: {
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        đ/{getDisplayUnitLabel(item) || 'đv'}
                                      </InputAdornment>
                                    )
                                  }
                                }}
                              />
                              {item.use_package_unit && item.package_conversion && (
                                <Typography variant="caption" color="text.secondary">
                                  ≈ {formatVnd(toBaseUnitPrice(item))} / {item.base_unit_label || 'đơn vị lẻ'}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600}>
                              {formatVnd(getDisplaySubtotal(item))}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveOrderItem(supplierIndex, itemIndex)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="subtitle1" fontWeight={600}>Tổng tiền</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle1" fontWeight={700} color="error.main">
                            {formatVnd(totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            );
          })}

          {orderItems.length > 0 && (
            <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Tổng cộng tất cả đơn hàng</Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {formatVnd(orderItems.reduce((total, group) =>
                    total + group.items.reduce((acc, item) => acc + getDisplaySubtotal(item), 0), 0
                  ))}
                </Typography>
              </Stack>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseCreateOrder}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSubmitOrder}
            disabled={creatingOrder || orderItems.length === 0}
          >
            {creatingOrder ? <CircularProgress size={24} /> : `Tạo ${orderItems.length} Đơn Hàng`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryList;
