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
    FormControlLabel,
    Checkbox,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { Button } from 'react-bootstrap';
import { createUser, updateUser } from '../../api/userApi';
import { toast } from 'react-toastify';

const UserDialog = ({ open, onClose, editingUser, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        role: 'Cashier',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        is_active: true,
        status: 'active'
    });

    const ROLES = ['Admin', 'CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'];
    const STATUSES = ['active', 'inactive', 'suspended'];

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
                    is_active: editingUser.is_active !== false,
                    status: editingUser.status || 'active'
                });
            } else {
                setFormData({
                    username: '',
                    email: '',
                    full_name: '',
                    role: 'Cashier',
                    password: '',
                    confirmPassword: '',
                    phone: '',
                    address: '',
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
        if (!formData.username.trim()) {
            setError('Username không được để trống');
            return false;
        }
        if (!editingUser && !formData.password) {
            setError('Password không được để trống khi tạo người dùng mới');
            return false;
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('Password và Confirm Password không khớp');
            return false;
        }
        if (formData.password && formData.password.length < 6) {
            setError('Password phải có ít nhất 6 ký tự');
            return false;
        }
        if (formData.email && !formData.email.includes('@')) {
            setError('Email không hợp lệ');
            return false;
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
                username: formData.username,
                email: formData.email || null,
                full_name: formData.full_name || null,
                role: formData.role,
                phone: formData.phone || null,
                address: formData.address || null,
                is_active: formData.is_active,
                status: formData.status
            };

            // Add password only if provided
            if (formData.password) {
                submitData.password = formData.password;
            }

            let response;
            if (editingUser) {
                response = await updateUser(editingUser.user_id, submitData);
            } else {
                response = await createUser(submitData);
            }

            if (response.err === 0) {
                toast.success(response.msg || (editingUser ? 'Cập nhật người dùng thành công' : 'Tạo người dùng thành công'));
                onSuccess();
                onClose();
            } else {
                setError(response.msg || 'Lỗi không xác định');
                toast.error(response.msg || 'Lỗi không xác định');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message || 'Có lỗi xảy ra';
            setError(errorMsg);
            toast.error(errorMsg);
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

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Username */}
                    <TextField
                        label="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={editingUser && true} // Prevent changing username
                        fullWidth
                        size="small"
                        required
                    />

                    {/* Email */}
                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                    />

                    {/* Full Name */}
                    <TextField
                        label="Họ tên"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        fullWidth
                        size="small"
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

                    {/* Status */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            label="Trạng thái"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            {STATUSES.map(status => (
                                <MenuItem key={status} value={status}>
                                    {status === 'active' ? 'Hoạt động' : status === 'inactive' ? 'Không hoạt động' : 'Bị tạm dừng'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Password - Only for new users */}
                    {!editingUser ? (
                        <>
                            <TextField
                                label="Mật khẩu"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                required
                            />
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
                        </>
                    ) : (
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

                    {/* Is Active */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                        }
                        label="Hoạt động"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                >
                    Hủy
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    ) : null}
                    {editingUser ? 'Cập nhật' : 'Tạo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserDialog;
