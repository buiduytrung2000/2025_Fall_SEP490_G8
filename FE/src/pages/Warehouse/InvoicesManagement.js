// src/pages/Warehouse/InvoicesManagement.js
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
import {
  getWarehouseInvoices,
  approveWarehouseInvoice,
  rejectWarehouseInvoice
} from '../../api/mockApi';

const columns = [
  { key: 'id', label: 'Mã HĐ' },
  { key: 'supplier', label: 'Nhà cung cấp' },
  { key: 'date', label: 'Ngày' },
  { key: 'total', label: 'Tổng tiền' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' }
];

const formatVnd = (n) => Number(n).toLocaleString('vi-VN');

const InvoicesManagement = () => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getWarehouseInvoices().then(setRows).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (status === 'All') return rows;
    return rows.filter(r => r.status === status);
  }, [rows, status]);

  const handleApprove = async (id) => {
    await approveWarehouseInvoice(id);
    load();
  };
  const handleReject = async (id) => {
    await rejectWarehouseInvoice(id);
    load();
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Hóa đơn nhập kho</Typography>
          <Typography color="text.secondary">Duyệt hoặc từ chối hóa đơn của kho</Typography>
        </Box>
        <TextField
          select
          size="small"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          label="Lọc trạng thái"
          sx={{ width: 220 }}
        >
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              {columns.map(c => (
                <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => {
              const isPending = r.status === 'Pending';
              const color = r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'error' : 'warning');
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.supplier}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{formatVnd(r.total)}</TableCell>
                  <TableCell><Chip size="small" color={color} label={r.status} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button disabled={!isPending || loading} variant="contained" color="success" onClick={() => handleApprove(r.id)}>Approve</Button>
                      <Button disabled={!isPending || loading} variant="outlined" color="error" onClick={() => handleReject(r.id)}>Reject</Button>
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

export default InvoicesManagement;





