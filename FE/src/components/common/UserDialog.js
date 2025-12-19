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
    Alert,
    Typography
} from '@mui/material';
import { createUser, updateUser } from '../../api/userApi';
import { getAllStores } from '../../api/storeApi';
import { getFutureSchedulesCountByEmployeeAndStore, deleteFutureSchedulesByEmployeeAndStore } from '../../api/scheduleApi';
import { PrimaryButton, SecondaryButton, DangerButton, ToastNotification } from './index';

const UserDialog = ({ open, onClose, editingUser, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stores, setStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [originalStoreId, setOriginalStoreId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [futureSchedulesCount, setFutureSchedulesCount] = useState(0);
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
                // Normalize store_id: convert to number if exists, otherwise null
                const storeIdValue = editingUser.store_id;
                const originalStoreIdValue = (storeIdValue !== null && storeIdValue !== undefined && storeIdValue !== '') 
                    ? (typeof storeIdValue === 'number' ? storeIdValue : parseInt(storeIdValue))
                    : null;
                console.log('Setting originalStoreId:', { 
                    raw: storeIdValue, 
                    normalized: originalStoreIdValue,
                    type: typeof storeIdValue
                });
                setOriginalStoreId(originalStoreIdValue);
                setFormData({
                    username: editingUser.username || '',
                    email: editingUser.email || '',
                    full_name: editingUser.full_name || '',
                    role: editingUser.role || 'Cashier',
                    password: '',
                    confirmPassword: '',
                    phone: editingUser.phone || '',
                    address: editingUser.address || '',
                    store_id: storeIdValue ? String(storeIdValue) : '',
                    is_active: editingUser.is_active !== false,
                    status: editingUser.status || 'active'
                });
            } else {
                setOriginalStoreId(null);
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
            // Reset confirmation dialog state
            setShowDeleteConfirm(false);
            setPendingUpdate(null);
            setFutureSchedulesCount(0);
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

        // Check if store_id is being changed for an existing employee
        if (editingUser) {
            // Normalize store IDs: convert to integer or null
            const oldStoreId = originalStoreId !== null && originalStoreId !== undefined && originalStoreId !== ''
                ? Number(originalStoreId)
                : null;
            const newStoreId = formData.store_id && formData.store_id !== '' 
                ? Number(formData.store_id) 
                : null;
            
            console.log('=== Store Change Check ===');
            console.log('User ID:', editingUser.user_id);
            console.log('Original Store ID (raw):', originalStoreId);
            console.log('Form Store ID (raw):', formData.store_id);
            console.log('Old Store ID (normalized):', oldStoreId);
            console.log('New Store ID (normalized):', newStoreId);
            console.log('Is different?', oldStoreId !== newStoreId);
            console.log('Old store exists?', oldStoreId !== null && !isNaN(oldStoreId));
            
            // If store_id is being changed and old store exists, check for future schedules
            if (oldStoreId !== null && !isNaN(oldStoreId) && oldStoreId !== newStoreId) {
                console.log('✅ Store is being changed - will check for future schedules');
                try {
                    console.log('Checking future schedules for store:', oldStoreId);
                    const countResponse = await getFutureSchedulesCountByEmployeeAndStore(
                        editingUser.user_id,
                        oldStoreId
                    );

                    console.log('Future schedules count response:', countResponse);

                    if (countResponse.err === 0) {
                        const count = countResponse.data?.count || 0;
                        console.log('Future schedules count:', count);
                        // Always show confirmation dialog when changing store, even if count is 0
                        setFutureSchedulesCount(count);
                        setPendingUpdate({ formData });
                        setShowDeleteConfirm(true);
                        return;
                    } else {
                        console.warn('Failed to get future schedules count:', countResponse.msg);
                        // Even if API fails, still show confirmation dialog
                        setFutureSchedulesCount(0);
                        setPendingUpdate({ formData });
                        setShowDeleteConfirm(true);
                        return;
                    }
                } catch (error) {
                    console.error('Error checking future schedules:', error);
                    // Even if check fails, still show confirmation dialog
                    setFutureSchedulesCount(0);
                    setPendingUpdate({ formData });
                    setShowDeleteConfirm(true);
                    return;
                }
            } else {
                console.log('No store change or no old store - skipping schedule check');
            }
        }

        // Proceed with update if no confirmation needed
        await performUpdate();
    };

    const performUpdate = async () => {
        setLoading(true);

        try {
            // Check if store_id is being changed and we need to delete schedules
            // Use pendingUpdate if available, otherwise use current formData
            const dataToCheck = pendingUpdate?.formData || formData;
            
            if (editingUser) {
                // Normalize store IDs
                const oldStoreId = originalStoreId !== null && originalStoreId !== undefined && originalStoreId !== ''
                    ? Number(originalStoreId)
                    : null;
                const newStoreId = dataToCheck.store_id && dataToCheck.store_id !== '' 
                    ? Number(dataToCheck.store_id) 
                    : null;
                
                console.log('performUpdate - Checking schedule deletion:', {
                    oldStoreId,
                    newStoreId,
                    isDifferent: oldStoreId !== newStoreId
                });
                
                // If store_id is being changed and old store exists, delete future schedules
                if (oldStoreId !== null && !isNaN(oldStoreId) && oldStoreId !== newStoreId) {
                    try {
                        console.log('Deleting future schedules for user:', editingUser.user_id, 'store:', oldStoreId);
                        const deleteResponse = await deleteFutureSchedulesByEmployeeAndStore(
                            editingUser.user_id,
                            oldStoreId
                        );

                        console.log('Delete response:', deleteResponse);

                        if (deleteResponse.err === 0) {
                            const deletedCount = deleteResponse.data?.deletedCount || 0;
                            if (deletedCount > 0) {
                                ToastNotification.success(
                                    `Đã xóa ${deletedCount} lịch làm việc tương lai tại cửa hàng cũ`
                                );
                            } else {
                                console.log('No schedules to delete (count = 0)');
                            }
                        } else {
                            console.warn('Không thể xóa lịch làm việc:', deleteResponse.msg);
                            ToastNotification.warning('Không thể xóa lịch làm việc: ' + deleteResponse.msg);
                        }
                    } catch (error) {
                        console.error('Error deleting schedules:', error);
                        ToastNotification.error('Lỗi khi xóa lịch làm việc: ' + (error.message || 'Lỗi không xác định'));
                        // Continue with update even if schedule deletion fails
                    }
                } else {
                    console.log('No schedule deletion needed:', {
                        oldStoreId,
                        newStoreId,
                        condition: oldStoreId !== null && !isNaN(oldStoreId) && oldStoreId !== newStoreId
                    });
                }
            }

            const dataToUse = pendingUpdate?.formData || formData;
            const submitData = {
                email: dataToUse.email || null,
                full_name: dataToUse.full_name || null,
                role: dataToUse.role,
                phone: dataToUse.phone || null,
                address: dataToUse.address || null,
                store_id: dataToUse.store_id ? parseInt(dataToUse.store_id) : null,
                is_active: dataToUse.is_active,
                status: dataToUse.status
            };

            // For new users, automatically set password to "123" and status to active
            // Auto-generate username from email
            // For editing users, only add password if provided
            if (editingUser) {
                // Keep existing username when editing
                submitData.username = dataToUse.username;
                if (dataToUse.password) {
                    submitData.password = dataToUse.password;
                }
            } else {
                // Auto-generate username from email (before @)
                if (dataToUse.email) {
                    submitData.username = dataToUse.email.split('@')[0];
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
                // Reset states
                setShowDeleteConfirm(false);
                setPendingUpdate(null);
                setFutureSchedulesCount(0);
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

    const handleConfirmDelete = () => {
        setShowDeleteConfirm(false);
        performUpdate();
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setPendingUpdate(null);
        setFutureSchedulesCount(0);
    };

    return (
        <>
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

        {/* Confirmation Dialog for Deleting Future Schedules */}
        <Dialog
            open={showDeleteConfirm}
            onClose={handleCancelDelete}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                Xác nhận xóa lịch làm việc
            </DialogTitle>
            <DialogContent>
                {futureSchedulesCount > 0 ? (
                    <>
                        <Typography>
                            Nhân viên này có <strong>{futureSchedulesCount}</strong> lịch làm việc tương lai tại cửa hàng cũ.
                        </Typography>
                        <Typography sx={{ mt: 2 }}>
                            Bạn có muốn xóa các lịch làm việc này trước khi chuyển nhân viên sang cửa hàng mới không?
                        </Typography>
                    </>
                ) : (
                    <Typography>
                        Bạn đang chuyển nhân viên sang cửa hàng mới. Nếu nhân viên có lịch làm việc tương lai tại cửa hàng cũ, các lịch đó sẽ bị xóa.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <SecondaryButton
                    onClick={handleCancelDelete}
                    disabled={loading}
                >
                    Hủy
                </SecondaryButton>
                <DangerButton
                    onClick={handleConfirmDelete}
                    disabled={loading}
                    loading={loading}
                >
                    Xóa và cập nhật
                </DangerButton>
            </DialogActions>
        </Dialog>
        </>
    );
};

export default UserDialog;
