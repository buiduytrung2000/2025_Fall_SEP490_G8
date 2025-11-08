// src/pages/Store_Manager/PurchaseOrders.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  MenuItem
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { createStoreOrder, getStoreOrders } from '../../api/storeOrderApi';

const emptyLine = () => ({ sku: '', name: '', qty: 1, price: 0 });

const PurchaseOrders = () => {
  const [mainTab, setMainTab] = useState('Create');
  const [tab, setTab] = useState('ToWarehouse');
  const [target, setTarget] = useState('Main Warehouse');
  const [supplier, setSupplier] = useState('Coca-Cola');
  const [lines, setLines] = useState([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [perishable, setPerishable] = useState(false);

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0), [lines]);

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, key, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  };

  const handleSubmit = async () => {
    // Validation: Check if there are any items
    if (lines.length === 0 || lines.every(l => !l.sku && !l.name)) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }

    // Validation: Check target_warehouse for ToWarehouse orders
    if (tab === 'ToWarehouse' && (!target || target.trim() === '')) {
      alert('Vui lòng nhập tên kho nhận hàng');
      return;
    }

    // Validation: Check supplier for ToSupplier orders
    if (tab === 'ToSupplier' && (!supplier || supplier.trim() === '')) {
      alert('Vui lòng nhập tên nhà cung cấp');
      return;
    }

    // Validation: Validate each item
    const validItems = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      
      // Skip empty lines
      if ((!l.sku || l.sku.trim() === '') && (!l.name || l.name.trim() === '')) {
        continue;
      }
      
      // Validate SKU or name (should not reach here if both are empty due to skip above)
      if ((!l.sku || l.sku.trim() === '') && (!l.name || l.name.trim() === '')) {
        alert(`Dòng ${i + 1}: Vui lòng nhập mã SKU hoặc tên sản phẩm`);
        return;
      }
      
      // Validate quantity
      const qty = parseInt(l.qty);
      if (isNaN(qty) || qty <= 0) {
        alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
      
      // Validate unit price
      const price = parseFloat(l.price);
      if (isNaN(price) || price < 0) {
        alert(`Dòng ${i + 1}: Đơn giá phải lớn hơn hoặc bằng 0`);
        return;
      }
      
      validItems.push({
        sku: (l.sku || '').trim(),
        name: (l.name || '').trim(),
        quantity: qty,
        unit_price: price
      });
    }

    // Validation: Check if there are valid items
    if (validItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_type: tab,
        target_warehouse: tab === 'ToWarehouse' ? target.trim() : null,
        supplier_id: tab === 'ToSupplier' ? null : null, // TODO: Get supplier_id from supplier name
        items: validItems,
        perishable: perishable,
        notes: null
      };

      const result = await createStoreOrder(payload);
      
      if (result.err === 0) {
        alert('Tạo đơn hàng thành công!');
        // Reset đơn
        setLines([emptyLine()]);
        setPerishable(false);
        setTarget('Main Warehouse');
        setSupplier('Coca-Cola');
      } else {
        alert('Lỗi: ' + (result.msg || 'Không thể tạo đơn hàng'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Lỗi khi tạo đơn hàng: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'List') {
      getStoreOrders({
        status: statusFilter,
        order_type: typeFilter
      }).then(setOrders);
    }
  }, [mainTab, statusFilter, typeFilter]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Đơn nhập hàng</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Tạo đơn và theo dõi đơn đã tạo</Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
          <Tab label="Tạo đơn" value="Create" />
          <Tab label="Đơn đã tạo" value="List" />
        </Tabs>
      </Paper>

      {mainTab === 'Create' && (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="order type tabs">
              <Tab label="Nhập từ Kho" value="ToWarehouse" />
              <Tab label="Nhập từ Nhà cung cấp" value="ToSupplier" />
            </Tabs>
          </Paper>

          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
              {tab === 'ToWarehouse' ? (
                <>
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
                </>
              ) : (
                <TextField 
                  label="Nhà cung cấp" 
                  size="small" 
                  value={supplier} 
                  onChange={(e) => setSupplier(e.target.value)} 
                  sx={{ width: { xs: '100%', sm: 320 } }} 
                />
              )}
            </Stack>
          </Paper>

          <TableContainer component={Paper} sx={{ mb: 2, maxHeight: { xs: '70vh', md: 'none' }, overflowX: 'auto' }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>SKU</TableCell>
                  <TableCell sx={{ minWidth: { xs: 150, sm: 200 } }}>Tên hàng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 100, sm: 120 } }}>Số lượng</TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 160 } }}>Đơn giá</TableCell>
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
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        type="number" 
                        value={l.price} 
                        onChange={(e) => updateLine(idx, 'price', e.target.value)} 
                        sx={{ width: { xs: 100, sm: 160 } }} 
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
              </TableBody>
            </Table>
          </TableContainer>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems={{ xs: 'stretch', sm: 'center' }} 
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Tổng tiền: {total.toLocaleString('vi-VN')} đ
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleSubmit} 
              disabled={submitting || !lines.length}
              fullWidth={{ xs: true, sm: false }}
              sx={{ minWidth: { xs: '100%', sm: 120 } }}
            >
              Tạo đơn
            </Button>
          </Stack>
        </>
      )}

      {mainTab === 'List' && (
        <>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField 
                select 
                size="small" 
                label="Loại đơn" 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)} 
                sx={{ width: { xs: '100%', sm: 220 } }}
              >
                {['All','ToWarehouse','ToSupplier'].map(v => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
              </TextField>
              <TextField 
                select 
                size="small" 
                label="Trạng thái" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                sx={{ width: { xs: '100%', sm: 220 } }}
              >
                {['All','Pending','Approved','Rejected'].map(v => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
              </TextField>
            </Stack>
          </Paper>

          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 100 }}>Mã đơn</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Loại</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Nơi nhận/NCC</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Ngày</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Số dòng</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Tổng tiền</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.store_order_id} hover>
                    <TableCell>{o.store_order_id || o.order_code || 'N/A'}</TableCell>
                    <TableCell>{o.order_type || 'N/A'}</TableCell>
                    <TableCell>{o.target_warehouse || o.supplier_name || 'N/A'}</TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{o.items ? o.items.length : 0}</TableCell>
                    <TableCell>{Number(o.total_amount || 0).toLocaleString('vi-VN')} đ</TableCell>
                    <TableCell>{o.status || 'pending'}</TableCell>
                  </TableRow>
                ))}
                {!orders.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Chưa có đơn nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default PurchaseOrders;


