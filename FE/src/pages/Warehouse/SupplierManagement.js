import React, { useState, useEffect, useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    MenuItem,
    Typography,
} from '@mui/material';
import {
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    ActionButton,
    ToastNotification,
    Icon
} from '../../components/common';
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierAccounts
} from '../../api/supplierApi';

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [supplierAccounts, setSupplierAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        address: '',
        account_user_id: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSuppliers();
        loadAccounts();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const response = await getAllSuppliers();
            if (response.err === 0) {
                setSuppliers(response.data || []);
            } else {
                ToastNotification.error(response.msg || 'Không thể tải danh sách nhà cung cấp');
            }
        } catch (err) {
            ToastNotification.error('Lỗi kết nối: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadAccounts = async () => {
        try {
            const res = await getSupplierAccounts();
            if (res.err === 0) {
                setSupplierAccounts(res.data || []);
            } else {
                ToastNotification.error(res.msg || 'Không thể tải danh sách tài khoản Supplier');
            }
        } catch (error) {
            ToastNotification.error('Lỗi kết nối tài khoản: ' + error.message);
        }
    };

    const handleOpenModal = (mode, supplier = null) => {
        setModalMode(mode);
        setSelectedSupplier(supplier);

        if (supplier) {
            setFormData({
                name: supplier.name || '',
                contact: supplier.contact || '',
                email: supplier.email || '',
                address: supplier.address || '',
                account_user_id: supplier.user_id || supplier.accountOwner?.user_id || ''
            });
        } else {
            setFormData({
                name: '',
                contact: '',
                email: '',
                address: '',
                account_user_id: ''
            });
        }

        setFormErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSupplier(null);
        setFormData({
            name: '',
            contact: '',
            email: '',
            address: '',
            account_user_id: ''
        });
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name || formData.name.trim() === '') {
            errors.name = 'Tên nhà cung cấp là bắt buộc';
        }

        if (formData.email && formData.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                errors.email = 'Email không hợp lệ';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            ToastNotification.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        setSubmitting(true);
        try {
            let response;
            if (modalMode === 'create') {
                response = await createSupplier({
                    ...formData,
                    account_user_id: formData.account_user_id || undefined
                });
            } else if (modalMode === 'edit') {
                response = await updateSupplier(selectedSupplier.supplier_id, {
                    ...formData,
                    account_user_id: formData.account_user_id || undefined
                });
            }

            if (response.err === 0) {
                ToastNotification.success(modalMode === 'create' ? 'Tạo nhà cung cấp thành công' : 'Cập nhật nhà cung cấp thành công');
                handleCloseModal();
                await loadSuppliers();
            } else {
                ToastNotification.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            ToastNotification.error('Lỗi kết nối: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (supplier) => {
        setSupplierToDelete(supplier);
        setConfirmDeleteOpen(true);
    };

    const handleCloseConfirmDelete = () => {
        setConfirmDeleteOpen(false);
        setSupplierToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!supplierToDelete) return;

        try {
            const response = await deleteSupplier(supplierToDelete.supplier_id);
            if (response.err === 0) {
                ToastNotification.success('Xóa nhà cung cấp thành công');
                await loadSuppliers();
            } else {
                ToastNotification.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            ToastNotification.error('Lỗi kết nối: ' + err.message);
        } finally {
            handleCloseConfirmDelete();
        }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'supplier_id',
                header: 'ID',
                size: 80,
                enableColumnFilter: false, // No filter for ID
            },
            {
                accessorKey: 'name',
                header: 'Tên nhà cung cấp',
                size: 220,
            },
            {
                accessorKey: 'contact',
                header: 'Liên hệ',
                size: 130,
                Cell: ({ cell }) => cell.getValue() || '-',
                filterVariant: 'select',
                filterSelectOptions: [{ value: 'true', text: 'Có' }, { value: 'false', text: 'Không' }],
                filterFn: (row, id, filterValue) => {
                    const hasValue = !!row.original[id];
                    return filterValue === 'true' ? hasValue : !hasValue;
                },
            },
            {
                accessorKey: 'email',
                header: 'Email',
                size: 180,
                Cell: ({ cell }) => cell.getValue() || '-',
                filterVariant: 'select',
                filterSelectOptions: [{ value: 'true', text: 'Có' }, { value: 'false', text: 'Không' }],
                filterFn: (row, id, filterValue) => {
                    const hasValue = !!row.original[id];
                    return filterValue === 'true' ? hasValue : !hasValue;
                },
            },
            {
                accessorKey: 'accountOwner.username',
                header: 'Tài khoản Supplier',
                size: 200,
                Cell: ({ row }) => row.original.accountOwner?.username || <em>Chưa liên kết</em>
            },
            {
                accessorKey: 'address',
                header: 'Địa chỉ',
                size: 250,
                Cell: ({ cell }) => cell.getValue() || '-',
            },
        ],
        [],
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ padding: 3 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                Quản lý nhà cung cấp
            </Typography>

            <MaterialReactTable
                columns={columns}
                data={suppliers}
                state={{ isLoading: loading }}
                enableRowActions
                positionActionsColumn="last"
                enableColumnFilters
                enableFacetedValues
                renderTopToolbarCustomActions={() => (
                    <PrimaryButton
                        startIcon={<Icon name="Add" />}
                        onClick={() => handleOpenModal('create')}
                    >
                        Thêm nhà cung cấp
                    </PrimaryButton>
                )}
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <ActionButton
                            icon={<Icon name="Edit" />}
                            action="edit"
                            onClick={() => handleOpenModal('edit', row.original)}
                        />
                        <ActionButton
                            icon={<Icon name="Delete" />}
                            action="delete"
                            onClick={() => handleDelete(row.original)}
                        />
                    </Box>
                )}
                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                    },
                }}
                initialState={{
                    showGlobalFilter: true,
                    pagination: { pageSize: 10, pageIndex: 0 },
                    sorting: [{ id: 'supplier_id', desc: false }],
                }}
                localization={MRT_Localization_VI}
            />

            {/* Delete Confirm Modal */}
            <Dialog open={confirmDeleteOpen} onClose={handleCloseConfirmDelete} maxWidth="xs" fullWidth>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
                        <strong>{supplierToDelete?.name}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={handleCloseConfirmDelete}>
                        Hủy
                    </SecondaryButton>
                    <DangerButton onClick={handleConfirmDelete}>
                        Xóa
                    </DangerButton>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {modalMode === 'create' ? 'Thêm nhà cung cấp mới' : 'Chỉnh sửa nhà cung cấp'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="Tên nhà cung cấp"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                error={!!formErrors.name}
                                helperText={formErrors.name}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Liên hệ"
                                name="contact"
                                value={formData.contact}
                                onChange={handleInputChange}
                                fullWidth
                            />
                            <TextField
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                error={!!formErrors.email}
                                helperText={formErrors.email}
                                fullWidth
                            />
                            <TextField
                                label="Địa chỉ"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                multiline
                                rows={3}
                                fullWidth
                            />
                            <TextField
                                select
                                label="Tài khoản Supplier"
                                name="account_user_id"
                                value={formData.account_user_id}
                                onChange={handleInputChange}
                                helperText="Chọn tài khoản đăng nhập Supplier tương ứng (tùy chọn)"
                                fullWidth
                            >
                                <MenuItem value="">Chưa liên kết</MenuItem>
                                {supplierAccounts.map((account) => (
                                    <MenuItem key={account.user_id} value={account.user_id}>
                                        {account.username || account.email} ({account.email || 'không email'})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <SecondaryButton onClick={handleCloseModal} disabled={submitting}>
                            Hủy
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={submitting}
                            loading={submitting}
                        >
                            {modalMode === 'create' ? 'Tạo' : 'Cập nhật'}
                        </PrimaryButton>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default SupplierManagement;

