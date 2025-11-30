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
  MenuItem,
  TextField,
  Stack
} from '@mui/material';
import { PrimaryButton, DangerButton } from '../../components/common';
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
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        justifyContent="space-between" 
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Hóa đơn nhập kho
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Duyệt hoặc từ chối hóa đơn của kho
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
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', maxHeight: { xs: '70vh', md: 'none' } }}>
        <Table sx={{ minWidth: 700 }}>
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
            {filtered.map((r) => {
              const isPending = r.status === 'Pending';
              const color = r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'error' : 'warning');
              return (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{r.id}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{r.supplier}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{r.date}</TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatVnd(r.total)}</TableCell>
                  <TableCell><Chip size="small" color={color} label={r.status} /></TableCell>
                  <TableCell>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: 150, sm: 'auto' } }}>
                      <PrimaryButton 
                        disabled={!isPending || loading} 
                        onClick={() => handleApprove(r.id)}
                        size="small"
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.875rem' },
                          bgcolor: 'success.main',
                          '&:hover': { bgcolor: 'success.dark' },
                          width: { xs: '100%', sm: 'auto' }
                        }}
                      >
                        Approve
                      </PrimaryButton>
                      <DangerButton 
                        disabled={!isPending || loading} 
                        variant="outlined"
                        onClick={() => handleReject(r.id)}
                        size="small"
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.875rem' },
                          width: { xs: '100%', sm: 'auto' }
                        }}
                      >
                        Reject
                      </DangerButton>
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





