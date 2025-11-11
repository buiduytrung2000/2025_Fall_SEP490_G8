import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  getInventoryDetail,
  updateInventorySettings,
  adjustStock
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

const formatVnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

// =====================================================
// COMPONENT
// =====================================================

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Dialogs
  const [editDialog, setEditDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);

  // Form states
  const [minStockLevel, setMinStockLevel] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');

  // =====================================================
  // DATA LOADING
  // =====================================================

  const loadInventoryDetail = async () => {
    setLoading(true);
    try {
      const response = await getInventoryDetail(id);
      if (response.err === 0) {
        setInventory(response.data);
        setMinStockLevel(response.data.min_stock_level);
        setReorderPoint(response.data.reorder_point);
      } else {
        toast.error(response.msg || 'Không thể tải dữ liệu');
        navigate('/warehouse/inventory');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
      navigate('/warehouse/inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryDetail();
  }, [id]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleUpdateSettings = async () => {
    if (!minStockLevel || !reorderPoint) {
      toast.warning('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (parseInt(minStockLevel) > parseInt(reorderPoint)) {
      toast.error('Min stock level không thể lớn hơn reorder point');
      return;
    }

    setUpdating(true);
    try {
      const response = await updateInventorySettings(id, {
        min_stock_level: parseInt(minStockLevel),
        reorder_point: parseInt(reorderPoint)
      });

      if (response.err === 0) {
        toast.success('Cập nhật thành công!');
        setEditDialog(false);
        loadInventoryDetail();
      } else {
        toast.error(response.msg || 'Không thể cập nhật');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustment || !reason) {
      toast.warning('Vui lòng nhập số lượng và lý do');
      return;
    }

    const adj = parseInt(adjustment);
    if (adj === 0) {
      toast.warning('Số lượng điều chỉnh phải khác 0');
      return;
    }

    setUpdating(true);
    try {
      const response = await adjustStock(id, {
        adjustment: adj,
        reason
      });

      if (response.err === 0) {
        toast.success(response.msg);
        setAdjustDialog(false);
        setAdjustment('');
        setReason('');
        loadInventoryDetail();
      } else {
        toast.error(response.msg || 'Không thể điều chỉnh');
      }
    } catch (error) {
      toast.error('Lỗi kết nối: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!inventory) {
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <Alert severity="error">Không tìm thấy dữ liệu</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/warehouse/inventory')}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Chi tiết tồn kho
          </Typography>
          <Typography color="text.secondary">
            {inventory.product?.name}
          </Typography>
        </Box>
        <Chip
          size="large"
          label={statusLabels[inventory.stockStatus]}
          color={statusColors[inventory.stockStatus]}
        />
      </Stack>

      {/* Action Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setEditDialog(true)}
        >
          Chỉnh sửa cài đặt
        </Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<AddIcon />}
          onClick={() => setAdjustDialog(true)}
        >
          Điều chỉnh stock
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Product Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin sản phẩm
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    SKU
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {inventory.product?.sku}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tên sản phẩm
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {inventory.product?.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Mô tả
                  </Typography>
                  <Typography variant="body2">
                    {inventory.product?.description || 'Không có'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Danh mục
                  </Typography>
                  <Chip
                    size="small"
                    label={inventory.product?.category?.name || 'N/A'}
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nhà cung cấp
                  </Typography>
                  <Typography variant="body2">
                    {inventory.product?.supplier?.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Giá gốc (HQ)
                  </Typography>
                  <Typography variant="h6" color="success.main" fontWeight={700}>
                    {formatVnd(inventory.product?.hq_price)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Stock Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông tin tồn kho
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Chi nhánh
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {inventory.store?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {inventory.store?.address}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tồn kho hiện tại
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary">
                    {inventory.stock}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tồn kho tối thiểu
                  </Typography>
                  <Typography variant="h6">
                    {inventory.min_stock_level}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Điểm đặt hàng lại
                  </Typography>
                  <Typography variant="h6">
                    {inventory.reorder_point}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Giá trị tồn kho
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight={700}>
                    {formatVnd(inventory.stockValue)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Settings Dialog */}
      <Dialog open={editDialog} onClose={() => !updating && setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa cài đặt tồn kho</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Tồn kho tối thiểu (Min Stock Level)"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
              helperText="Mức tồn kho tối thiểu cần duy trì"
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              fullWidth
              type="number"
              label="Điểm đặt hàng lại (Reorder Point)"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              helperText="Khi tồn kho <= giá trị này, cần nhập thêm hàng"
              InputProps={{ inputProps: { min: 0 } }}
            />
            <Alert severity="info">
              Min Stock Level phải nhỏ hơn hoặc bằng Reorder Point
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateSettings}
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onClose={() => !updating && setAdjustDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="warning">
              Tồn kho hiện tại: <strong>{inventory.stock}</strong>
            </Alert>
            <TextField
              fullWidth
              type="number"
              label="Số lượng điều chỉnh"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              helperText="Số dương để thêm, số âm để trừ. VD: +10 (thêm 10), -5 (trừ 5)"
              placeholder="+10 hoặc -5"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Lý do điều chỉnh"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText="Ghi rõ lý do: kiểm kê, hư hỏng, mất mát, v.v."
              placeholder="VD: Kiểm kê phát hiện thừa 10 sản phẩm"
            />
            {adjustment && (
              <Alert severity={parseInt(adjustment) > 0 ? 'success' : 'error'}>
                Stock mới: <strong>{inventory.stock + parseInt(adjustment || 0)}</strong>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(false)} disabled={updating}>
            Hủy
          </Button>
          <Button
            onClick={handleAdjustStock}
            variant="contained"
            color={parseInt(adjustment || 0) > 0 ? 'success' : 'error'}
            disabled={updating}
            startIcon={updating ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          >
            Xác nhận điều chỉnh
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryDetail;
