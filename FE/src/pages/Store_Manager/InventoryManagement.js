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
  Button
} from '@mui/material';
import { Refresh, Add } from '@mui/icons-material';
import { MaterialReactTable } from 'material-react-table';
import { PrimaryButton, SecondaryButton, ActionButton, ToastNotification, Icon } from '../../components/common';
import { createWarehouseOrder } from '../../api/warehouseOrderApi';
import { getStoreInventory } from '../../api/inventoryApi';
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
  { key: 'stock', label: 'Tồn kho' },
  { key: 'minStock', label: 'Tồn tối thiểu' },
  { key: 'status', label: 'Trạng thái' }
];

const formatVnd = (n) => n.toLocaleString('vi-VN');

const emptyLine = () => ({ sku: '', name: '', qty: 1, price: 0 });

const InventoryManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [openCreateOrderModal, setOpenCreateOrderModal] = useState(false);
  
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

  const filtered = useMemo(() => {
    const list = !query
      ? [...data]
      : data.filter((i) => (i.name || '').toLowerCase().includes(query.toLowerCase()) || (i.sku || '').toLowerCase().includes(query.toLowerCase()));

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
  }, [data, query]);

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
      id: 'product_type',
      header: 'Loại hàng',
      size: 85,
      Cell: ({ row }) => {
        const original = row.original;
        const isPerishable = !!(original.is_perishable || original.product?.is_perishable);
        return (
              <Chip
                size="small"
                color={isPerishable ? 'warning' : 'default'}
                label={isPerishable ? 'Tươi sống' : 'Thường'}
              />
        );
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'category',
      header: 'Danh mục',
      size: 100,
    },
    {
      accessorKey: 'package_price',
      header: 'Giá nhập/thùng',
      size: 100,
      Cell: ({ row }) => {
        // Lấy giá thùng từ package_price (đã tính từ latest_import_price * conversion)
        // Nếu không có thì hiển thị 0
        const price = row.original.package_price ?? 0;
        return `${formatVnd(Number(price) || 0)}đ`;
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'price',
      header: 'Giá lẻ/đơn vị',
      size: 100,
      Cell: ({ row }) => {
        // Chỉ lấy giá từ order (latest_import_price), nếu không có thì hiển thị 0
        const price = row.original.latest_import_price ?? 0;
        return `${formatVnd(Number(price) || 0)}đ`;
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
      accessorKey: 'stock',
      header: 'Tồn kho',
      size: 70,
      Cell: ({ row }) => {
        const stock = row.original.stock || 0;
        const minStock = row.original.min_stock_level || row.original.minStock || 0;
        const isLow = stock <= minStock;
        return (
          <Typography
            sx={{
              fontWeight: isLow ? 700 : 400,
              color: isLow ? '#dc2626' : 'inherit'
            }}
          >
            {stock}
          </Typography>
        );
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: 'min_stock_level',
      header: 'Tồn tối thiểu',
      size: 80,
      Cell: ({ row }) => row.original.min_stock_level || row.original.minStock || 0,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      size: 80,
      Cell: ({ row }) => {
        const stock = row.original.stock || 0;
        const minStock = row.original.min_stock_level || row.original.minStock || 0;
        const isLow = stock <= minStock;
        return (
          <Chip
            size="small"
            color={isLow ? 'warning' : 'success'}
            label={isLow ? 'Thiếu hàng' : 'Ổn định'}
          />
        );
      },
      enableColumnFilter: false,
    },
  ], [selected, toggleOne, allInViewSelected, someInViewSelected, toggleAllInView, activePricingRules]);

  // Order management functions
  const addLine = () => {
    setLines(prev => {
      const filtered = prev.filter(l => (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== ''));
      return [...filtered, emptyLine()];
    });
  };
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, key, val) => {
    setLines(prev => {
      // If updating quantity and it becomes <= 0, remove this line
      if (key === 'qty') {
        const qtyNum = Number(val);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
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
              <Tooltip title="Tải lại">
                <span>
                  <IconButton onClick={fetchData} disabled={loading} size={isMobile ? 'small' : 'medium'}>
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
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
        <TextField
          fullWidth
          size="small"
          placeholder="Tìm theo tên hoặc mã SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
        localization={{
          noRecordsToDisplay: 'Không có dữ liệu'
        }}
        initialState={{
          pagination: { pageSize: 10, pageIndex: 0 },
        }}
      />

      {/* Create Order Modal */}
      <Dialog
        open={openCreateOrderModal}
        onClose={() => setOpenCreateOrderModal(false)}
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
                  <TableCell width={64}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField 
                        size="small" 
                        value={l.sku} 
                        onChange={(e) => updateLine(idx, 'sku', e.target.value)} 
                        sx={{ width: { xs: 100, sm: 120 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        fullWidth 
                        value={l.name} 
                        onChange={(e) => updateLine(idx, 'name', e.target.value)} 
                        sx={{ minWidth: { xs: 150, sm: 200 } }}
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
                        onChange={(e) => updateLine(idx, 'price', e.target.value)} 
                        sx={{ width: { xs: 100, sm: 160 } }} 
                        placeholder="Giá 1 thùng"
                        InputProps={{
                          inputProps: { min: 0, step: 1000 },
                          endAdornment: <InputAdornment position="end">đ/thùng</InputAdornment>
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
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
                  <TableCell colSpan={5}>
                    <Button startIcon={<Add />} onClick={addLine} size="small">Thêm dòng</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>
                    Tổng tiền:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>
                    {total.toLocaleString('vi-VN')} đ
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setOpenCreateOrderModal(false)} disabled={submitting}>
            Hủy
          </SecondaryButton>
          <PrimaryButton onClick={handleCreateOrder} disabled={submitting || !lines.length} loading={submitting}>
            Tạo đơn hàng
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function exportCsv(rows) {
  const header = oldColumns.filter(c => c.key !== 'actions' && c.key !== 'select').map(c => c.label).join(',');
  const lines = rows.map(r => {
    const minStock = r.min_stock_level || r.minStock || 0;
    const perThung = r.package_price || r.price || 0;
    const perUnit = r.price || 0;
    return [
      r.sku || '',
      r.name || '',
      r.category || '',
      perThung,
      perUnit,
      r.stock || 0,
      minStock,
      r.stock <= minStock ? 'Thiếu hàng' : 'Ổn định'
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





