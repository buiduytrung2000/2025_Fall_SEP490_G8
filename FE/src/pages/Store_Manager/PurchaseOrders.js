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
import { createStoreOrder, getStoreOrders } from '../../api/mockApi';

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
    setSubmitting(true);
    const payload = {
      type: tab,
      target: tab === 'ToWarehouse' ? target : supplier,
      createdBy: 'Shop Manager A',
      date: new Date().toISOString().slice(0,10),
      items: lines.length,
      total,
      perishable,
      supplier: perishable && tab === 'ToWarehouse' ? supplier : (tab === 'ToSupplier' ? supplier : undefined)
    };
    await createStoreOrder(payload);
    setSubmitting(false);
    // Reset đơn
    setLines([emptyLine()]);
    setPerishable(false);
  };

  useEffect(() => {
    if (mainTab === 'List') {
      getStoreOrders().then(setOrders);
    }
  }, [mainTab]);

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

          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {tab === 'ToWarehouse' ? (
              <>
                <TextField label="Kho nhận" size="small" value={target} onChange={(e) => setTarget(e.target.value)} sx={{ width: 320 }} />
                <TextField select size="small" label="Hàng tươi sống?" value={perishable ? 'Yes' : 'No'} onChange={(e) => setPerishable(e.target.value === 'Yes')} sx={{ width: 180 }}>
                  <MenuItem value="No">No</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                </TextField>
                {perishable && (
                  <TextField label="Nhà cung cấp tươi sống" size="small" value={supplier} onChange={(e) => setSupplier(e.target.value)} sx={{ width: 260 }} />
                )}
              </>
            ) : (
              <TextField label="Nhà cung cấp" size="small" value={supplier} onChange={(e) => setSupplier(e.target.value)} sx={{ width: 320 }} />
            )}
          </Paper>

          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Tên hàng</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Đơn giá</TableCell>
                  <TableCell width={64}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField size="small" value={l.sku} onChange={(e) => updateLine(idx, 'sku', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth value={l.name} onChange={(e) => updateLine(idx, 'name', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={l.qty} onChange={(e) => updateLine(idx, 'qty', e.target.value)} sx={{ width: 120 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={l.price} onChange={(e) => updateLine(idx, 'price', e.target.value)} sx={{ width: 160 }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => removeLine(idx)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5}>
                    <Button startIcon={<Add />} onClick={addLine}>Thêm dòng</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Tổng tiền: {total.toLocaleString('vi-VN')} đ</Typography>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting || !lines.length}>Tạo đơn</Button>
          </Stack>
        </>
      )}

      {mainTab === 'List' && (
        <>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2 }}>
            <TextField select size="small" label="Loại đơn" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ width: 220 }}>
              {['All','ToWarehouse','ToSupplier'].map(v => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
            </TextField>
            <TextField select size="small" label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 220 }}>
              {['All','Pending','Approved','Rejected'].map(v => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
            </TextField>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Nơi nhận/NCC</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Số dòng</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders
                  .filter(o => (typeFilter === 'All' || o.type === typeFilter))
                  .filter(o => (statusFilter === 'All' || o.status === statusFilter))
                  .map(o => (
                  <TableRow key={o.id} hover>
                    <TableCell>{o.id}</TableCell>
                    <TableCell>{o.type}</TableCell>
                    <TableCell>{o.target}</TableCell>
                    <TableCell>{o.date}</TableCell>
                    <TableCell>{o.items}</TableCell>
                    <TableCell>{Number(o.total).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{o.status}</TableCell>
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


