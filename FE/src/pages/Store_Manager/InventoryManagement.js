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
  Button
} from '@mui/material';
import { Download, Refresh, Edit } from '@mui/icons-material';
import { getStoreInventory } from '../../api/mockApi';

const columns = [
  { key: 'sku', label: 'Mã SKU' },
  { key: 'name', label: 'Tên hàng' },
  { key: 'category', label: 'Danh mục' },
  { key: 'unit', label: 'ĐVT' },
  { key: 'price', label: 'Giá bán' },
  { key: 'stock', label: 'Tồn kho' },
  { key: 'minStock', label: 'Tồn tối thiểu' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' }
];

const formatVnd = (n) => n.toLocaleString('vi-VN');

const InventoryManagement = () => {
  const [query, setQuery] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getStoreInventory()
      .then((items) => setData(items))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    );
  }, [data, query]);

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Quản lý tồn kho</Typography>
          <Typography color="text.secondary">Theo dõi số lượng tại cửa hàng, cảnh báo thiếu hàng</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Tải lại">
            <span>
              <IconButton onClick={fetchData} disabled={loading}><Refresh /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Xuất CSV">
            <span>
              <IconButton onClick={() => exportCsv(filtered)} disabled={!filtered.length}><Download /></IconButton>
            </span>
          </Tooltip>
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

      <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => {
              const isLow = row.stock <= row.minStock;
              return (
                <TableRow key={row.sku} hover>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>{formatVnd(row.price)}</TableCell>
                  <TableCell sx={{ fontWeight: isLow ? 700 : 400, color: isLow ? '#dc2626' : 'inherit' }}>{row.stock}</TableCell>
                  <TableCell>{row.minStock}</TableCell>
                  <TableCell>
                    <Chip size="small" color={isLow ? 'warning' : 'success'} label={isLow ? 'Thiếu hàng' : 'Ổn định'} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Edit />} variant="outlined">Điều chỉnh</Button>
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

function exportCsv(rows) {
  const header = columns.filter(c => c.key !== 'actions').map(c => c.label).join(',');
  const lines = rows.map(r => [r.sku, r.name, r.category, r.unit, r.price, r.stock, r.minStock, r.stock <= r.minStock ? 'Thiếu hàng' : 'Ổn định'].join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'store-inventory.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default InventoryManagement;





