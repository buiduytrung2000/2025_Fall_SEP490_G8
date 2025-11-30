import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  MenuItem
} from '@mui/material';
import { ToastNotification, PrimaryButton, SecondaryButton } from './common';
import { getAllProducts, getProductUnits } from '../api/orderApi';

/**
 * ProductSelectorDialog Component
 * Dialog for selecting and adding a product to the order
 */
export default function ProductSelectorDialog({ 
  open, 
  onClose, 
  onAdd,
  existingProductIds = [] 
}) {
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [adding, setAdding] = useState(false);

  // Load products when dialog opens
  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  // Load product units when product is selected
  useEffect(() => {
    if (selectedProduct) {
      loadProductUnits(selectedProduct.product_id);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getAllProducts({ limit: 1000 });
      if (data.err === 0) {
        // Filter out products already in the order
        const availableProducts = (data.data?.products || []).filter(
          p => !existingProductIds.includes(p.product_id)
        );
        setProducts(availableProducts);
      } else {
        ToastNotification.error('Không thể tải danh sách sản phẩm');
      }
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductUnits = async (productId) => {
    try {
      const data = await getProductUnits(productId);
      if (data.err === 0) {
        setUnits(data.data?.units || []);
        // Set default unit (base unit)
        const baseUnit = (data.data?.units || []).find(u => u.is_base_unit);
        if (baseUnit) {
          setSelectedUnit(baseUnit);
        } else if (data.data?.units?.length > 0) {
          setSelectedUnit(data.data.units[0]);
        }
      }
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const handleAdd = async () => {
    // Validation
    if (!selectedProduct) {
      ToastNotification.error('Vui lòng chọn sản phẩm');
      return;
    }
    if (!quantity || quantity <= 0) {
      ToastNotification.error('Số lượng phải lớn hơn 0');
      return;
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      ToastNotification.error('Đơn giá phải lớn hơn 0');
      return;
    }
    if (!selectedUnit) {
      ToastNotification.error('Vui lòng chọn đơn vị');
      return;
    }

    const newItem = {
      product_id: selectedProduct.product_id,
      product: selectedProduct,
      quantity: parseInt(quantity),
      unit_price: parseFloat(unitPrice),
      unit_id: selectedUnit.unit_id,
      unit: selectedUnit
    };

    setAdding(true);
    try {
      await onAdd(newItem);
      handleClose();
      ToastNotification.success('Đã thêm sản phẩm vào đơn hàng');
    } catch (error) {
      ToastNotification.error(error.message || 'Không thể thêm sản phẩm');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice('');
    setSelectedUnit(null);
    setUnits([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thêm sản phẩm vào đơn hàng</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {loading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Đang tải danh sách sản phẩm...
              </Typography>
            </Stack>
          ) : products.length === 0 ? (
            <Alert severity="info">
              Không có sản phẩm nào khả dụng để thêm vào đơn hàng.
            </Alert>
          ) : (
            <>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={selectedProduct}
                onChange={(e, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn sản phẩm"
                    placeholder="Tìm kiếm sản phẩm..."
                    required
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Stack>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {option.sku} | Danh mục: {option.category?.name || 'N/A'}
                      </Typography>
                    </Stack>
                  </li>
                )}
              />

              {selectedProduct && (
                <>
                  <TextField
                    select
                    label="Đơn vị"
                    value={selectedUnit?.unit_id || ''}
                    onChange={(e) => {
                      const unit = units.find(u => u.unit_id === e.target.value);
                      setSelectedUnit(unit);
                    }}
                    required
                    fullWidth
                  >
                    {units.map((unit) => (
                      <MenuItem key={unit.unit_id} value={unit.unit_id}>
                        {unit.name} ({unit.symbol})
                        {unit.is_base_unit && ' - Đơn vị cơ bản'}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    type="number"
                    label="Số lượng"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    inputProps={{ min: 1 }}
                    required
                    fullWidth
                  />

                  <TextField
                    type="number"
                    label="Đơn giá (VNĐ)"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    inputProps={{ min: 0, step: 1000 }}
                    required
                    fullWidth
                    helperText="Giá cho mỗi đơn vị sản phẩm"
                  />

                  {quantity && unitPrice && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        <b>Thành tiền:</b> {(quantity * parseFloat(unitPrice || 0)).toLocaleString('vi-VN')} đ
                      </Typography>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={handleClose} disabled={adding}>
          Hủy
        </SecondaryButton>
        <PrimaryButton
          onClick={handleAdd}
          disabled={adding || !selectedProduct || loading}
          loading={adding}
        >
          Thêm sản phẩm
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}

