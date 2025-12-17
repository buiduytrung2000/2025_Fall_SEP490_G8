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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { PrimaryButton, SecondaryButton, ActionButton, ToastNotification, Alert, Icon } from '../../components/common';
import {
  getAllWarehouseInventory,
  adjustWarehouseStock,
  createBatchStockCountReports
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
  normal: <Icon name="CheckCircle" fontSize="small" />,
  low: <Icon name="Warning" fontSize="small" />,
  critical: <Icon name="Error" fontSize="small" />,
  out_of_stock: <Icon name="Error" fontSize="small" />
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

  // =============================
  // Selection & Create Order
  // =============================
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [createOrderDialog, setCreateOrderDialog] = useState(false);
  const [orderData, setOrderData] = useState({ expected_delivery: '', notes: '' });
  const [orderItems, setOrderItems] = useState([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [skuInput, setSkuInput] = useState('');

  // =============================
  // Stock Count (Kiểm kê tồn kho)
  // =============================
  const [stockCountDialog, setStockCountDialog] = useState(false);
  const [stockCountItems, setStockCountItems] = useState([]);
  const [processingStockCount, setProcessingStockCount] = useState(false);

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

  const handleOpenStockCount = () => {
    if (!selectedProducts.length) {
      ToastNotification.warning('Vui lòng chọn ít nhất 1 sản phẩm để kiểm kê');
      return;
    }

    // Initialize stock count items with current stock
    const items = selectedProducts.map(item => ({
      inventory_id: item.warehouse_inventory_id || item.inventory_id,
      product_id: item.product?.product_id,
      product_name: item.product?.name || '',
      sku: item.product?.sku || '',
      system_stock: Number(item.stock) || 0,
      actual_stock: Number(item.stock) || 0,
      // base unit (chai)
      base_unit_label: item.product?.base_unit_label || '',
      // package unit (thùng) nếu có
      package_unit_label: item.package_unit_label || null,
      package_conversion: item.package_conversion || null,
      stock_in_packages: item.stock_in_packages || null,
      // Giá trị gốc nhập trong modal (theo đơn vị lớn nếu có)
      actual_input: item.stock_in_packages || null,
      // Ghi chú riêng cho từng sản phẩm
      note: ''
    }));

    setStockCountItems(items);
    setStockCountDialog(true);
  };

  const handleCloseStockCount = () => {
    setStockCountDialog(false);
    setStockCountItems([]);
  };

  const handleStockNoteChange = (index, value) => {
    const next = [...stockCountItems];
    next[index].note = value;
    setStockCountItems(next);
  };

  const handleRemoveStockCountItem = (index) => {
    const removedItem = stockCountItems[index];
    const next = stockCountItems.filter((_, i) => i !== index);
    setStockCountItems(next);

    // Bỏ chọn sản phẩm tương ứng trong danh sách tồn kho
    if (removedItem) {
      setSelectedProducts(prevSelected => {
        const updated = prevSelected.filter(p => {
          const invId = p.warehouse_inventory_id || p.inventory_id;
          return invId !== removedItem.inventory_id;
        });
        setSelectAll(updated.length > 0 && updated.length === inventory.length);
        return updated;
      });
    }

    // Nếu không còn sản phẩm nào thì đóng dialog
    if (next.length === 0) {
      setStockCountDialog(false);
    }
  };

  const handleStockCountChange = (index, field, value) => {
    const next = [...stockCountItems];
    let numValue;
    if (value === '' || value === null || value === undefined) {
      numValue = '';
    } else {
      numValue = Math.max(0, Number(value));
      if (isNaN(numValue)) numValue = '';
    }
    next[index][field] = numValue;

    // Recalculate difference (always theo đơn vị cơ sở)
    const item = next[index];
    let actualStockBase;
    if (item.package_conversion && item.package_conversion > 0) {
      // numValue là theo đơn vị lớn (thùng) → quy về chai
      actualStockBase = numValue === '' ? item.system_stock : Math.round(numValue * item.package_conversion);
    } else {
      // không có đơn vị lớn → numValue đã là đơn vị cơ sở
      actualStockBase = numValue === '' ? item.system_stock : numValue;
    }
    item.actual_stock = actualStockBase;
    item.difference = actualStockBase - item.system_stock;

    setStockCountItems(next);
  };

  const handleSubmitStockCount = async () => {
    // Xác nhận lại trước khi kiểm kê
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`Bạn có chắc muốn xác nhận kiểm kê cho ${stockCountItems.length} sản phẩm?`);
      if (!ok) return;
    }

    // Validate all items have actual stock entered (theo input)
    for (const item of stockCountItems) {
      const actualInput = item.actual_input === '' || item.actual_input === null || item.actual_input === undefined
        ? null
        : Number(item.actual_input);

      if (actualInput === null || isNaN(actualInput)) {
        ToastNotification.error(`Vui lòng nhập số lượng thực tế cho: ${item.product_name}`);
        return;
      }

      // Bắt buộc phải có chênh lệch (không được giữ nguyên bằng 0)
      const diff = Number(item.actual_stock) - Number(item.system_stock);
      if (diff === 0) {
        ToastNotification.error(`Vui lòng nhập chênh lệch cho: ${item.product_name}`);
        return;
      }
    }

    setProcessingStockCount(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Prepare reports for items có chênh lệch (thiếu / thừa)
      const stockCountReports = [];

      for (const item of stockCountItems) {
        const actualStock = Number(item.actual_stock); // đã quy về đơn vị cơ sở ở handleStockCountChange
        const adjustment = actualStock - item.system_stock;

        // Skip if no adjustment needed
        if (adjustment === 0) {
          successCount++;
          continue;
        }

        const baseReason = 'Kiểm kê tồn kho';
        const reason = item.note ? `${baseReason}: ${item.note}` : baseReason;
        const response = await adjustWarehouseStock(item.inventory_id, {
          adjustment,
          reason
        });

        if (response.err === 0) {
          successCount++;

          // Tạo báo cáo kiểm kê cho mọi trường hợp có chênh lệch (thiếu / thừa)
          stockCountReports.push({
            warehouse_inventory_id: item.inventory_id,
            product_id: item.product_id,
            system_stock: item.system_stock,
            actual_stock: actualStock,
            reason: adjustment < 0 ? 'Mất hàng' : 'Thừa hàng',
            notes: item.note || null
          });
        } else {
          failCount++;
          errors.push(`${item.product_name}: ${response.msg || 'Lỗi không xác định'}`);
        }
      }

      // Create batch reports cho các sản phẩm có chênh lệch (thiếu / thừa)
      if (stockCountReports.length > 0) {
        try {
          const reportResponse = await createBatchStockCountReports(stockCountReports);
          if (reportResponse.err === 0) {
            ToastNotification.success(
              `Đã tạo ${stockCountReports.length} báo cáo kiểm kê tồn kho`
            );
          } else {
            ToastNotification.warning(
              `Không thể tạo báo cáo kiểm kê: ${reportResponse.msg || 'Lỗi không xác định'}`
            );
          }
        } catch (reportError) {
          ToastNotification.error('Lỗi khi tạo báo cáo kiểm kê: ' + reportError.message);
        }
      }

      if (failCount === 0) {
        ToastNotification.success(
          successCount === stockCountItems.length
            ? `Đã kiểm kê thành công ${successCount} sản phẩm`
            : `Đã kiểm kê thành công ${successCount} sản phẩm (${stockCountItems.length - successCount} sản phẩm không có thay đổi)`
        );
      } else {
        ToastNotification.warning(`Đã kiểm kê ${successCount} sản phẩm, ${failCount} sản phẩm thất bại`);
        errors.forEach(err => ToastNotification.error(err));
      }

      handleCloseStockCount();
      setSelectedProducts([]);
      setSelectAll(false);
      loadInventory();
    } catch (error) {
      ToastNotification.error('Lỗi kết nối: ' + error.message);
    } finally {
      setProcessingStockCount(false);
    }
  };

  const handleOpenCreateOrder = () => {
    if (!selectedProducts.length) {
      ToastNotification.warning('Vui lòng chọn ít nhất 1 sản phẩm');
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

      const hasPackageUnit = Boolean(item.package_conversion && item.package_unit_label);

      groupedBySupplier[supplierId].items.push({
        inventory_id: item.warehouse_inventory_id || item.inventory_id,
        product_id: item.product?.product_id,
        product_name: item.product?.name || '',
        sku: item.product?.sku || '',
        quantity: 1,
        unit_price: '',
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
      ToastNotification.warning(`${productsWithoutSupplier.length} sản phẩm không có nhà cung cấp và sẽ bị bỏ qua`);
    }

    const supplierGroups = Object.values(groupedBySupplier);

    if (supplierGroups.length === 0) {
      ToastNotification.error('Không có sản phẩm nào có nhà cung cấp');
      return;
    }

    setOrderItems(supplierGroups);
    setOrderData({ expected_delivery: '', notes: '' });
    setSkuInput('');
    setCreateOrderDialog(true);
  };

  const handleCloseCreateOrder = () => setCreateOrderDialog(false);

  const handleOrderItemChange = (supplierIndex, itemIndex, field, value) => {
    const next = [...orderItems];
    next[supplierIndex].items[itemIndex][field] = value;
    setOrderItems(next);
  };

  const handleRemoveOrderItem = (supplierIndex, itemIndex) => {
    const next = [...orderItems];
    const removedItem = next[supplierIndex].items[itemIndex];
    next[supplierIndex].items = next[supplierIndex].items.filter((_, i) => i !== itemIndex);

    // Remove supplier group if no items left
    if (next[supplierIndex].items.length === 0) {
      next.splice(supplierIndex, 1);
    }

    setOrderItems(next);

    // Bỏ chọn sản phẩm tương ứng trong danh sách tồn kho
    if (removedItem) {
      setSelectedProducts(prevSelected => {
        const updated = prevSelected.filter(p => {
          const invId = p.warehouse_inventory_id || p.inventory_id;
          if (removedItem.inventory_id) {
            return invId !== removedItem.inventory_id;
          }
          // Fallback so sánh theo product_id nếu không có inventory_id
          return p.product?.product_id !== removedItem.product_id;
        });

        setSelectAll(updated.length > 0 && updated.length === inventory.length);
        return updated;
      });
    }
  };

  const handleAddProductBySku = () => {
    const sku = skuInput.trim();
    if (!sku) {
      ToastNotification.warning('Vui lòng nhập SKU sản phẩm');
      return;
    }

    const inventoryItem = inventory.find(
      inv => String(inv.product?.sku || '').toLowerCase() === sku.toLowerCase()
    );

    if (!inventoryItem) {
      ToastNotification.error(`Không tìm thấy sản phẩm với SKU: ${sku}`);
      return;
    }

    const supplierId = inventoryItem.product?.supplier?.supplier_id;
    const supplierName = inventoryItem.product?.supplier?.name;

    if (!supplierId) {
      ToastNotification.error('Sản phẩm này chưa được gán nhà cung cấp');
      return;
    }

    setOrderItems(prevOrderItems => {
      const next = [...prevOrderItems];
      const hasPackageUnit = Boolean(
        inventoryItem.package_conversion && inventoryItem.package_unit_label
      );

      let group = next.find(
        g => Number(g.supplier_id) === Number(supplierId)
      );

      if (!group) {
        group = {
          supplier_id: supplierId,
          supplier_name: supplierName,
          items: []
        };
        next.push(group);
      }

      const existingIndex = group.items.findIndex(
        it => it.product_id === inventoryItem.product?.product_id
      );

      if (existingIndex !== -1) {
        const currentQty = Number(group.items[existingIndex].quantity) || 0;
        group.items[existingIndex].quantity = currentQty + 1;
      } else {
        group.items.push({
          inventory_id: inventoryItem.warehouse_inventory_id || inventoryItem.inventory_id,
          product_id: inventoryItem.product?.product_id,
          product_name: inventoryItem.product?.name || '',
          sku: inventoryItem.product?.sku || '',
          quantity: 1,
          unit_price: '',
          unit_id: inventoryItem.product?.base_unit_id || null,
          base_unit_label: inventoryItem.product?.base_unit_label || '',
          stock: inventoryItem.stock || 0,
          stock_in_packages: inventoryItem.stock_in_packages || null,
          package_unit_label: inventoryItem.package_unit_label || null,
          package_conversion: inventoryItem.package_conversion || null,
          use_package_unit: hasPackageUnit
        });
      }

      return next;
    });

    // Đảm bảo sản phẩm được chọn trong danh sách tồn kho
    setSelectedProducts(prevSelected => {
      const id = inventoryItem.warehouse_inventory_id || inventoryItem.inventory_id;
      const exists = prevSelected.some(
        p => (p.warehouse_inventory_id || p.inventory_id) === id
      );
      if (exists) return prevSelected;
      const updated = [...prevSelected, inventoryItem];
      setSelectAll(updated.length > 0 && updated.length === inventory.length);
      return updated;
    });

    setSkuInput('');
  };

  const handleSubmitOrder = async () => {
    if (!orderItems.length) return ToastNotification.error('Phiếu nhập hàng phải có ít nhất 1 nhà cung cấp');

    // Validate all items
    for (const group of orderItems) {
      if (!group.items.length) {
        return ToastNotification.error(`Nhà cung cấp ${group.supplier_name} không có sản phẩm nào`);
      }

      for (const item of group.items) {
        if (!item.quantity || Number(item.quantity) <= 0) {
          return ToastNotification.error(`Số lượng phải > 0: ${item.product_name}`);
        }
        if (!item.unit_price || Number(item.unit_price) <= 0) {
          return ToastNotification.error(`Đơn giá phải > 0: ${item.product_name}`);
        }
      }
    }

    setCreatingOrder(true);
    try {
      // Prepare batch payload
      const payload = {
        orders: orderItems.map((group, groupIdx) => ({
          supplier_id: Number(group.supplier_id),
          items: group.items.map((item, itemIdx) => {
            const baseQuantity = toBaseQuantity(item);
            const baseUnitPrice = toBaseUnitPrice(item);

            // Đảm bảo unit_price là số hợp lệ và không quá lớn
            const finalUnitPrice = baseUnitPrice && !isNaN(baseUnitPrice) && isFinite(baseUnitPrice)
              ? Number(baseUnitPrice.toFixed(2))
              : 0;

            // Validate và log chi tiết
            if (baseQuantity <= 0) {
              console.warn(`Số lượng không hợp lệ cho ${item.product_name}:`, baseQuantity);
            }
            if (finalUnitPrice <= 0) {
              console.warn(`Đơn giá không hợp lệ cho ${item.product_name}:`, finalUnitPrice);
            }
            if (finalUnitPrice > 100000000) {
              console.warn(`Đơn giá quá lớn cho ${item.product_name}:`, finalUnitPrice);
            }

            const subtotal = baseQuantity * finalUnitPrice;
            if (subtotal > 100000000) {
              console.warn(`Thành tiền quá lớn cho ${item.product_name}:`, subtotal);
            }

            return {
              product_id: item.product_id,
              quantity: baseQuantity,
              unit_price: finalUnitPrice,
              unit_id: item.unit_id
            };
          })
        }))
      };

      // Chỉ gửi kèm ngày giao hàng & ghi chú nếu có giá trị
      if (orderData.expected_delivery) {
        payload.expected_delivery = orderData.expected_delivery;
      }
      if (orderData.notes && orderData.notes.trim()) {
        payload.notes = orderData.notes.trim();
      }

      // Debug: Log payload để kiểm tra
      console.log('Payload gửi đi:', JSON.stringify(payload, null, 2));

      const res = await createBatchWarehouseOrders(payload);

      // Debug: Log response để xem lỗi chi tiết
      console.log('Response từ API:', res);

      if (res.err === 0) {
        const { successCount, failCount } = res.data;

        if (failCount === 0) {
          ToastNotification.success(`Đã tạo thành công ${successCount} phiếu nhập hàng cho ${successCount} nhà cung cấp`);
        } else {
          ToastNotification.warning(`Đã tạo ${successCount} phiếu nhập hàng thành công, ${failCount} phiếu nhập hàng thất bại`);

          // Show details of failed orders
          if (res.data.failed && res.data.failed.length > 0) {
            res.data.failed.forEach(fail => {
              const supplierGroup = orderItems[fail.index];
              ToastNotification.error(`Lỗi tạo đơn cho ${supplierGroup?.supplier_name}: ${fail.error}`);
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
        // Hiển thị lỗi chi tiết từ backend
        const errorMsg = res.msg || res.message || 'Không thể tạo phiếu nhập hàng';
        console.error('Lỗi tạo phiếu nhập hàng:', res);
        ToastNotification.error(errorMsg);

        // Kiểm tra data.failed nếu có (khi backend trả về lỗi nhưng vẫn có cấu trúc data)
        if (res.data && res.data.failed && Array.isArray(res.data.failed) && res.data.failed.length > 0) {
          res.data.failed.forEach((fail, idx) => {
            const supplierIndex = fail.index !== undefined ? fail.index : idx;
            const supplierGroup = orderItems[supplierIndex];
            const supplierName = supplierGroup?.supplier_name || `Nhà cung cấp ${supplierIndex + 1}`;
            const failReason = fail.error || fail.message || fail.reason || 'Lỗi không xác định';
            console.error(`Lỗi chi tiết cho ${supplierName}:`, fail);
            ToastNotification.error(`${supplierName}: ${failReason}`);
          });
        }

        // Nếu có thông tin lỗi chi tiết từ validation, hiển thị thêm
        if (res.errors && Array.isArray(res.errors)) {
          res.errors.forEach(err => {
            ToastNotification.error(err.message || err);
          });
        }
      }
    } catch (e) {
      ToastNotification.error('Lỗi kết nối: ' + e.message);
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
        search: debouncedSearch
      });

      if (response.err === 0) {
        setInventory(response.data.inventory);
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

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, debouncedSearch]);

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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            <Icon name="Inventory" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quản lý Tồn Kho Tổng
          </Typography>
          <Typography color="text.secondary">
            Theo dõi và quản lý tồn kho của tất cả chi nhánh
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <PrimaryButton
            startIcon={<Icon name="Inventory2" />}
            onClick={handleOpenStockCount}
            variant="outlined"
          >
            Kiểm kê tồn kho{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
          </PrimaryButton>
          <PrimaryButton
            startIcon={<Icon name="ShoppingCart" />}
            onClick={handleOpenCreateOrder}
          >
            Tạo Phiếu Nhập Hàng{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
          </PrimaryButton>
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
                <TableCell sx={{ fontWeight: 700, width: 50 }}>STT</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                {/* <TableCell sx={{ fontWeight: 700 }} align="right">Tồn kho (lẻ)</TableCell> */}
                <TableCell sx={{ fontWeight: 700 }} align="right">Quy đổi (thùng)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tồn tối thiểu / Điểm đặt hàng</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
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
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.product?.sku}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600}>{item.product?.name}</Typography>
                            {item.product?.is_perishable !== undefined && (
                              <Chip
                                size="small"
                                color={item.product.is_perishable ? 'warning' : 'default'}
                                label={item.product.is_perishable ? 'Tươi sống' : 'Thường'}
                              />
                            )}
                          </Stack>
                          {item.product?.description && (
                            <Typography variant="caption" color="text.secondary">
                              {item.product.description}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.product?.category?.name || 'N/A'} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatQty(item.stock_in_packages ?? 0)}{' '}
                          {item.package_unit_label || 'Thùng'}
                        </Typography>
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
            <Typography variant="h6">Tạo Phiếu Nhập Hàng</Typography>
            <Chip
              label={`${orderItems.length} nhà cung cấp`}
              color="primary"
              size="small"
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, mt: 1, mb: 2 }} variant="outlined">
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Thêm sản phẩm vào phiếu nhập bằng SKU
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Nhập SKU sản phẩm"
                placeholder="VD: SP001..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProductBySku();
                  }
                }}
              />
              <PrimaryButton
                onClick={handleAddProductBySku}
                disabled={!skuInput.trim()}
              >
                Thêm vào phiếu nhập
              </PrimaryButton>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Khi nhập đúng SKU, sản phẩm sẽ được tự động thêm vào đơn của nhà cung cấp tương ứng.
            </Typography>
          </Paper>

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
                            {item.stock_in_packages && item.package_unit_label ? (
                              <Typography variant="body2" fontWeight={600}>
                                {formatQty(item.stock_in_packages)} {item.package_unit_label}
                              </Typography>
                            ) : (
                              <Typography variant="body2" fontWeight={600}>
                                {formatQty(item.stock)} {item.base_unit_label}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack alignItems="flex-end" spacing={1}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Chỉ cho phép số nguyên
                                  const intVal = val === '' ? '' : Math.floor(Math.abs(Number(val)));
                                  handleOrderItemChange(supplierIndex, itemIndex, 'quantity', intVal);
                                }}
                                sx={{ width: 130 }}
                                placeholder="Nhập số lượng"
                                slotProps={{
                                  input: {
                                    inputProps: { min: 1, step: 1 },
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
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ minWidth: 100 }}>
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <TextField
                                type="number"
                                size="small"
                                value={item.unit_price}
                                onChange={(e) => handleOrderItemChange(supplierIndex, itemIndex, 'unit_price', e.target.value)}
                                sx={{ width: 180 }}
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
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600}>
                              {formatVnd(getDisplaySubtotal(item))}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <ActionButton
                              icon={<Icon name="Delete" />}
                              action="delete"
                              size="small"
                              onClick={() => handleRemoveOrderItem(supplierIndex, itemIndex)}
                            />
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
                <Typography variant="h6">Tổng cộng tất cả phiếu nhập hàng</Typography>
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
          <SecondaryButton onClick={handleCloseCreateOrder}>Hủy</SecondaryButton>
          <PrimaryButton
            onClick={handleSubmitOrder}
            disabled={creatingOrder || orderItems.length === 0}
            loading={creatingOrder}
          >
            Tạo {orderItems.length} Phiếu Nhập Hàng
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Stock Count Dialog */}
      <Dialog open={stockCountDialog} onClose={handleCloseStockCount} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Kiểm kê tồn kho</Typography>
            <Chip
              label={`${stockCountItems.length} sản phẩm`}
              color="primary"
              size="small"
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Sản phẩm</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tồn kho hệ thống</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng thực tế</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Chênh lệch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Xóa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockCountItems.map((item, index) => {
                  const difference = item.actual_stock - item.system_stock;
                  const diffColor = difference > 0 ? 'success.main' : difference < 0 ? 'error.main' : 'text.secondary';
                  const hasPackageUnit =
                    item.package_conversion && item.package_conversion > 0 && item.package_unit_label;
                  const displayDifference = hasPackageUnit
                    ? difference / item.package_conversion
                    : difference;
                  const displayUnitLabel = hasPackageUnit
                    ? item.package_unit_label
                    : item.base_unit_label;

                  return (
                    <TableRow key={item.inventory_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{item.product_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.sku}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.package_conversion && item.package_unit_label && item.stock_in_packages != null ? (
                          <Typography variant="body2">
                            {formatQty(item.stock_in_packages)} {item.package_unit_label}
                          </Typography>
                        ) : (
                          <Typography variant="body2">
                            {formatQty(item.system_stock)} {item.base_unit_label}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.package_conversion ? (item.actual_input ?? item.stock_in_packages ?? '') : item.actual_stock}
                          onChange={(e) => handleStockCountChange(index, 'actual_input', e.target.value)}
                          sx={{ width: 180 }}
                          slotProps={{
                            input: {
                              inputProps: { min: 0, step: 1 },
                              endAdornment: (
                                <InputAdornment position="end">
                                  {item.package_conversion && item.package_unit_label
                                    ? item.package_unit_label
                                    : item.base_unit_label}
                                </InputAdornment>
                              )
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={diffColor}
                        >
                          {difference > 0 ? '+' : ''}{formatQty(displayDifference)} {displayUnitLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={1}
                          placeholder="Ghi chú cho sản phẩm này (tùy chọn)"
                          value={item.note || ''}
                          onChange={(e) => handleStockNoteChange(index, e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <ActionButton
                          icon={<Icon name="Delete" />}
                          action="delete"
                          size="small"
                          onClick={() => handleRemoveStockCountItem(index)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <SecondaryButton onClick={handleCloseStockCount} disabled={processingStockCount}>
            Hủy
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSubmitStockCount}
            disabled={processingStockCount || stockCountItems.length === 0}
            loading={processingStockCount}
          >
            Xác nhận kiểm kê
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryList;
