import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { createUser, updateUser } from '../../api/userApi';
import { getAllStores } from '../../api/storeApi';
import { PrimaryButton, SecondaryButton, ToastNotification } from './index';

const UserDialog = ({ open, onClose, editingUser, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stores, setStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        role: 'Cashier',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        store_id: '',
        is_active: true,
        status: 'active'
    });

    const ROLES = ['Admin', 'CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'];
    
    // Roles that require store assignment
    const STORE_REQUIRED_ROLES = ['Store_Manager', 'Cashier'];

    // Load stores when dialog opens
    useEffect(() => {
        if (open) {
            loadStores();
        }
    }, [open]);

    const loadStores = async () => {
        setLoadingStores(true);
        try {
            const response = await getAllStores();
            console.log('Stores response:', response);
            if (response.err === 0) {
                setStores(response.data || []);
                console.log('Stores loaded:', response.data);
            } else {
                console.error('Failed to load stores:', response.msg);
                ToastNotification.warning('Không thể tải danh sách cửa hàng');
            }
        } catch (error) {
            console.error('Error loading stores:', error);
            ToastNotification.error('Lỗi khi tải danh sách cửa hàng');
        } finally {
            setLoadingStores(false);
        }
    };

    // Reset form when dialog opens/closes or editing user changes
    useEffect(() => {
        if (open) {
            if (editingUser) {
                setFormData({
                    username: editingUser.username || '',
                    email: editingUser.email || '',
                    full_name: editingUser.full_name || '',
                    role: editingUser.role || 'Cashier',
                    password: '',
                    confirmPassword: '',
                    phone: editingUser.phone || '',
                    address: editingUser.address || '',
                    store_id: editingUser.store_id || '',
                    is_active: editingUser.is_active !== false,
                    status: editingUser.status || 'active'
                });
            } else {
                setFormData({
                    username: '', // Will be auto-generated from email
                    email: '',
                    full_name: '',
                    role: 'Cashier',
                    password: '',
                    confirmPassword: '',
                    phone: '',
                    address: '',
                    store_id: '',
                    is_active: true,
                    status: 'active'
                });
            }
            setError(null);
        }
    }, [open, editingUser]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        // For new users, email and full_name are required
        if (!editingUser) {
            if (!formData.email || !formData.email.trim()) {
                setError('Email là bắt buộc');
                return false;
            }
            if (!formData.full_name || !formData.full_name.trim()) {
                setError('Họ tên là bắt buộc');
                return false;
            }
        }
        // Email validation
        if (formData.email && !formData.email.includes('@')) {
            setError('Email không hợp lệ');
            return false;
        }
        // Password validation only for editing (when password is provided)
        if (editingUser && formData.password) {
            if (formData.password !== formData.confirmPassword) {
                setError('Password và Confirm Password không khớp');
                return false;
            }
            if (formData.password.length < 6) {
                setError('Password phải có ít nhất 6 ký tự');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                email: formData.email || null,
                full_name: formData.full_name || null,
                role: formData.role,
                phone: formData.phone || null,
                address: formData.address || null,
                store_id: formData.store_id ? parseInt(formData.store_id) : null,
                is_active: formData.is_active,
                status: formData.status
            };

            // For new users, automatically set password to "123" and status to active
            // Auto-generate username from email
            // For editing users, only add password if provided
            if (editingUser) {
                // Keep existing username when editing
                submitData.username = formData.username;
                if (formData.password) {
                    submitData.password = formData.password;
                }
            } else {
                // Auto-generate username from email (before @)
                if (formData.email) {
                    submitData.username = formData.email.split('@')[0];
                }
                // Auto-generate password for new users
                submitData.password = '123';
                // Automatically set status to active for new users
                submitData.is_active = true;
                submitData.status = 'active';
            }

            let response;
            if (editingUser) {
                response = await updateUser(editingUser.user_id, submitData);
            } else {
                response = await createUser(submitData);
            }

            if (response.err === 0) {
                ToastNotification.success(response.msg || (editingUser ? 'Cập nhật người dùng thành công' : 'Tạo người dùng thành công'));
                onSuccess();
                onClose();
            } else {
                setError(response.msg || 'Lỗi không xác định');
                ToastNotification.error(response.msg || 'Lỗi không xác định');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message || 'Có lỗi xảy ra';
            setError(errorMsg);
            ToastNotification.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {editingUser ? 'Chỉnh sửa Người dùng' : 'Tạo Người dùng mới'}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {!editingUser && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Mật khẩu mặc định sẽ được tự động tạo là: <strong>123</strong>
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Email - Required for new users */}
                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        required={!editingUser}
                        disabled={editingUser && true} // Prevent changing email when editing
                    />

                    {/* Full Name - Required for new users */}
                    <TextField
                        label="Họ tên"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        required={!editingUser}
                    />

                    {/* Role */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Vai trò</InputLabel>
                        <Select
                            label="Vai trò"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            {ROLES.map(role => (
                                <MenuItem key={role} value={role}>
                                    {role}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Store - Only show for roles that require store */}
                    {STORE_REQUIRED_ROLES.includes(formData.role) && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Cửa hàng</InputLabel>
                            <Select
                                label="Cửa hàng"
                                name="store_id"
                                value={formData.store_id || ''}
                                onChange={handleChange}
                                disabled={loadingStores}
                            >
                                <MenuItem value="">
                                    <em>Không chọn</em>
                                </MenuItem>
                                {stores.length > 0 ? (
                                    stores.map(store => (
                                        <MenuItem key={store.store_id} value={String(store.store_id)}>
                                            {store.name}
                                        </MenuItem>
                                    ))
                                ) : (
                                    <MenuItem value="" disabled>
                                        Không có cửa hàng nào
                                    </MenuItem>
                                )}
                            </Select>
                            {loadingStores && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                        </FormControl>
                    )}

                    {/* Phone */}
                    <TextField
                        label="Số điện thoại"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                    />

                    {/* Address */}
                    <TextField
                        label="Địa chỉ"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                    />

                    {/* Password - Only for editing users (new users get auto password "123") */}
                    {editingUser && (
                        <>
                            <TextField
                                label="Mật khẩu mới (để trống nếu không thay đổi)"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            />
                            {formData.password && (
                                <TextField
                                    label="Xác nhận mật khẩu"
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    required
                                />
                            )}
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <SecondaryButton
                    onClick={onClose}
                    disabled={loading}
                >
                    Hủy
                </SecondaryButton>
                <PrimaryButton
                    onClick={handleSubmit}
                    disabled={loading}
                    loading={loading}
                >
                    {editingUser ? 'Cập nhật' : 'Tạo'}
                </PrimaryButton>
            </DialogActions>
        </Dialog>
    );
};

export default UserDialog;
