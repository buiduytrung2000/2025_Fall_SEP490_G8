import React, { useState, useEffect, useMemo } from 'react';
import { MaterialReactTable } from 'material-react-table';
import {
    Box,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    MenuItem
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
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
    const [error, setError] = useState(null);

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
        setError(null);
        try {
            const response = await getAllSuppliers();
            if (response.err === 0) {
                setSuppliers(response.data || []);
            } else {
                setError(response.msg || 'Không thể tải danh sách nhà cung cấp');
                toast.error(response.msg || 'Không thể tải danh sách nhà cung cấp');
            }
        } catch (err) {
            setError('Lỗi kết nối: ' + err.message);
            toast.error('Lỗi kết nối: ' + err.message);
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
                toast.error(res.msg || 'Không thể tải danh sách tài khoản Supplier');
            }
        } catch (error) {
            toast.error('Lỗi kết nối tài khoản: ' + error.message);
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
            toast.error('Vui lòng kiểm tra lại thông tin');
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
                toast.success(modalMode === 'create' ? 'Tạo nhà cung cấp thành công' : 'Cập nhật nhà cung cấp thành công');
                handleCloseModal();
                await loadSuppliers();
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (supplier) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${supplier.name}"?`)) {
            return;
        }

        try {
            const response = await deleteSupplier(supplier.supplier_id);
            if (response.err === 0) {
                toast.success('Xóa nhà cung cấp thành công');
                await loadSuppliers();
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
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
            {
                accessorKey: 'created_at',
                header: 'Ngày tạo',
                size: 180,
                Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString('vi-VN'),
                filterVariant: 'date-range',
            },
            {
                accessorKey: 'updated_at',
                header: 'Ngày cập nhật',
                size: 180,
                Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString('vi-VN'),
                filterVariant: 'date-range',
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
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <MaterialReactTable
                columns={columns}
                data={suppliers}
                state={{ isLoading: loading }}
                enableRowActions
                positionActionsColumn="last"
                enableColumnFilters
                enableFacetedValues
                renderTopToolbarCustomActions={() => (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenModal('create')}
                    >
                        Thêm nhà cung cấp
                    </Button>
                )}
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <IconButton color="primary" onClick={() => handleOpenModal('edit', row.original)}>
                            <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDelete(row.original)}>
                            <DeleteIcon />
                        </IconButton>
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
                localization={{
                    filterBy: 'Lọc theo',
                    filterAll: 'Tất cả',
                    // Thêm các bản dịch khác nếu cần
                }}
            />

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
                        <Button onClick={handleCloseModal} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={submitting}
                        >
                            {submitting ? <CircularProgress size={24} /> : (modalMode === 'create' ? 'Tạo' : 'Cập nhật')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default SupplierManagement;

