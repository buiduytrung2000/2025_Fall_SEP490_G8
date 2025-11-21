// src/pages/Warehouse/InventoryManagement.js
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Button,
    TablePagination,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Edit as EditIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { 
    getAllWarehouseInventory, 
    getWarehouseInventoryStatistics,
    getWarehouseInventoryDetail,
    updateWarehouseInventorySettings,
    adjustWarehouseStock
} from '../../api/inventoryApi';
import { getAllCategories } from '../../api/productApi';

const getStatusInfo = (stockStatus) => {
    const statusMap = {
        'out_of_stock': { label: 'Hết hàng', color: 'error' },
        'critical': { label: 'Sắp hết', color: 'warning' },
        'low': { label: 'Thấp', color: 'warning' },
        'normal': { label: 'Đủ hàng', color: 'success' }
    };
    return statusMap[stockStatus] || { label: 'Không xác định', color: 'default' };
};

const InventoryManagement = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Detail modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailDialog, setDetailDialog] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [adjustDialog, setAdjustDialog] = useState(false);
    const [editData, setEditData] = useState({
        min_stock_level: '',
        reorder_point: '',
        location: '',
        notes: ''
    });
    const [adjustData, setAdjustData] = useState({
        adjustment: '',
        reason: ''
    });
    const [updating, setUpdating] = useState(false);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const response = await getAllWarehouseInventory({
                page: page + 1,
                limit: rowsPerPage,
                categoryId: categoryFilter || undefined,
                status: statusFilter || undefined,
                search: searchTerm || undefined
            });

            if (response.err === 0) {
                setItems(response.data.inventory || []);
                setTotalItems(response.data.pagination.totalItems || 0);
            } else {
                toast.error(response.msg || 'Không thể tải danh sách tồn kho');
            }
        } catch (error) {
            toast.error('Lỗi kết nối: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const response = await getWarehouseInventoryStatistics();
            if (response.err === 0) {
                setStatistics(response.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await getAllCategories();
            if (response.err === 0) {
                setCategories(response.data || []);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    useEffect(() => {
        loadInventory();
    }, [page, rowsPerPage, categoryFilter, statusFilter]);

    useEffect(() => {
        loadStatistics();
        loadCategories();
    }, []);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = () => {
        setPage(0);
        loadInventory();
    };

    const handleRefresh = () => {
        setPage(0);
        setSearchTerm('');
        setCategoryFilter('');
        setStatusFilter('');
        loadInventory();
        loadStatistics();
    };

    const handleViewDetail = async (inventoryId) => {
        try {
            const response = await getWarehouseInventoryDetail(inventoryId);
            if (response.err === 0) {
                setSelectedItem(response.data);
                setDetailDialog(true);
            } else {
                toast.error(response.msg || 'Không thể tải chi tiết tồn kho');
            }
        } catch (error) {
            toast.error('Lỗi kết nối: ' + error.message);
        }
    };

    const handleOpenEdit = (item) => {
        setSelectedItem(item);
        setEditData({
            min_stock_level: item.min_stock_level || '',
            reorder_point: item.reorder_point || '',
            location: item.location || '',
            notes: item.notes || ''
        });
        setEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedItem) return;

        setUpdating(true);
        try {
            const response = await updateWarehouseInventorySettings(selectedItem.warehouse_inventory_id, {
                min_stock_level: parseInt(editData.min_stock_level) || 0,
                reorder_point: parseInt(editData.reorder_point) || 0,
                location: editData.location || null,
                notes: editData.notes || null
            });

            if (response.err === 0) {
                toast.success('Cập nhật cài đặt tồn kho thành công');
                setEditDialog(false);
                loadInventory();
            } else {
                toast.error(response.msg || 'Không thể cập nhật');
            }
        } catch (error) {
            toast.error('Lỗi kết nối: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleOpenAdjust = (item) => {
        setSelectedItem(item);
        setAdjustData({ adjustment: '', reason: '' });
        setAdjustDialog(true);
    };

    const handleSaveAdjust = async () => {
        if (!selectedItem) return;

        const adjustment = parseInt(adjustData.adjustment);
        if (isNaN(adjustment) || adjustment === 0) {
            toast.error('Vui lòng nhập số lượng điều chỉnh hợp lệ');
            return;
        }

        if (!adjustData.reason.trim()) {
            toast.error('Vui lòng nhập lý do điều chỉnh');
            return;
        }

        setUpdating(true);
        try {
            const response = await adjustWarehouseStock(selectedItem.warehouse_inventory_id, {
                adjustment,
                reason: adjustData.reason.trim()
            });

            if (response.err === 0) {
                toast.success('Điều chỉnh tồn kho thành công');
                setAdjustDialog(false);
                loadInventory();
                loadStatistics();
            } else {
                toast.error(response.msg || 'Không thể điều chỉnh tồn kho');
            }
        } catch (error) {
            toast.error('Lỗi kết nối: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(value || 0);
    };

    const formatQuantity = (value) => {
        return Number(value || 0).toLocaleString('vi-VN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        });
    };

    return (
        <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 3 }}
                spacing={2}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                        Quản lý tồn kho (Kho tổng)
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Xem và quản lý tồn kho 
                    </Typography>
                </Box>
                <Tooltip title="Làm mới">
                    <IconButton onClick={handleRefresh} color="primary">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* Statistics Cards */}
            {statistics && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Tổng sản phẩm
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                    {statistics.totalProducts || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Tổng giá trị
                                </Typography>
                                <Typography variant="h5" fontWeight={700} color="primary">
                                    {formatCurrency(statistics.totalValue)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.light' }}>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Sắp hết hàng
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                    {statistics.lowStockCount || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'error.light' }}>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Hết hàng
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                    {statistics.outOfStockCount || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        select
                        size="small"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        label="Danh mục"
                        sx={{ width: { xs: '100%', sm: 200 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {categories.map((cat) => (
                            <MenuItem key={cat.category_id} value={cat.category_id}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Trạng thái"
                        sx={{ width: { xs: '100%', sm: 200 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="out_of_stock">Hết hàng</MenuItem>
                        <MenuItem value="critical">Sắp hết</MenuItem>
                        <MenuItem value="low">Thấp</MenuItem>
                        <MenuItem value="normal">Đủ hàng</MenuItem>
                    </TextField>

                    <TextField
                        size="small"
                        placeholder="Tìm kiếm theo tên, SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        sx={{ flexGrow: 1 }}
                    />

                    <Button
                        variant="contained"
                        startIcon={<FilterIcon />}
                        onClick={handleSearch}
                        sx={{ minWidth: 120 }}
                    >
                        Tìm kiếm
                    </Button>
                </Stack>
            </Paper>

            {/* Inventory Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Mã SP</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Vị trí</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Quy đổi (thùng)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Tồn tối thiểu</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Điểm đặt hàng</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => {
                                const statusInfo = getStatusInfo(item.stockStatus);
                                return (
                                    <TableRow key={item.warehouse_inventory_id || `inventory-${index}`} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {item.product?.sku || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {item.product?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.product?.category?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.location || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>
                                                {item.stock || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {item.stock_in_packages ? (
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        ~{formatQuantity(item.stock_in_packages)} {item.package_unit_label || 'thùng'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.package_conversion
                                                            ? `${formatQuantity(item.package_conversion)} đơn vị/thùng`
                                                            : ''}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">
                                                {item.min_stock_level || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">
                                                {item.reorder_point || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                color={statusInfo.color}
                                                label={statusInfo.label}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleViewDetail(item.warehouse_inventory_id)}
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => handleOpenEdit(item)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalItems}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Số hàng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} trong ${count}`}
                />
            </TableContainer>

            {/* Detail Dialog */}
            <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Chi tiết tồn kho
                </DialogTitle>
                <DialogContent>
                    {selectedItem && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Mã SP</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedItem.product?.sku || 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Tên sản phẩm</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedItem.product?.name || 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Danh mục</Typography>
                                <Typography variant="body1">
                                    {selectedItem.product?.category?.name || '-'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Vị trí trong kho</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedItem.location || '-'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Tồn kho hiện tại</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                    {selectedItem.stock || 0}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Tồn tối thiểu</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedItem.min_stock_level || 0}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Điểm đặt hàng</Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedItem.reorder_point || 0}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Giá trị tồn kho</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                    {formatCurrency(selectedItem.stockValue)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">Trạng thái</Typography>
                                <Chip
                                    color={getStatusInfo(selectedItem.stockStatus).color}
                                    label={getStatusInfo(selectedItem.stockStatus).label}
                                    sx={{ mt: 1 }}
                                />
                            </Grid>
                            {selectedItem.notes && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">Ghi chú</Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        {selectedItem.notes}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialog(false)} variant="outlined">
                        Đóng
                    </Button>
                    {selectedItem && (
                        <>
                            <Button
                                onClick={() => {
                                    setDetailDialog(false);
                                    handleOpenEdit(selectedItem);
                                }}
                                variant="outlined"
                                color="warning"
                            >
                                Chỉnh sửa
                            </Button>
                            <Button
                                onClick={() => {
                                    setDetailDialog(false);
                                    handleOpenAdjust(selectedItem);
                                }}
                                variant="contained"
                                color="primary"
                            >
                                Điều chỉnh tồn kho
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onClose={() => !updating && setEditDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Chỉnh sửa cài đặt tồn kho</DialogTitle>
                <DialogContent>
                    {selectedItem && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Sản phẩm: <strong>{selectedItem.product?.name}</strong> ({selectedItem.product?.sku})
                            </Alert>
                            <TextField
                                label="Tồn tối thiểu"
                                type="number"
                                fullWidth
                                margin="normal"
                                value={editData.min_stock_level}
                                onChange={(e) => setEditData({ ...editData, min_stock_level: e.target.value })}
                                inputProps={{ min: 0 }}
                                helperText="Mức tồn kho tối thiểu để cảnh báo"
                            />
                            <TextField
                                label="Điểm đặt hàng"
                                type="number"
                                fullWidth
                                margin="normal"
                                value={editData.reorder_point}
                                onChange={(e) => setEditData({ ...editData, reorder_point: e.target.value })}
                                inputProps={{ min: 0 }}
                                helperText="Mức tồn kho để tự động đặt hàng"
                            />
                            <TextField
                                label="Vị trí trong kho"
                                fullWidth
                                margin="normal"
                                value={editData.location}
                                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                helperText="Ví dụ: Kho chính, Kho lạnh, Kho đồ khô"
                            />
                            <TextField
                                label="Ghi chú"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={3}
                                value={editData.notes}
                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                helperText="Ghi chú về tồn kho"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)} disabled={updating} variant="outlined">
                        Hủy
                    </Button>
                    <Button onClick={handleSaveEdit} variant="contained" disabled={updating}>
                        {updating ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Adjust Stock Dialog */}
            <Dialog open={adjustDialog} onClose={() => !updating && setAdjustDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
                <DialogContent>
                    {selectedItem && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Sản phẩm: <strong>{selectedItem.product?.name}</strong> ({selectedItem.product?.sku})
                                <br />
                                Tồn kho hiện tại: <strong>{selectedItem.stock || 0}</strong>
                            </Alert>
                            <TextField
                                label="Số lượng điều chỉnh"
                                type="number"
                                fullWidth
                                margin="normal"
                                value={adjustData.adjustment}
                                onChange={(e) => setAdjustData({ ...adjustData, adjustment: e.target.value })}
                                helperText="Nhập số dương để tăng, số âm để giảm. Ví dụ: +10 hoặc -5"
                                required
                            />
                            <TextField
                                label="Lý do điều chỉnh"
                                fullWidth
                                margin="normal"
                                multiline
                                rows={3}
                                value={adjustData.reason}
                                onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                helperText="Vui lòng nhập lý do điều chỉnh tồn kho"
                                required
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdjustDialog(false)} disabled={updating} variant="outlined">
                        Hủy
                    </Button>
                    <Button onClick={handleSaveAdjust} variant="contained" disabled={updating}>
                        {updating ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
export default InventoryManagement;