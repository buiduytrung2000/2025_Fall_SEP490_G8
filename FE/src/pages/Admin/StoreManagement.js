import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { MaterialReactTable } from 'material-react-table';
import { getAllStores, createStore, updateStore, deleteStore } from '../../api/storeApi';
import { ToastNotification, PrimaryButton, SecondaryButton } from '../../components/common';

const StoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
    });

    const loadStores = async () => {
        try {
            setLoading(true);
            const res = await getAllStores();
            if (res.err === 0) {
                setStores(res.data || []);
            } else {
                ToastNotification.error(res.msg || 'Không thể tải danh sách cửa hàng');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra khi tải danh sách cửa hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStores();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleOpenCreate = () => {
        setEditingStore(null);
        setForm({ name: '', address: '', phone: '' });
        setOpenDialog(true);
    };

    const handleOpenEdit = (store) => {
        setEditingStore(store);
        setForm({
            name: store.name || '',
            address: store.address || '',
            phone: store.phone || '',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingStore(null);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            ToastNotification.warning('Vui lòng nhập tên cửa hàng');
            return;
        }

        const payload = {
            name: form.name.trim(),
            address: form.address || null,
            phone: form.phone || null,
        };

        const res = editingStore
            ? await updateStore(editingStore.store_id, payload)
            : await createStore(payload);

        if (res.err === 0) {
            ToastNotification.success(
                res.msg || (editingStore ? 'Cập nhật cửa hàng thành công' : 'Tạo cửa hàng thành công'),
            );
            handleCloseDialog();
            loadStores();
        } else {
            ToastNotification.error(res.msg || 'Thao tác thất bại');
        }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Tên cửa hàng',
            },
            {
                accessorKey: 'address',
                header: 'Địa chỉ',
            },
            {
                accessorKey: 'phone',
                header: 'Số điện thoại',
            },
        ],
        [],
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Quản lý cửa hàng
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Danh sách cửa hàng, cho phép tạo mới và chỉnh sửa thông tin.
                    </Typography>
                </Box>
                <PrimaryButton onClick={handleOpenCreate}>Tạo cửa hàng mới</PrimaryButton>
            </Box>

            <MaterialReactTable
                columns={columns}
                data={stores}
                state={{ isLoading: loading }}
                enableColumnFilters={false}
                enableColumnActions={false}
                enableRowActions
                positionActionsColumn="last"
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Chỉnh sửa">
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenEdit(row.original)}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa cửa hàng">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                    const confirm = window.confirm(
                                        `Bạn có chắc chắn muốn xóa cửa hàng "${row.original.name}"?`,
                                    );
                                    if (!confirm) return;

                                    const res = await deleteStore(row.original.store_id);
                                    if (res.err === 0) {
                                        ToastNotification.success(res.msg || 'Xóa cửa hàng thành công');
                                        loadStores();
                                    } else {
                                        ToastNotification.error(res.msg || 'Xóa cửa hàng thất bại');
                                    }
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
                localization={{
                    noRecordsToDisplay: 'Chưa có cửa hàng nào',
                    rowsPerPage: 'Số dòng mỗi trang',
                }}
                initialState={{
                    pagination: { pageSize: 10, pageIndex: 0 },
                }}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingStore ? 'Cập nhật cửa hàng' : 'Tạo cửa hàng mới'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        label="Tên cửa hàng *"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Địa chỉ"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                        multiline
                        minRows={2}
                    />
                    <TextField
                        label="Số điện thoại"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={handleCloseDialog}>Hủy</SecondaryButton>
                    <PrimaryButton onClick={handleSubmit}>
                        {editingStore ? 'Lưu thay đổi' : 'Tạo cửa hàng'}
                    </PrimaryButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default StoreManagement;

