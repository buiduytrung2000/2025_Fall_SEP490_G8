// src/pages/Warehouse/OrderUpdate.js
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { getStoreOrderById, updateStoreOrderStatus } from '../../api/mockApi';

const timelineSteps = [
  'Đơn hàng được tạo',
  'Đơn hàng được xác nhận',
  'Đang chuẩn bị hàng',
  'Đang kiểm tra chất lượng',
  'Đóng gói',
  'Sẵn sàng vận chuyển',
  'Đã giao hàng',
];

const OrderUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [lines, setLines] = useState([]);
  const [newStatus, setNewStatus] = useState('Đang kiểm tra chất lượng');
  const [updateTime, setUpdateTime] = useState('2025-10-29T02:00');
  const [note, setNote] = useState('');

  useEffect(() => {
    getStoreOrderById(id).then(({ order, lines }) => {
      setInfo(order);
      setLines(lines);
    });
  }, [id]);

  const totalAmount = useMemo(() => lines.reduce((s, l) => s + Number(l.amount || 0), 0), [lines]);

  const quickUpdate = async (status) => {
    await updateStoreOrderStatus(id, status);
    navigate('/warehouse/branch-orders');
  };

  const handleSubmit = async () => {
    await updateStoreOrderStatus(id, newStatus);
    navigate('/warehouse/branch-orders');
  };

  if (!info) return null;

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Cập nhật trạng thái đơn hàng</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography><b>Đơn hàng:</b> {info.id}</Typography>
                <Typography><b>Chi nhánh:</b> {info.branch || 'CN1'}</Typography>
                <Typography><b>Ngày đặt:</b> {info.date} 08:00</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><b>Trạng thái hiện tại:</b> {info.status}</Typography>
                <Typography><b>Ngày giao dự kiến:</b> 29/10/2025</Typography>
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography><b>Tổng số lượng:</b> {lines.reduce((s,l)=>s + (l.actual ?? l.ordered),0)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><b>Tổng giá trị xuất:</b> {totalAmount.toLocaleString('vi-VN')}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>Tiến trình đơn hàng:</Typography>
            {timelineSteps.map(step => (
              <Typography key={step} sx={{ mb: 0.5 }}>• {step}</Typography>
            ))}
          </Paper>

          <Typography variant="h6" sx={{ mb: 1 }}>Sản phẩm trong đơn hàng</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Mã SP</TableCell>
                  <TableCell>Đơn vị</TableCell>
                  <TableCell>SL đặt</TableCell>
                  <TableCell>SL thực tế</TableCell>
                  <TableCell>Đơn giá xuất</TableCell>
                  <TableCell>Thành tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>{l.sku}</TableCell>
                    <TableCell>{l.unit}</TableCell>
                    <TableCell>{l.ordered}</TableCell>
                    <TableCell>{l.actual}</TableCell>
                    <TableCell>{Number(l.exportPrice).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{Number(l.amount).toLocaleString('vi-VN')}</TableCell>
                    <TableCell><Chip size="small" label={l.status} /></TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6} align="right"><b>Tổng cộng:</b></TableCell>
                  <TableCell colSpan={2}><b>{totalAmount.toLocaleString('vi-VN')}</b></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Cập nhật trạng thái</Typography>
            <Stack spacing={2}>
              <TextField select label="Trạng thái mới" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} size="small">
                {[ 'Đang kiểm tra chất lượng', 'Đóng gói', 'Sẵn sàng vận chuyển', 'Đã giao hàng', 'Đã phê duyệt' ].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField label="Thời gian cập nhật" type="datetime-local" size="small" value={updateTime} onChange={(e) => setUpdateTime(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Ghi chú" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant="contained" onClick={handleSubmit}>Cập nhật trạng thái</Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Thao tác nhanh</Typography>
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => quickUpdate('Đã kiểm tra')}>Đánh dấu hoàn tất kiểm tra</Button>
              <Button variant="outlined" onClick={() => quickUpdate('Đóng gói')}>Chuyển sang đóng gói</Button>
              <Button variant="outlined" color="error" onClick={() => quickUpdate('Báo cáo vấn đề')}>Báo cáo vấn đề</Button>
              <Button variant="outlined">In phiếu xuất kho</Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Thông tin giao hàng</Typography>
            <Typography>Địa chỉ: {info.branch || 'CN1'}, 123 Bà Triệu, HN</Typography>
            <Typography>Liên hệ: Nguyễn Văn A</Typography>
            <Typography>012335464</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderUpdate;





