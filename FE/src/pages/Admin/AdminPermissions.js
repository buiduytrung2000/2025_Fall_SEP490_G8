// src/pages/Admin/AdminPermissions.js
import React, { useState, useEffect, useMemo } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
} from '@mui/material';
import {
    PrimaryButton,
    SecondaryButton,
    ActionButton,
    ToastNotification,
    Icon
} from '../../components/common';

const AdminPermissions = () => {
    // Danh sách vai trò mặc định
    const DEFAULT_ROLES = [
        { code: 'Admin', name: 'Admin' },
        { code: 'CEO', name: 'CEO' },
        { code: 'Store_Manager', name: 'Quản lý cửa hàng' },
        { code: 'Cashier', name: 'Thu ngân' },
        { code: 'Warehouse', name: 'Kho' },
        { code: 'Supplier', name: 'Nhà cung cấp' }
    ];

    const [roles, setRoles] = useState([]);
    const [editingRole, setEditingRole] = useState(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [roleName, setRoleName] = useState('');

    useEffect(() => {
        loadRoles();
    }, []);

    // Load roles từ localStorage hoặc dùng mặc định
    const loadRoles = () => {
        try {
            const saved = localStorage.getItem('role_config');
            if (saved) {
                setRoles(JSON.parse(saved));
            } else {
                setRoles(DEFAULT_ROLES);
                localStorage.setItem('role_config', JSON.stringify(DEFAULT_ROLES));
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            setRoles(DEFAULT_ROLES);
        }
    };

    // Save roles to localStorage
    const saveRoles = (updatedRoles) => {
        try {
            localStorage.setItem('role_config', JSON.stringify(updatedRoles));
            setRoles(updatedRoles);
        } catch (error) {
            console.error('Error saving roles:', error);
            ToastNotification.error('Lỗi khi lưu cấu hình vai trò');
        }
    };

    const handleEditClick = (role) => {
        setEditingRole(role);
        setRoleName(role.name);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        setEditingRole(null);
        setRoleName('');
    };

    const handleSaveRole = () => {
        if (!editingRole || !roleName.trim()) {
            ToastNotification.error('Vui lòng nhập tên vai trò');
            return;
        }

        const updatedRoles = roles.map(role =>
            role.code === editingRole.code
                ? { ...role, name: roleName.trim() }
                : role
        );

        saveRoles(updatedRoles);
        ToastNotification.success('Cập nhật tên vai trò thành công');
        handleCloseEditDialog();
    };

    const handleResetRole = (role) => {
        const defaultRole = DEFAULT_ROLES.find(r => r.code === role.code);
        if (!defaultRole) return;

        const updatedRoles = roles.map(r =>
            r.code === role.code
                ? { ...r, name: defaultRole.name }
                : r
        );

        saveRoles(updatedRoles);
        ToastNotification.success('Đã khôi phục tên vai trò về mặc định');
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'Mã vai trò',
                size: 150,
            },
            {
                accessorKey: 'name',
                header: 'Tên hiển thị',
                size: 200,
            },
        ],
        [],
    );

    const table = useMaterialReactTable({
        columns,
        data: roles,
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                <ActionButton
                    icon={<Icon name="Edit" />}
                    action="edit"
                    onClick={() => handleEditClick(row.original)}
                />
            </Box>
        ),
        localization: {
            actions: 'Hành động',
            search: 'Tìm kiếm',
            noRecordsToDisplay: 'Không có dữ liệu',
            showHideColumns: 'Hiển thị/Ẩn cột',
            showHideFilters: 'Hiển thị/Ẩn bộ lọc',
            showHideSearch: 'Hiển thị/Ẩn tìm kiếm',
        },
    });

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={700} mb={3}>
                Quản lý Phân quyền Người dùng
            </Typography>

            <MaterialReactTable table={table} />

            {/* Edit Role Name Dialog */}
            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Chỉnh sửa tên vai trò</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Mã vai trò: <strong>{editingRole?.code}</strong>
                        </Typography>
                        <TextField
                            fullWidth
                            label="Tên hiển thị"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="Nhập tên hiển thị cho vai trò"
                            sx={{ mb: 2 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Tên này sẽ được hiển thị trong hệ thống thay cho mã vai trò.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => {
                        if (editingRole) {
                            handleResetRole(editingRole);
                        }
                        handleCloseEditDialog();
                    }}>
                        Khôi phục mặc định
                    </SecondaryButton>
                    <SecondaryButton onClick={handleCloseEditDialog}>
                        Hủy
                    </SecondaryButton>
                    <PrimaryButton onClick={handleSaveRole}>
                        Lưu
                    </PrimaryButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminPermissions;
