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
  IconButton,
  Tooltip,
  Button,
  useMediaQuery,
  useTheme,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { Download, Refresh, Edit, Add, Delete } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { createWarehouseOrder } from '../../api/warehouseOrderApi';
import { getStoreInventory } from '../../api/inventoryApi';
import { createStoreOrder } from '../../api/storeOrderApi';

const columns = [
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
            perishable: parsed.perishable || false
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
        perishable: false
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get store_id from user if available, otherwise pass null to use user's store
      const items = await getStoreInventory(null);
      setData(items || []);
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
        perishable
      };
      localStorage.setItem('inventory_order_draft', JSON.stringify(orderData));
    } catch (error) {
      console.error('Error saving order data to localStorage:', error);
    }
  }, [lines, target, supplier, perishable]);

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
        const quantity = computeSuggestedQty(row);
        // Push into 'Tạo đơn hàng mới' draft instead of sending API immediately
        setLines(prev => {
          // Xóa các dòng trống trước khi thêm sản phẩm mới
          const filteredLines = prev.filter(l => !(l.sku === '' && l.name === ''));
          
          const sku = row.sku || '';
          const name = row.name || '';
          const price = Number(row.package_price || row.cost_price || row.price || 0) || 0;
          const idx = filteredLines.findIndex(l => l.sku === sku);
          if (idx >= 0) {
            const updated = [...filteredLines];
            updated[idx] = {
              ...updated[idx],
              qty: Number(updated[idx].qty || 0) + quantity,
              price: price || updated[idx].price
            };
            return updated;
          }
          return [...filteredLines, { sku, name, qty: quantity, price }];
        });
        // Không mở modal ngay, chỉ thông báo đã thêm
        toast.info(`Đã thêm ${row.name} (SL gợi ý: ${quantity}) vào đơn nháp`);
      }
    }
  };

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
      
      // Khi nhập SKU hoặc tên hàng, tự động xóa các dòng trống khác
      if (key === 'sku' || key === 'name') {
        const currentLine = updated[idx];
        const hasData = (currentLine.sku && currentLine.sku.trim() !== '') || 
                       (currentLine.name && currentLine.name.trim() !== '');
        
        if (hasData) {
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
  
  // Đếm số sản phẩm hợp lệ trong đơn nhập (có SKU hoặc tên hàng)
  const orderItemsCount = useMemo(() => {
    return lines.filter(l => (l.sku && l.sku.trim() !== '') || (l.name && l.name.trim() !== '')).length;
  }, [lines]);

  const handleCreateOrder = async () => {
      if (lines.length === 0 || lines.every(l => !l.sku && !l.name)) {
        toast.error('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
        return;
      }
    if (!target || target.trim() === '') {
      toast.error('Vui lòng nhập tên kho nhận hàng');
      return;
    }

    const validItems = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if ((!l.sku || l.sku.trim() === '') && (!l.name || l.name.trim() === '') && (!l.qty || l.qty === '') && (!l.price || l.price === '')) {
        continue;
      }
      if (!l.sku || l.sku.trim() === '') {
        toast.error(`Dòng ${i + 1}: Vui lòng nhập mã SKU`);
        return;
      }
      if (!l.name || l.name.trim() === '') {
        toast.error(`Dòng ${i + 1}: Vui lòng nhập tên hàng`);
        return;
      }
      const qty = parseInt(l.qty);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Dòng ${i + 1}: Số lượng thùng phải lớn hơn 0`);
        return;
      }
      const price = parseFloat(l.price);
      if (isNaN(price) || price <= 0) {
        toast.error(`Dòng ${i + 1}: Đơn giá mỗi thùng phải lớn hơn 0`);
        return;
      }
      validItems.push({
        sku: (l.sku || '').trim(),
        name: (l.name || '').trim(),
        quantity: qty,
        unit_price: price
      });
    }

    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_type: 'ToWarehouse',
        target_warehouse: target.trim(),
        supplier_id: null,
        items: validItems,
        perishable: perishable,
        notes: null
      };

      const result = await createStoreOrder(payload);
      
      if (result.err === 0) {
        toast.success('Tạo đơn hàng thành công!');
        // Reset đơn nhập
        setLines([]);
        setPerishable(false);
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
        toast.error('Lỗi: ' + (result.msg || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Lỗi khi tạo đơn hàng: ' + error.message);
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
              <Button
                variant="contained"
                color="primary"
                size={isMobile ? 'small' : 'medium'}
                onClick={() => {
                if (selected.size === 0 && orderItemsCount === 0) {
                  toast.warn('Vui lòng chọn ít nhất một sản phẩm trước khi lên đơn');
                  return;
                }
                setOpenCreateOrderModal(true);
              }}
              >
                Lên đơn nhập {orderItemsCount > 0 ? `(${orderItemsCount})` : ''}
              </Button>
              <Tooltip title="Tải lại">
                <span>
                  <IconButton onClick={fetchData} disabled={loading} size={isMobile ? 'small' : 'medium'}>
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Xuất CSV">
                <span>
                  <IconButton onClick={() => exportCsv(filtered)} disabled={!filtered.length} size={isMobile ? 'small' : 'medium'}>
                    <Download />
                  </IconButton>
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

      <TableContainer 
        component={Paper} 
        sx={{ 
          boxShadow: 3, 
          borderRadius: 2,
          overflowX: 'auto',
          maxHeight: { xs: '70vh', md: 'none' }
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell 
                  key={c.key} 
                  sx={{ 
                    fontWeight: 700,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  {c.key === 'select' ? (
                    <Checkbox
                      indeterminate={someInViewSelected}
                      checked={allInViewSelected}
                      onChange={(e) => toggleAllInView(e.target.checked)}
                      inputProps={{ 'aria-label': 'chọn tất cả' }}
                    />
                  ) : c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => {
              const minStock = row.min_stock_level || row.minStock || 0;
              const isLow = row.stock <= minStock;
              return (
                <TableRow key={row.inventory_id || row.sku} hover>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(rowId(row))}
                      onChange={(e) => toggleOne(rowId(row), e.target.checked)}
                      inputProps={{ 'aria-label': 'chọn sản phẩm' }}
                    />
                  </TableCell>
                  <TableCell>{row.sku || ''}</TableCell>
                  <TableCell>{row.name || ''}</TableCell>
                  <TableCell>{row.category || ''}</TableCell>
                  <TableCell>{formatVnd(row.package_price || row.price || 0)}đ</TableCell>
                  <TableCell>{formatVnd(row.price || 0)}đ</TableCell>
                  <TableCell sx={{ fontWeight: isLow ? 700 : 400, color: isLow ? '#dc2626' : 'inherit' }}>{row.stock || 0}</TableCell>
                  <TableCell>{minStock}</TableCell>
                  <TableCell>
                    <Chip size="small" color={isLow ? 'warning' : 'success'} label={isLow ? 'Thiếu hàng' : 'Ổn định'} />
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {loading ? 'Đang tải...' : 'Không có dữ liệu'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
                label="Hàng tươi sống?" 
                value={perishable ? 'Yes' : 'No'} 
                onChange={(e) => setPerishable(e.target.value === 'Yes')} 
                sx={{ width: { xs: '100%', sm: 180 } }}
              >
                <MenuItem value="No">No</MenuItem>
                <MenuItem value="Yes">Yes</MenuItem>
              </TextField>
              {perishable && (
                <TextField 
                  label="Nhà cung cấp tươi sống" 
                  size="small" 
                  value={supplier} 
                  onChange={(e) => setSupplier(e.target.value)} 
                  sx={{ width: { xs: '100%', sm: 240, md: 260 } }} 
                />
              )}
            </Stack>
          </Paper>

          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Chi tiết sản phẩm</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nhập số lượng thùng và đơn giá của <strong>1 thùng</strong> cho từng sản phẩm.
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: { xs: '50vh', md: '60vh' }, overflowX: 'auto' }}>
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
                      <IconButton size="small" onClick={() => removeLine(idx)}><Delete /></IconButton>
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
          <Button onClick={() => setOpenCreateOrderModal(false)} variant="outlined" disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleCreateOrder} variant="contained" disabled={submitting || !lines.length}>
            {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function exportCsv(rows) {
  const header = columns.filter(c => c.key !== 'actions').map(c => c.label).join(',');
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





