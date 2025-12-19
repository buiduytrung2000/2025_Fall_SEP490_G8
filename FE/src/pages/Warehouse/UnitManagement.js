import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllUnits, createUnit, updateUnit, deleteUnit } from '../../api/productApi';
import { ToastNotification } from '../../components/common';

const defaultForm = {
  unit_id: null,
  name: '',
  symbol: '',
  level: 1,
};

const UnitManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllUnits();
      if (res && res.err === 0) {
        setUnits(res.data || []);
      } else {
        ToastNotification.error(res?.msg || 'Không thể tải danh sách đơn vị');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi tải đơn vị: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      unit_id: row.unit_id,
      name: row.name || '',
      symbol: row.symbol || '',
      level: row.level ?? 1,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setForm(defaultForm);
  };

  const handleChange = (field) => (e) => {
    const value = field === 'level' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const { unit_id, name, symbol, level } = form;
    if (!name.trim() || !symbol.trim()) {
      ToastNotification.error('Vui lòng nhập đầy đủ Tên và Ký hiệu đơn vị');
      return;
    }
    if (!level || Number.isNaN(level) || level <= 0) {
      ToastNotification.error('Cấp (level) phải là số nguyên dương');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (isEdit && unit_id) {
        res = await updateUnit(unit_id, { name: name.trim(), symbol: symbol.trim(), level });
      } else {
        res = await createUnit({ name: name.trim(), symbol: symbol.trim(), level });
      }

      if (res && res.err === 0) {
        ToastNotification.success(isEdit ? 'Cập nhật đơn vị thành công' : 'Thêm đơn vị thành công');
        setDialogOpen(false);
        setForm(defaultForm);
        await loadUnits();
      } else {
        ToastNotification.error(res?.msg || 'Không thể lưu đơn vị');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi lưu đơn vị: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unit) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn vị "${unit.name}"?`)) return;
    try {
      const res = await deleteUnit(unit.unit_id);
      if (res && res.err === 0) {
        ToastNotification.success('Xóa đơn vị thành công');
        await loadUnits();
      } else {
        ToastNotification.error(res?.msg || 'Không thể xóa đơn vị');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi xóa đơn vị: ' + e.message);
    }
  };

  const columns = [
    {
      accessorKey: 'index',
      header: 'STT',
      size: 60,
      Cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'name',
      header: 'Tên đơn vị',
      size: 200,
    },
    {
      accessorKey: 'symbol',
      header: 'Ký hiệu',
      size: 120,
    },
    {
      accessorKey: 'level',
      header: 'Cấp (1 = lớn nhất)',
      size: 140,
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      size: 120,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row.original)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(row.original)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Quản lý Đơn vị tính
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Thêm, sửa, xóa đơn vị dùng cho sản phẩm và kho
      </Typography>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={{} && <AddIcon />}
            onClick={handleOpenCreate}
          >
            Thêm đơn vị
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={loadUnits}
          >
            Tải lại
          </Button>
        </Stack>
      </Paper>

      <MaterialReactTable
        columns={columns}
        data={units}
        enableStickyHeader
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={true}
        enableTopToolbar={false}
        enableBottomToolbar={true}
        enablePagination={true}
        layoutMode="grid"
        initialState={{
          density: 'compact',
          pagination: { pageSize: 10, pageIndex: 0 },
        }}
        state={{ isLoading: loading }}
        localization={MRT_Localization_VI}
        muiTableContainerProps={{
          sx: { maxHeight: { xs: '70vh', md: '600px' } },
        }}
        muiTablePaperProps={{
          elevation: 0,
          sx: { boxShadow: 'none' },
        }}
      />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle>{isEdit ? 'Cập nhật đơn vị' : 'Thêm đơn vị mới'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên đơn vị"
              value={form.name}
              onChange={handleChange('name')}
              fullWidth
              required
            />
            <TextField
              label="Ký hiệu"
              value={form.symbol}
              onChange={handleChange('symbol')}
              fullWidth
              required
            />
            <TextField
              label="Cấp (1 = đơn vị lớn nhất)"
              type="number"
              value={form.level}
              onChange={handleChange('level')}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Hủy
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnitManagement;


