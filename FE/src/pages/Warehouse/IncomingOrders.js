   // src/pages/Warehouse/IncomingOrders.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  MenuItem,
  TextField,
  Stack
} from '@mui/material';
import { getStoreOrders, rejectStoreOrder, forwardStoreOrderToSupplier, approveAndSendToSupplier } from '../../api/mockApi';

const columns = [
  { key: 'id', label: 'Mã đơn' },
  { key: 'createdBy', label: 'Tạo bởi' },
  { key: 'date', label: 'Ngày' },
  { key: 'items', label: 'Số dòng' },
  { key: 'total', label: 'Tổng tiền' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' }
];

const IncomingOrders = () => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('Pending');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getStoreOrders().then(data => setRows(data.filter(o => o.type === 'ToWarehouse'))).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (status === 'All') return rows;
    return rows.filter(r => r.status === status);
  }, [rows, status]);

  const handleApprove = async (id) => {
    const supplier = window.prompt('Nhập nhà cung cấp để gửi đơn:', 'Default Supplier');
    if (!supplier) return;
    await approveAndSendToSupplier(id, supplier);
    load();
  };
  const handleReject = async (id) => { await rejectStoreOrder(id); load(); };
  const handleForward = async (order) => {
    const supplier = window.prompt('Nhập nhà cung cấp giao thẳng cho cửa hàng:', order.supplier || 'Fresh Supplier');
    if (!supplier) return;
    await forwardStoreOrderToSupplier(order.id, supplier);
    load();
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        justifyContent="space-between" 
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Đơn nhập từ cửa hàng
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Tiếp nhận và duyệt đơn do cửa hàng gửi
          </Typography>
        </Box>
        <TextField 
          select 
          size="small" 
          value={status} 
          onChange={(e) => setStatus(e.target.value)} 
          label="Lọc trạng thái" 
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              {columns.map(c => (
                <TableCell 
                  key={c.key} 
                  sx={{ 
                    fontWeight: 700,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => {
              const isPending = r.status === 'Pending';
              const color = r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'error' : 'warning');
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.createdBy}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.items}</TableCell>
                  <TableCell>{Number(r.total).toLocaleString('vi-VN')}</TableCell>
                  <TableCell><Chip size="small" color={color} label={r.status} /></TableCell>
                  <TableCell>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: 200, sm: 'auto' } }}>
                      <Button 
                        disabled={!isPending || loading} 
                        variant="contained" 
                        color="success" 
                        onClick={() => handleApprove(r.id)}
                        size="small"
                        fullWidth={{ xs: true, sm: false }}
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Approve
                      </Button>
                      <Button 
                        disabled={!isPending || loading} 
                        variant="outlined" 
                        color="error" 
                        onClick={() => handleReject(r.id)}
                        size="small"
                        fullWidth={{ xs: true, sm: false }}
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Reject
                      </Button>
                      {r.perishable && isPending && (
                        <Button 
                          variant="outlined" 
                          onClick={() => handleForward(r)}
                          size="small"
                          fullWidth={{ xs: true, sm: false }}
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                        >
                          Forward to Supplier
                        </Button>
                      )}
                    </Stack>
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
    </Box>
  );
};

export default IncomingOrders;


