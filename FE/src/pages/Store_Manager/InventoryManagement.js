// src/pages/Store_Manager/InventoryManagement.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  InputAdornment,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Refresh, Add, Edit } from '@mui/icons-material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import { PrimaryButton, SecondaryButton, ActionButton, ToastNotification, Icon } from '../../components/common';
import { createWarehouseOrder } from '../../api/warehouseOrderApi';
import { getStoreInventory, updateInventoryStock } from '../../api/inventoryApi';
import { createStoreOrder } from '../../api/storeOrderApi';
import { getAllPricingRules } from '../../api/productApi';

// Old columns definition - kept for exportCsv function
const oldColumns = [
  { key: 'select', label: '' },
  { key: 'sku', label: 'Mã SKU' },
  { key: 'name', label: 'Tên hàng' },
  { key: 'category', label: 'Danh mục' },
  { key: 'price', label: 'Giá nhập/thùng' },
  { key: 'unitPrice', label: 'Giá lẻ/đơn vị' },
  { key: 'minStock', label: 'Tồn tối thiểu/Điểm đặt hàng' },
  { key: 'status', label: 'Trạng thái' }
];

const formatVnd = (n) => n.toLocaleString('vi-VN');

const emptyLine = () => ({ sku: '', name: '', qty: 1, price: 0 });

// Chuyển đổi giá trị sang đơn vị lớn (thùng) nếu có package_conversion
const convertToPackageUnit = (value, packageConversion) => {
  if (!packageConversion || packageConversion <= 0) {
    return value;
  }
  return value / packageConversion;
};

// Format số lượng với 2 chữ số thập phân
const formatQty = (value) =>
  Number(value ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

// Status constants - tham khảo từ InventoryList.js
const statusColors = {
  normal: 'success',
  low: 'warning',
  critical: 'error',
  out_of_stock: 'default'
};

const statusLabels = {
  normal: 'Đủ hàng',
  low: 'Cần nhập hàng',
  critical: 'Gần hết',
  out_of_stock: 'Hết hàng'
};

const statusIcons = {
  normal: <Icon name="CheckCircle" fontSize="small" />,
  low: <Icon name="Warning" fontSize="small" />,
  critical: <Icon name="Error" fontSize="small" />,
  out_of_stock: <Icon name="Error" fontSize="small" />
};

// Hàm tính toán trạng thái tồn kho - so sánh với tồn đơn vị lớn
// Logic: Nếu vượt ngưỡng điểm đặt hàng thì là đủ hàng
// minStock và reorderPoint là giá trị base_quantity, cần chuyển sang đơn vị lớn để so sánh
const getStockStatus = (stock, minStock, reorderPoint, packageConversion) => {
  // Chuyển tất cả sang đơn vị lớn để so sánh
  const stockInPackage = convertToPackageUnit(Number(stock || 0), packageConversion);
  const minStockInPackage = convertToPackageUnit(Number(minStock || 0), packageConversion);
  const reorderPointInPackage = convertToPackageUnit(Number(reorderPoint || 0), packageConversion);

  // Hết hàng
  if (stockInPackage === 0) {
    return 'out_of_stock';
  }

  // Nếu vượt ngưỡng điểm đặt hàng → Đủ hàng
  if (reorderPointInPackage > 0 && stockInPackage > reorderPointInPackage) {
    return 'normal';
  }

  // Nếu không có điểm đặt hàng, dùng minStock * 1.5 làm ngưỡng
  if (reorderPointInPackage === 0 && stockInPackage > minStockInPackage * 1.5) {
    return 'normal';
  }

  // Nếu <= điểm đặt hàng nhưng > tồn tối thiểu → Cần nhập hàng
  if (stockInPackage > minStockInPackage) {
    return 'low';
  }

  // Nếu <= tồn tối thiểu → Gần hết
  return 'critical';
};

const InventoryManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [openCreateOrderModal, setOpenCreateOrderModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailMinStock, setDetailMinStock] = useState('');
  const [detailReorderPoint, setDetailReorderPoint] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);

  // Khôi phục dữ liệu đơn nhập từ localStorage khi component mount (chỉ đọc một lần)
  const getInitialOrderData = (() => {
    let cached = null;
    return () => {
      if (cached !== null) return cached;
      try {
        const stored = localStorage.getItem('inventory_order_draft');
        if (stored) {
          const parsed = JSON.parse(stored);
          cached = {
            target: parsed.target || 'Main Warehouse',
            supplier: parsed.supplier || 'Coca-Cola',
            lines: parsed.lines && parsed.lines.length > 0 ? parsed.lines : [emptyLine()],
            perishable: parsed.perishable || false,
            storageType: parsed.storageType || 'stored'
          };
          return cached;
        }
      } catch (error) {
        console.error('Error loading stored order data:', error);
      }
      cached = {
        target: 'Main Warehouse',
        supplier: 'Coca-Cola',
        lines: [emptyLine()],
        perishable: false,
        storageType: 'stored'
      };
      return cached;
    };
  })();

  const initialData = getInitialOrderData();
  const [target, setTarget] = useState(initialData.target);
  const [supplier, setSupplier] = useState(initialData.supplier);
  const [lines, setLines] = useState(initialData.lines);
  const [submitting, setSubmitting] = useState(false);
  const [perishable, setPerishable] = useState(initialData.perishable);
  const [storageType, setStorageType] = useState(initialData.storageType || 'stored'); // 'stored' hoặc 'direct'

  // Active pricing rules map: product_id -> active rule
  const [activePricingRules, setActivePricingRules] = useState({});
  const skuOptions = useMemo(() => (data || []).map((i) => i.sku).filter(Boolean), [data]);
  const nameOptions = useMemo(() => (data || []).map((i) => i.name).filter(Boolean), [data]);

  // Get store_id from localStorage or user context
  const getStoreId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.store_id || null;
      }
    } catch (error) {
      console.error('Error getting store_id:', error);
    }
    return null;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const storeId = getStoreId();
      // Get store_id from user if available, otherwise pass null to use user's store
      const items = await getStoreInventory(storeId);
      setData(items || []);

      // Load active pricing rules for current store
      if (storeId) {
        try {
          const pricingRulesRes = await getAllPricingRules({ store_id: storeId, status: 'active' });
          if (pricingRulesRes.err === 0) {
            const rulesMap = {};
            (pricingRulesRes.data || []).forEach(rule => {
              if (rule.product_id && rule.status === 'active') {
                rulesMap[rule.product_id] = rule;
              }
            });
            setActivePricingRules(rulesMap);
          }
        } catch (error) {
          console.error('Error loading active pricing rules:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Lưu dữ liệu đơn nhập vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      const orderData = {
        target,
        supplier,
        lines,
        perishable,
        storageType
      };
      localStorage.setItem('inventory_order_draft', JSON.stringify(orderData));
    } catch (error) {
      console.error('Error saving order data to localStorage:', error);
    }
  }, [lines, target, supplier, perishable, storageType]);

  // Keep selection in sync with current data
  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(data.map(r => String(r.inventory_id || r.sku)));
      const next = new Set();
      prev.forEach(id => { if (ids.has(id)) next.add(id); });
      return next;
    });
  }, [data]);

  const rowId = (row) => String(row.inventory_id || row.sku);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    (data || []).forEach((row) => {
      const cat = row.category || row.category_name;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [data]);

  const filtered = useMemo(() => {
    let list = !query
      ? [...data]
      : data.filter((i) => (i.name || '').toLowerCase().includes(query.toLowerCase()) || (i.sku || '').toLowerCase().includes(query.toLowerCase()));

    if (categoryFilter) {
      list = list.filter((i) => {
        const cat = i.category || i.category_name;
        return cat === categoryFilter;
      });
    }

    if (statusFilter) {
      list = list.filter((i) => {
        const stock = Number(i.stock || 0);
        const minStock = Number(i.min_stock_level || i.minStock || 0);
        const reorderPoint = Number(i.reorder_point || i.reorderPoint || 0);
        const packageConversion = Number(i.package_conversion || 0);
        const stockStatus = getStockStatus(stock, minStock, reorderPoint, packageConversion);
        return stockStatus === statusFilter;
      });
    }

    // sort by remaining ratio: stock / target (target = reorder_point || min*2 || 10)
    const ratio = (row) => {
      const stock = Number(row.stock || 0);
      const min = Number(row.min_stock_level || row.minStock || 0);
      const reorder = Number(row.reorder_point || row.reorderPoint || 0);
      const target = reorder || (min * 2) || 10;
      if (target <= 0) return 1; // avoid zero; treat as full
      return stock / target;
    };
    return list.sort((a, b) => {
      const ra = ratio(a);
      const rb = ratio(b);
      if (ra !== rb) return ra - rb; // smaller ratio first (more urgent)
      // tie-break: lower absolute stock first, then by name
      const sa = Number(a.stock || 0);
      const sb = Number(b.stock || 0);
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [data, query, categoryFilter, statusFilter]);

  const allVisibleIds = useMemo(() => filtered.map(rowId), [filtered]);
  const selectedCountInView = useMemo(() => allVisibleIds.filter(id => selected.has(id)).length, [allVisibleIds, selected]);
  const allInViewSelected = allVisibleIds.length > 0 && selectedCountInView === allVisibleIds.length;
  const someInViewSelected = selectedCountInView > 0 && !allInViewSelected;

  const toggleAllInView = (checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) allVisibleIds.forEach(id => next.add(id));
      else allVisibleIds.forEach(id => next.delete(id));
      return next;
    });
  };
  const computeSuggestedQty = (row) => {
    const stock = Number(row.stock || 0);
    const min = Number(row.min_stock_level || row.minStock || 0);
    const reorder = Number(row.reorder_point || row.reorderPoint || 0);
    const target = reorder || (min * 2) || 10; // fallback 10
    const qty = Math.max(target - stock, 1);
    return qty;
  };

  const clearSelectionForLine = (line) => {
    const sku = (line.sku || '').trim();
    const name = (line.name || '').trim();
    if (!sku && !name) return;
    const invRow = data.find(
      (r) =>
        (r.sku && r.sku === sku) ||
        (r.name && r.name === name)
    );
    if (!invRow) return;
    const invId = rowId(invRow);
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(invId);
      return next;
    });
  };

  const toggleOne = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

    if (checked) {
      const row = filtered.find(r => rowId(r) === id) || data.find(r => rowId(r) === id);
      if (row) {
        const isPerishable = !!(row.is_perishable || row.product?.is_perishable);

        // Kiểm tra xem đã có sản phẩm loại khác trong đơn chưa
        const currentLines = lines.filter(l => (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== ''));
        if (currentLines.length > 0) {
          const hasOtherType = currentLines.some((l) => {
            const sku = (l.sku || '').trim();
            const name = (l.name || '').trim();
            if (!sku && !name) return false;
            const invRow = data.find(
              (r) =>
                (r.sku && r.sku === sku) ||
                (r.name && r.name === name)
            );
            const otherIsPerishable = !!(invRow?.is_perishable || invRow?.product?.is_perishable);
            return otherIsPerishable !== isPerishable;
          });

          if (hasOtherType) {
            ToastNotification.error('Không được nhập chung hàng tươi sống với hàng thường. Vui lòng tách riêng thành 2 đơn hàng.');
            // Không thêm sản phẩm này vào đơn
            setSelected(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            return;
          }
        }

        const quantity = computeSuggestedQty(row);
        // Push into 'Tạo đơn hàng mới' draft instead of sending API immediately
        setLines(prev => {
          // Xóa các dòng trống trước khi thêm sản phẩm mới
          const filteredLines = prev.filter(l => !(l.sku === '' && l.name === ''));

          const sku = row.sku || '';
          const name = row.name || '';
          // Tự động lấy giá nhập từ package_price (giá nhập/thùng)
          const price = Number(row.package_price ?? 0);
          const idx = filteredLines.findIndex(l => l.sku === sku);
          if (idx >= 0) {
            const updated = [...filteredLines];
            updated[idx] = {
              ...updated[idx],
              qty: Number(updated[idx].qty || 0) + quantity,
              // Nếu chưa có giá hoặc giá = 0, cập nhật từ package_price
              price: (price > 0) ? price : (updated[idx].price || 0)
            };
            return updated;
          }
          return [...filteredLines, { sku, name, qty: quantity, price }];
        });
        // Không mở modal ngay, chỉ thông báo đã thêm
        ToastNotification.info(`Đã thêm ${row.name} (SL gợi ý: ${quantity}) vào đơn nháp`);
      }
    }
  };

  // Định nghĩa cột cho MaterialReactTable
  const tableColumns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          indeterminate={someInViewSelected}
          checked={allInViewSelected}
          onChange={(e) => toggleAllInView(e.target.checked)}
          inputProps={{ 'aria-label': 'chọn tất cả' }}
          size="small"
        />
      ),
      size: 40,
      Cell: ({ row }) => (
        <Checkbox
          checked={selected.has(rowId(row.original))}
          onChange={(e) => toggleOne(rowId(row.original), e.target.checked)}
          inputProps={{ 'aria-label': 'chọn sản phẩm' }}
          size="small"
        />
      ),
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      accessorKey: 'index',
      header: 'STT',
      size: 45,
      Cell: ({ row }) => row.index + 1,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'sku',
      header: 'Mã SKU',
      size: 90,
    },
    {
      accessorKey: 'name',
      header: 'Tên hàng',
      size: 150,
      Cell: ({ row }) => {
        const original = row.original;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography>{original.name}</Typography>

          </Box>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Danh mục',
      size: 120,
    },
    {
      accessorKey: 'stock_big_unit',
      header: 'Tồn (đơn vị lớn)',
      size: 120,
      Cell: ({ row }) => {
        const baseQuantity = Number(row.original.base_quantity || row.original.stock || 0);
        const conv = Number(row.original.package_conversion || 0);
        if (!conv || conv <= 0) {
          return '-';
        }
        const bigQty = Math.floor(baseQuantity / conv);
        const unitLabel = row.original.package_unit || '';
        return `${bigQty} ${unitLabel}`.trim();
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'stock_small_unit',
      header: 'Tồn (đơn vị nhỏ)',
      size: 120,
      Cell: ({ row }) => {
        const baseQuantity = Number(row.original.base_quantity || row.original.stock || 0);
        const baseUnitLabel = row.original.unit || '';
        return `${baseQuantity} ${baseUnitLabel}`.trim();
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'selling_price',
      header: 'Giá bán',
      size: 100,
      Cell: ({ row }) => {
        const item = row.original;
        // Lấy giá từ pricing rule active, nếu không có thì dùng giá nhập
        const activeRule = activePricingRules[item.product_id];
        if (activeRule && activeRule.value) {
          return `${formatVnd(Number(activeRule.value) || 0)}đ`;
        }
        // Mặc định là giá nhập
        return `${formatVnd(Number(item.latest_import_price) || 0)}đ`;
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'min_stock_level',
      header: 'Tồn tối thiểu/Điểm đặt hàng',
      size: 120,
      Cell: ({ row }) => {
        const minStock = Number(row.original.min_stock_level || row.original.minStock || 0);
        const reorderPoint = Number(row.original.reorder_point || row.original.reorderPoint || 0);
        const packageConversion = Number(row.original.package_conversion || 0);

        // Chuyển đổi sang đơn vị lớn nếu có package_conversion
        if (packageConversion && packageConversion > 0) {
          const minStockInPackage = convertToPackageUnit(minStock, packageConversion);
          const reorderPointInPackage = convertToPackageUnit(reorderPoint, packageConversion);
          const unitLabel = row.original.package_unit || 'Thùng';
          return `${formatQty(minStockInPackage)} / ${formatQty(reorderPointInPackage)} ${unitLabel}`;
        }

        // Nếu không có đơn vị lớn thì hiển thị theo đơn vị cơ sở
        const unitLabel = row.original.unit || '';
        return `${formatQty(minStock)} / ${formatQty(reorderPoint)} ${unitLabel}`.trim();
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      size: 120,
      Cell: ({ row }) => {
        const stock = row.original.stock || 0;
        const minStock = row.original.min_stock_level || row.original.minStock || 0;
        const reorderPoint = row.original.reorder_point || row.original.reorderPoint || 0;
        const packageConversion = Number(row.original.package_conversion || 0);
        const stockStatus = getStockStatus(stock, minStock, reorderPoint, packageConversion);
        return (
          <Chip
            size="small"
            icon={statusIcons[stockStatus]}
            label={statusLabels[stockStatus]}
            color={statusColors[stockStatus]}
          />
        );
      },
      enableColumnFilter: false,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      size: 60,
      Cell: ({ row }) => {
        const original = row.original;
        return (
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                setDetailItem(original);
                const minStockBase = Number(original.min_stock_level || original.minStock || 0);
                const reorderPointBase = Number(original.reorder_point || original.reorderPoint || 0);
                const packageConversion = Number(original.package_conversion || 0);

                // Chuyển đổi từ base_quantity sang đơn vị lớn để hiển thị
                if (packageConversion && packageConversion > 0) {
                  const minStockInPackage = convertToPackageUnit(minStockBase, packageConversion);
                  const reorderPointInPackage = convertToPackageUnit(reorderPointBase, packageConversion);
                  setDetailMinStock(formatQty(minStockInPackage));
                  setDetailReorderPoint(formatQty(reorderPointInPackage));
                } else {
                  // Nếu không có đơn vị lớn thì hiển thị theo đơn vị cơ sở
                  setDetailMinStock(String(minStockBase));
                  setDetailReorderPoint(String(reorderPointBase));
                }
                setDetailOpen(true);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
      enableColumnFilter: false,
      enableSorting: false,
    },
  ], [selected, toggleOne, allInViewSelected, someInViewSelected, toggleAllInView, activePricingRules]);

  // Order management functions
  const addLine = () => {
    setLines(prev => {
      const filtered = prev.filter(l => (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== ''));
      return [...filtered, emptyLine()];
    });
  };
  const removeLine = (idx) => {
    let removedLine = null;
    setLines(prev => {
      removedLine = prev[idx] || null;
      return prev.filter((_, i) => i !== idx);
    });
    if (removedLine) {
      clearSelectionForLine(removedLine);
    }
  };
  const updateLine = (idx, key, val) => {
    let removedLineForQtyZero = null;
    setLines(prev => {
      // If updating quantity and it becomes <= 0, remove this line
      if (key === 'qty') {
        // Cho phép để trống (chưa nhập) -> không xóa dòng
        if (val === '' || val === null || val === undefined) {
          return prev.map((l, i) => i === idx ? { ...l, qty: '' } : l);
        }

        const qtyNum = Number(val);
        // Cho phép để trống (chưa nhập) -> không xóa dòng
        if (!Number.isFinite(qtyNum)) {
          return prev.map((l, i) => i === idx ? { ...l, qty: val } : l);
        }
        // Chỉ xóa khi người dùng nhập đúng 0
        if (qtyNum === 0) {
          removedLineForQtyZero = prev[idx] || null;
          return prev.filter((_, i) => i !== idx);
        }
      }
      const updated = prev.map((l, i) => i === idx ? { ...l, [key]: val } : l);

      // Khi nhập SKU hoặc tên hàng, kiểm tra loại hàng và validation, tự động điền giá nhập
      if (key === 'sku' || key === 'name') {
        const currentLine = updated[idx];
        const hasData = (currentLine.sku && currentLine.sku.trim() !== '') ||
          (currentLine.name && currentLine.name.trim() !== '');

        if (hasData) {
          // Kiểm tra xem sản phẩm này là hàng tươi sống hay không
          const sku = (currentLine.sku || '').trim();
          const name = (currentLine.name || '').trim();
          const invRow = data.find(
            (r) =>
              (r.sku && r.sku === sku) ||
              (r.name && r.name === name)
          );
          const isPerishable = !!(invRow?.is_perishable || invRow?.product?.is_perishable);

          // Tự động điền giá nhập từ package_price (giá nhập/thùng)
          if (invRow) {
            const packagePrice = Number(invRow.package_price ?? 0);
            if (packagePrice > 0) {
              updated[idx].price = packagePrice;
            }
          }

          // Kiểm tra xem có sản phẩm loại khác trong đơn không
          const otherLines = updated.filter((l, i) => i !== idx && ((l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== '')));
          const hasOtherType = otherLines.some((l) => {
            const otherSku = (l.sku || '').trim();
            const otherName = (l.name || '').trim();
            if (!otherSku && !otherName) return false;
            const otherInvRow = data.find(
              (r) =>
                (r.sku && r.sku === otherSku) ||
                (r.name && r.name === otherName)
            );
            const otherIsPerishable = !!(otherInvRow?.is_perishable || otherInvRow?.product?.is_perishable);
            return otherIsPerishable !== isPerishable;
          });

          if (hasOtherType) {
            ToastNotification.error('Không được nhập chung hàng tươi sống với hàng thường. Vui lòng tách riêng thành 2 đơn hàng.');
            // Xóa dòng hiện tại vì không hợp lệ
            return updated.filter((_, i) => i !== idx);
          }

          // Giữ dòng hiện tại và các dòng có dữ liệu, xóa các dòng trống khác
          const filtered = updated.filter((l, i) => {
            if (i === idx) return true; // Luôn giữ dòng đang được cập nhật
            // Giữ dòng nếu có dữ liệu (có SKU hoặc tên hàng)
            return (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== '');
          });
          return filtered;
        }
      }
      return updated;
    });
    if (removedLineForQtyZero) {
      clearSelectionForLine(removedLineForQtyZero);
    }
  };

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0), [lines]);

  // Map SKU -> { supplierName, isPerishable } (từ dữ liệu tồn kho hiện có)
  const supplierBySku = useMemo(() => {
    const map = {};
    (data || []).forEach((row) => {
      const sku = row.sku || row.product?.sku;
      const supplierName =
        row.supplier?.name ||
        row.product?.supplier?.name ||
        row.product?.supplier_name ||
        '';
      const isPerishable =
        !!row.is_perishable ||
        !!row.product?.is_perishable;

      if (sku && supplierName) {
        map[String(sku).trim()] = {
          name: supplierName,
          isPerishable
        };
      }
    });
    return map;
  }, [data]);

  // Danh sách nhà cung cấp có trong các dòng hiện tại
  const perishableSuppliers = useMemo(() => {
    const set = new Set();
    lines.forEach((l) => {
      const sku = (l.sku || '').trim();
      if (!sku) return;
      const meta = supplierBySku[sku];
      if (meta?.isPerishable && meta.name) {
        set.add(meta.name);
      }
    });
    return Array.from(set);
  }, [lines, supplierBySku]);

  // Đếm số sản phẩm hợp lệ trong đơn nhập (có SKU hoặc tên hàng)
  const orderItemsCount = useMemo(() => {
    return lines.filter(l => (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== '')).length;
  }, [lines]);

  // Kiểm tra xem có hàng tươi sống trong đơn không
  const hasPerishableInLines = useMemo(() => {
    return lines.some((line) => {
      const sku = (line.sku || '').trim();
      const name = (line.name || '').trim();
      if (!sku && !name) return false;
      const invRow = data.find(
        (row) =>
          (row.sku && row.sku === sku) ||
          (row.name && row.name === name)
      );
      return !!invRow?.is_perishable;
    });
  }, [lines, data]);

  // Kiểm tra xem có hàng thường trong đơn không
  const hasNonPerishableInLines = useMemo(() => {
    return lines.some((line) => {
      const sku = (line.sku || '').trim();
      const name = (line.name || '').trim();
      if (!sku && !name) return false;
      const invRow = data.find(
        (row) =>
          (row.sku && row.sku === sku) ||
          (row.name && row.name === name)
      );
      return !invRow?.is_perishable;
    });
  }, [lines, data]);

  // Khi là đơn hàng tươi sống, đồng bộ state supplier theo danh sách nhà cung cấp thực tế
  useEffect(() => {
    if (perishable) {
      setSupplier(perishableSuppliers.join(', '));
    }
  }, [perishable, perishableSuppliers]);

  // Tự động cập nhật storageType và perishable khi có hàng tươi sống
  useEffect(() => {
    if (hasPerishableInLines) {
      // Nếu có hàng tươi sống, tự động set storageType = 'direct' và perishable = true
      setStorageType('direct');
      setPerishable(true);
    } else if (hasNonPerishableInLines && !hasPerishableInLines) {
      // Nếu chỉ có hàng thường, tự động set storageType = 'stored' và perishable = false
      setStorageType('stored');
      setPerishable(false);
    }
  }, [hasPerishableInLines, hasNonPerishableInLines]);

  const handleCreateOrder = async () => {
    if (lines.length === 0 || lines.every(l => !l.sku && !l.name)) {
      ToastNotification.error('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }
    if (!target || target.trim() === '') {
      ToastNotification.error('Vui lòng nhập tên kho nhận hàng');
      return;
    }

    // Validation: Không cho phép nhập chung hàng tươi sống với hàng thường
    if (hasPerishableInLines && hasNonPerishableInLines) {
      ToastNotification.error('Không được nhập chung hàng tươi sống với hàng thường. Vui lòng tách riêng thành 2 đơn hàng.');
      return;
    }

    // Validation: Hàng tươi sống phải chọn "hàng không lưu kho"
    if (hasPerishableInLines && storageType !== 'direct') {
      ToastNotification.error('Hàng tươi sống phải chọn "Hàng không lưu kho (nhập trực tiếp)"');
      return;
    }

    // Validation: Hàng thường phải chọn "hàng lưu kho"
    if (hasNonPerishableInLines && !hasPerishableInLines && storageType !== 'stored') {
      ToastNotification.error('Hàng thường phải chọn "Hàng lưu kho"');
      return;
    }

    const validItems = [];
    let hasPerishableItem = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if ((!l.sku || l.sku.trim() === '') && (!l.name || l.name.trim() === '') && (!l.qty || l.qty === '') && (!l.price || l.price === '')) {
        continue;
      }
      if (!l.sku || l.sku.trim() === '') {
        ToastNotification.error(`Dòng ${i + 1}: Vui lòng nhập mã SKU`);
        return;
      }
      if (!l.name || l.name.trim() === '') {
        ToastNotification.error(`Dòng ${i + 1}: Vui lòng nhập tên hàng`);
        return;
      }
      const qty = parseInt(l.qty);
      if (isNaN(qty) || qty <= 0) {
        ToastNotification.error(`Dòng ${i + 1}: Số lượng thùng phải lớn hơn 0`);
        return;
      }
      const price = parseFloat(l.price);
      if (isNaN(price) || price <= 0) {
        ToastNotification.error(`Dòng ${i + 1}: Đơn giá mỗi thùng phải lớn hơn 0`);
        return;
      }
      const skuTrimmed = (l.sku || '').trim();
      const nameTrimmed = (l.name || '').trim();

      const invRow = data.find(
        (row) =>
          (row.sku && row.sku === skuTrimmed) ||
          (row.name && row.name === nameTrimmed)
      );
      const isPerishableLine = !!invRow?.is_perishable;
      if (isPerishableLine) {
        hasPerishableItem = true;
      }

      validItems.push({
        sku: skuTrimmed,
        name: nameTrimmed,
        quantity: qty,
        unit_price: price,
        is_perishable: isPerishableLine
      });
    }

    if (validItems.length === 0) {
      ToastNotification.error('Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_type: 'ToWarehouse',
        target_warehouse: target.trim(),
        supplier_id: null,
        items: validItems,
        // Tự động đánh dấu đơn là tươi sống nếu có ít nhất 1 sản phẩm tươi sống
        perishable: hasPerishableItem,
        storage_type: storageType, // 'stored' hoặc 'direct'
        notes: null
      };

      const result = await createStoreOrder(payload);

      if (result.err === 0) {
        ToastNotification.success('Tạo đơn hàng thành công!');
        // Reset đơn nhập
        setLines([]);
        setSelected(new Set());
        setPerishable(false);
        setStorageType('stored');
        setTarget('Main Warehouse');
        setSupplier('Coca-Cola');
        // Xóa dữ liệu đã lưu trong localStorage
        try {
          localStorage.removeItem('inventory_order_draft');
        } catch (error) {
          console.error('Error clearing order data from localStorage:', error);
        }
        setOpenCreateOrderModal(false);
      } else {
        ToastNotification.error('Lỗi: ' + (result.msg || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      ToastNotification.error('Lỗi khi tạo đơn hàng: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMinStock = async () => {
    if (!detailItem) return;
    // Chuẩn hoá inventory_id sang số để tránh gửi sai lên server (gây Missing inventory_id)
    const inventoryIdNum = Number(detailItem.inventory_id);
    const packageConversion = Number(detailItem.package_conversion || 0);

    // Giá trị nhập vào là theo đơn vị lớn (thùng)
    const parsedMinInput = parseFloat(detailMinStock);
    const parsedReorderInput = parseFloat(detailReorderPoint);

    if (isNaN(parsedMinInput) || parsedMinInput < 0) {
      ToastNotification.error('Tồn tối thiểu phải là số không âm');
      return;
    }

    if (isNaN(parsedReorderInput) || parsedReorderInput < 0) {
      ToastNotification.error('Điểm đặt hàng phải là số không âm');
      return;
    }

    if (parsedReorderInput < parsedMinInput) {
      ToastNotification.error('Điểm đặt hàng phải lớn hơn hoặc bằng Tồn tối thiểu');
      return;
    }

    // Kiểm tra nếu inventory_id không hợp lệ (null/undefined/NaN/<=0)
    if (!Number.isInteger(inventoryIdNum) || inventoryIdNum <= 0) {
      ToastNotification.error('Không thể cập nhật: Sản phẩm chưa được đồng bộ tồn kho tại cửa hàng này');
      return;
    }

    // Chuyển đổi từ đơn vị lớn sang base_quantity (đơn vị cơ sở)
    let minStockBase, reorderPointBase;
    if (packageConversion && packageConversion > 0) {
      // Nhân với package_conversion để chuyển về đơn vị cơ sở
      minStockBase = Math.round(parsedMinInput * packageConversion);
      reorderPointBase = Math.round(parsedReorderInput * packageConversion);
    } else {
      // Nếu không có đơn vị lớn thì giữ nguyên
      minStockBase = Math.round(parsedMinInput);
      reorderPointBase = Math.round(parsedReorderInput);
    }

    setDetailSaving(true);
    try {
      const currentStock = Number(detailItem.stock || 0);
      const res = await updateInventoryStock(inventoryIdNum, currentStock, minStockBase, reorderPointBase);
      if (res && res.err === 0) {
        ToastNotification.success('Cập nhật cài đặt tồn kho thành công');
        // Cập nhật lại data tại chỗ
        setData(prev =>
          prev.map(it =>
            (Number(it.inventory_id) === inventoryIdNum)
              ? { ...it, min_stock_level: minStockBase, reorder_point: reorderPointBase }
              : it
          )
        );
        setDetailOpen(false);
        setDetailItem(null);
      } else {
        ToastNotification.error(res?.msg || 'Không thể cập nhật cài đặt tồn kho');
      }
    } catch (error) {
      console.error('Error updating inventory settings:', error);
      ToastNotification.error('Lỗi khi cập nhật cài đặt tồn kho: ' + error.message);
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        mb: 2,
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Quản lý tồn kho
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Theo dõi số lượng tại cửa hàng, cảnh báo thiếu hàng
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {
            <>
              <PrimaryButton
                color="primary"
                size={isMobile ? 'small' : 'medium'}
                onClick={() => {
                  if (selected.size === 0 && orderItemsCount === 0) {
                    ToastNotification.warning('Vui lòng chọn ít nhất một sản phẩm trước khi lên đơn');
                    return;
                  }
                  setOpenCreateOrderModal(true);
                }}
              >
                Lên đơn nhập {orderItemsCount > 0 ? `(${orderItemsCount})` : ''}
              </PrimaryButton>
              <Tooltip title="Xuất CSV">
                <span>
                  <ActionButton
                    icon={<Icon name="Download" />}
                    onClick={() => exportCsv(filtered)}
                    disabled={!filtered.length}
                    size={isMobile ? 'small' : 'medium'}
                    tooltip="Tải xuống"
                  />
                </span>
              </Tooltip>
            </>
          }
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm theo tên hoặc mã SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Danh mục</InputLabel>
            <Select
              value={categoryFilter}
              label="Danh mục"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>Tất cả</em>
              </MenuItem>
              {categoryOptions.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              value={statusFilter}
              label="Trạng thái"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>Tất cả</em>
              </MenuItem>
              <MenuItem value="normal">Đủ hàng</MenuItem>
              <MenuItem value="low">Cần nhập hàng</MenuItem>
              <MenuItem value="critical">Gần hết</MenuItem>
              <MenuItem value="out_of_stock">Hết hàng</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <MaterialReactTable
        columns={tableColumns}
        data={filtered}
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={true}
        enableTopToolbar={false}
        enableBottomToolbar={true}
        enablePagination={true}
        enableRowSelection={false}
        muiTablePaperProps={{
          elevation: 0,
          sx: { boxShadow: 'none' }
        }}
        muiTableHeadCellProps={{
          sx: {
            fontWeight: 700,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            whiteSpace: 'nowrap',
            padding: '6px 8px'
          }
        }}
        muiTableBodyCellProps={{
          sx: {
            padding: '6px 8px',
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
        state={{
          isLoading: loading,
          showProgressBars: loading
        }}
        localization={MRT_Localization_VI}
        initialState={{
          pagination: { pageSize: 10, pageIndex: 0 },
        }}
      />

      {/* Inventory Detail & Min Stock Edit Dialog */}
      <Dialog
        open={detailOpen && !!detailItem}
        onClose={() => !detailSaving && setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa cài đặt tồn kho</DialogTitle>
        <DialogContent dividers>
          {detailItem && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Thông tin sản phẩm
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Mã SKU"
                  value={detailItem.sku || ''}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                />
                <TextField
                  label="Danh mục"
                  value={detailItem.category || detailItem.category_name || ''}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                />
              </Stack>
              <TextField
                label="Tên hàng"
                value={detailItem.name || ''}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: 'action.hover',
                  }
                }}
              />
              <TextField
                label="Tồn kho hiện tại"
                value={Number(detailItem.stock || 0)}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: 'action.hover',
                  }
                }}
              />
              <Typography variant="body2" color="primary" fontWeight={600} sx={{ mt: 1, mb: 0.5 }}>
                Cài đặt tồn kho
              </Typography>
              <TextField
                label="Tồn tối thiểu"
                size="small"
                type="number"
                fullWidth
                value={detailMinStock}
                onChange={(e) => setDetailMinStock(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: detailItem?.package_conversion && detailItem.package_conversion > 0
                    ? <InputAdornment position="end">{detailItem.package_unit || 'Thùng'}</InputAdornment>
                    : <InputAdornment position="end">{detailItem?.unit || ''}</InputAdornment>
                }}
                helperText={
                  detailItem?.package_conversion && detailItem.package_conversion > 0
                    ? `Nhập số lượng tối thiểu theo đơn vị lớn (${detailItem.package_unit || 'Thùng'}). Sẽ tự động chuyển đổi sang đơn vị cơ sở khi lưu.`
                    : 'Nhập số lượng tối thiểu cần duy trì tại cửa hàng'
                }
                focused
              />
              <TextField
                label="Điểm đặt hàng"
                size="small"
                type="number"
                fullWidth
                value={detailReorderPoint}
                onChange={(e) => setDetailReorderPoint(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: detailItem?.package_conversion && detailItem.package_conversion > 0
                    ? <InputAdornment position="end">{detailItem.package_unit || 'Thùng'}</InputAdornment>
                    : <InputAdornment position="end">{detailItem?.unit || ''}</InputAdornment>
                }}
                helperText={
                  detailItem?.package_conversion && detailItem.package_conversion > 0
                    ? `Nhập số lượng điểm đặt hàng theo đơn vị lớn (${detailItem.package_unit || 'Thùng'}). Phải ≥ Tồn tối thiểu. Sẽ tự động chuyển đổi sang đơn vị cơ sở khi lưu.`
                    : 'Nhập số lượng để kích hoạt đặt hàng (phải ≥ Tồn tối thiểu)'
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDetailOpen(false)} disabled={detailSaving}>
            Đóng
          </SecondaryButton>
          <PrimaryButton onClick={handleSaveMinStock} disabled={detailSaving}>
            Lưu
          </PrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog
        open={openCreateOrderModal}
        onClose={() => {
          setOpenCreateOrderModal(false);
          setSelected(new Set());
        }}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Tạo đơn hàng mới
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
              <TextField
                label="Kho nhận"
                size="small"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                sx={{ width: { xs: '100%', sm: 280, md: 320 } }}
              />
              <TextField
                select
                size="small"
                label="Loại hàng"
                value={storageType}
                onChange={(e) => {
                  const newStorageType = e.target.value;
                  setStorageType(newStorageType);
                  // Nếu chọn "hàng không lưu kho", tự động set perishable = true
                  if (newStorageType === 'direct') {
                    setPerishable(true);
                  } else if (newStorageType === 'stored' && !hasPerishableInLines) {
                    setPerishable(false);
                  }
                }}
                sx={{ width: { xs: '100%', sm: 220 } }}
                disabled={hasPerishableInLines && hasNonPerishableInLines}
                helperText={
                  hasPerishableInLines && hasNonPerishableInLines
                    ? 'Không được nhập chung hàng tươi sống với hàng thường'
                    : hasPerishableInLines
                      ? 'Hàng tươi sống phải chọn "Hàng không lưu kho"'
                      : ''
                }
                error={hasPerishableInLines && hasNonPerishableInLines}
              >
                <MenuItem value="stored">Hàng lưu kho</MenuItem>
                <MenuItem value="direct">Hàng không lưu kho (nhập trực tiếp)</MenuItem>
              </TextField>
              {hasPerishableInLines && (
                <TextField
                  label="Nhà cung cấp tươi sống"
                  size="small"
                  value={perishableSuppliers.length ? perishableSuppliers.join(', ') : '—'}
                  InputProps={{ readOnly: true }}
                  helperText={perishableSuppliers.length ? '' : 'Nhập SKU của sản phẩm để hệ thống tự xác định nhà cung cấp'}
                  sx={{ width: { xs: '100%', sm: 260, md: 300 } }}
                />
              )}
            </Stack>
          </Paper>

          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Chi tiết sản phẩm</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nhập số lượng thùng và đơn giá của <strong>1 thùng</strong> cho từng sản phẩm.
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>SKU</TableCell>
                  <TableCell sx={{ minWidth: { xs: 150, sm: 200 } }}>Tên hàng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>Số lượng (thùng)</TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 160 } }}>Đơn giá / thùng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 100 } }}>Thành tiền</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={l.sku}
                        sx={{ width: { xs: 100, sm: 120 } }}
                        onChange={(e) => updateLine(idx, 'sku', e.target.value)}
                        inputProps={!l.sku && !l.name ? { list: 'sku-options' } : {}}
                        InputProps={{
                          readOnly: Boolean(l.sku && l.name)
                        }}
                        disabled={Boolean(l.sku && l.name)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={l.name}
                        sx={{ minWidth: { xs: 150, sm: 200 } }}
                        onChange={(e) => updateLine(idx, 'name', e.target.value)}
                        inputProps={!l.sku && !l.name ? { list: 'name-options' } : {}}
                        InputProps={{
                          readOnly: Boolean(l.sku && l.name)
                        }}
                        disabled={Boolean(l.sku && l.name)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={l.qty}
                        onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                        sx={{ width: { xs: 80, sm: 120 } }}
                        inputProps={{ min: 0, step: 1 }}
                        placeholder="Thùng"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={l.price}
                        sx={{ width: { xs: 100, sm: 160 } }}
                        placeholder="Giá 1 thùng"
                        InputProps={{
                          readOnly: true,
                          endAdornment: <InputAdornment position="end">đ/thùng</InputAdornment>
                        }}
                        disabled
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={(Number(l.qty) * Number(l.price) || 0).toLocaleString('vi-VN')}
                        InputProps={{
                          readOnly: true,
                          endAdornment: <InputAdornment position="end">đ</InputAdornment>
                        }}
                        sx={{ width: { xs: 120, sm: 160 } }}
                        disabled
                      />
                    </TableCell>
                    <TableCell align="center">
                      <ActionButton
                        icon={<Icon name="Delete" />}
                        action="delete"
                        size="small"
                        onClick={() => removeLine(idx)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6}>
                    <Button startIcon={<Add />} onClick={addLine} size="small">Thêm dòng</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>
                    Tổng tiền:
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: 'primary.main',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {total.toLocaleString('vi-VN')} đ
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => {
            setOpenCreateOrderModal(false);
            setSelected(new Set());
          }} disabled={submitting}>
            Hủy
          </SecondaryButton>
          <PrimaryButton onClick={handleCreateOrder} disabled={submitting || !lines.length} loading={submitting}>
            Tạo đơn hàng
          </PrimaryButton>
        </DialogActions>
      </Dialog>
      {/* Suggestions for SKU and Name */}
      <datalist id="sku-options">
        {skuOptions.map((sku) => (
          <option key={sku} value={sku} />
        ))}
      </datalist>
      <datalist id="name-options">
        {nameOptions.map((n, i) => (
          <option key={`${n}-${i}`} value={n} />
        ))}
      </datalist>
    </Box>
  );
};

function exportCsv(rows) {
  const header = oldColumns.filter(c => c.key !== 'actions' && c.key !== 'select').map(c => c.label).join(',');
  const lines = rows.map(r => {
    const stock = Number(r.stock || 0);
    const minStock = Number(r.min_stock_level || r.minStock || 0);
    const reorderPoint = Number(r.reorder_point || r.reorderPoint || 0);
    const packageConversion = Number(r.package_conversion || 0);
    const stockStatus = getStockStatus(stock, minStock, reorderPoint, packageConversion);
    const perThung = r.package_price || r.price || 0;
    const perUnit = r.price || 0;

    // Chuyển đổi sang đơn vị lớn nếu có package_conversion
    let minStockDisplay, reorderPointDisplay;
    if (packageConversion && packageConversion > 0) {
      minStockDisplay = formatQty(convertToPackageUnit(minStock, packageConversion));
      reorderPointDisplay = formatQty(convertToPackageUnit(reorderPoint, packageConversion));
    } else {
      minStockDisplay = formatQty(minStock);
      reorderPointDisplay = formatQty(reorderPoint);
    }

    return [
      r.sku || '',
      r.name || '',
      r.category || '',
      perThung,
      perUnit,
      `${minStockDisplay} / ${reorderPointDisplay}`,
      statusLabels[stockStatus] || 'N/A'
    ].join(',');
  });
  const csv = ['\uFEFF' + header, ...lines].join('\n'); // Add BOM for UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'store-inventory.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default InventoryManagement;





