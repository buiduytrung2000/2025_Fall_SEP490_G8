// src/pages/Warehouse/InventoryManagement.js
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
} from '@mui/material';
import { getWarehouseInventory, getWarehouseCapacity } from '../../api/mockApi';

const statusOf = (item) => {
    if (item.stock === 0) return { label: 'Hết hàng', color: 'error' };
    if (item.stock < item.minStock) return { label: 'Sắp hết', color: 'warning' };
    return { label: 'Đủ hàng', color: 'success' };
};

const InventoryManagement = () => {
    const [items, setItems] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('Tất cả');
    const [status, setStatus] = useState('Tất cả');

    useEffect(() => {
        getWarehouseInventory().then(setItems);
        getWarehouseCapacity().then(setKpis);
    }, []);

    const categories = useMemo(() => ['Tất cả', ...Array.from(new Set(items.map(i => i.category)))], [items]);

    const filtered = useMemo(() => {
        return items.filter(i => {
            const textMatch = (i.name + i.sku).toLowerCase().includes(q.toLowerCase());
            const catMatch = category === 'Tất cả' || i.category === category;
            const st = statusOf(i).label;
            const stMatch = status === 'Tất cả' || st === status;
            return textMatch && catMatch && stMatch;
        });
    }, [items, q, category, status]);

    return (
        <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Quản lý tồn kho (Kho tổng)</Typography>

            {kpis && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography sx={{ mb: 1 }}>Tổng sản phẩm: <b>{kpis.totalProducts}</b> &nbsp;&nbsp; Sắp hết hàng: <b>{kpis.lowStockCount}</b> &nbsp;&nbsp; Hết hàng: <b>{kpis.outOfStockCount}</b></Typography>
                    <Typography>
                        Công suất kho hàng:&nbsp;&nbsp; Kho chính: <b>{kpis.capacity.main}%</b> &nbsp; Kho đồ khô: <b>{kpis.capacity.dry}%</b> &nbsp; Kho lạnh: <b>{kpis.capacity.cold}%</b>
                    </Typography>
                </Paper>
            )}

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField placeholder="Tìm kiếm sản phẩm" value={q} onChange={(e) => setQ(e.target.value)} size="small" sx={{ minWidth: 280 }} />
                <TextField select label="Danh mục" size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ width: 220 }}>
                    {categories.map(c => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
                </TextField>
                <TextField select label="Trạng thái" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 220 }}>
                    {['Tất cả', 'Đủ hàng', 'Sắp hết', 'Hết hàng'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                </TextField>
            </Paper>

            <Typography variant="h6" sx={{ mb: 1 }}>Chi tiết tồn kho</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã SP</TableCell>
                            <TableCell>Tên SP</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell>Đơn vị</TableCell>
                            <TableCell>Tồn kho</TableCell>
                            <TableCell>Tồn tối thiểu</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map(it => {
                            const st = statusOf(it);
                            return (
                                <TableRow key={it.sku} hover>
                                    <TableCell>{it.sku}</TableCell>
                                    <TableCell>{it.name}</TableCell>
                                    <TableCell>{it.category}</TableCell>
                                    <TableCell>{it.unit}</TableCell>
                                    <TableCell>{it.stock}</TableCell>
                                    <TableCell>{it.minStock}</TableCell>
                                    <TableCell><Chip size="small" color={st.color} label={st.label} /></TableCell>
                                </TableRow>
                            );
                        })}
                        {!filtered.length && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không có dữ liệu</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
export default InventoryManagement;