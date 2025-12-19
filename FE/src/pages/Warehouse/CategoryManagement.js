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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../../api/productApi';
import { ToastNotification } from '../../components/common';

const defaultForm = {
  category_id: null,
  name: '',
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllCategories();
      if (res && res.err === 0) {
        setCategories(res.data || []);
      } else {
        ToastNotification.error(res?.msg || 'Không thể tải danh mục');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi tải danh mục: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      category_id: row.category_id,
      name: row.name || '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setForm(defaultForm);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const { category_id, name } = form;
    if (!name.trim()) {
      ToastNotification.error('Vui lòng nhập Tên danh mục');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (isEdit && category_id) {
        res = await updateCategory(category_id, { name: name.trim() });
      } else {
        res = await createCategory({ name: name.trim() });
      }

      if (res && res.err === 0) {
        ToastNotification.success(isEdit ? 'Cập nhật danh mục thành công' : 'Thêm danh mục thành công');
        setDialogOpen(false);
        setForm(defaultForm);
        await loadCategories();
      } else {
        ToastNotification.error(res?.msg || 'Không thể lưu danh mục');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi lưu danh mục: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`)) return;
    try {
      const res = await deleteCategory(category.category_id);
      if (res && res.err === 0) {
        ToastNotification.success('Xóa danh mục thành công');
        await loadCategories();
      } else {
        ToastNotification.error(res?.msg || 'Không thể xóa danh mục');
      }
    } catch (e) {
      ToastNotification.error('Lỗi khi xóa danh mục: ' + e.message);
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
      header: 'Tên danh mục',
      size: 220,
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
        Quản lý Danh mục sản phẩm
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Thêm, sửa, xóa danh mục sản phẩm dùng cho kho và cửa hàng
      </Typography>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Thêm danh mục
          </Button>
        </Stack>
      </Paper>

      <MaterialReactTable
        columns={columns}
        data={categories}
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
        <DialogTitle>{isEdit ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên danh mục"
              value={form.name}
              onChange={handleChange('name')}
              fullWidth
              required
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

export default CategoryManagement;


