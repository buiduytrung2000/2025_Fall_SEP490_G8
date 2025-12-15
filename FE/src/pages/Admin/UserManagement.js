import React, { useState, useEffect, useMemo } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
    MRT_ColumnDef,
} from 'material-react-table';
import {
    Box,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    Stack,
    InputAdornment,
    Switch,
    Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getAllUsers, deleteUser, reactivateUser } from '../../api/userApi';
import UserDialog from '../../components/common/UserDialog';
import { useAuth } from '../../contexts/AuthContext';
import {
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    ActionButton,
    ToastNotification,
    Alert,
    Icon
} from '../../components/common';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [toggleConfirm, setToggleConfirm] = useState(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getAllUsers();
            if (response.err === 0) {
                setUsers(response.response || []);
            } else {
                setError(response.msg || 'Không thể tải danh sách người dùng');
                ToastNotification.error(response.msg || 'Không thể tải danh sách người dùng');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message || 'Có lỗi xảy ra';
            setError(errorMsg);
            ToastNotification.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (userToEdit = null) => {
        setEditingUser(userToEdit);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingUser(null);
    };

    const handleSuccess = () => {
        fetchUsers();
    };

    const handleToggleClick = (user, newStatus) => {
        // Prevent self-deactivation
        if (user.user_id === currentUser.user_id && !newStatus) {
            ToastNotification.warning('Bạn không thể vô hiệu hóa tài khoản của chính mình');
            return;
        }
        setToggleConfirm({ user, newStatus });
    };

    const confirmToggle = async () => {
        if (!toggleConfirm) return;

        const { user, newStatus } = toggleConfirm;

        try {
            let response;
            if (newStatus) {
                // Reactivate user
                response = await reactivateUser(user.user_id);
            } else {
                // Deactivate user
                response = await deleteUser(user.user_id);
            }

            if (response.err === 0) {
                ToastNotification.success(
                    newStatus 
                        ? 'Người dùng đã được kích hoạt lại thành công'
                        : 'Người dùng đã được vô hiệu hóa thành công'
                );
                fetchUsers();
            } else {
                ToastNotification.error(response.msg || 'Lỗi khi thay đổi trạng thái người dùng');
                // Refresh to revert Switch state if error
                fetchUsers();
            }
        } catch (error) {
            ToastNotification.error('Lỗi khi thay đổi trạng thái người dùng');
            // Refresh to revert Switch state if error
            fetchUsers();
        } finally {
            setToggleConfirm(null);
        }
    };

    const handleCancelToggle = () => {
        // Refresh to revert Switch state when cancelled
        fetchUsers();
        setToggleConfirm(null);
    };

    // Filter users based on search and role filter
    const filteredUsers = useMemo(() => {
        let filtered = users;

        if (globalFilter) {
            const searchTerm = globalFilter.toLowerCase();
            filtered = filtered.filter(user =>
                user.email?.toLowerCase().includes(searchTerm) ||
                user.full_name?.toLowerCase().includes(searchTerm)
            );
        }

        if (roleFilter) {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        return filtered;
    }, [users, globalFilter, roleFilter]);

    // Role display names
    const roleConfig = {
        'Admin': { label: 'Admin' },
        'CEO': { label: 'CEO' },
        'Store_Manager': { label: 'Manager' },
        'Cashier': { label: 'Cashier' },
        'Warehouse': { label: 'Kho' },
        'Supplier': { label: 'NCC' }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'user_id',
                header: 'ID',
                size: 50,
                Cell: ({ row, table }) => {
                    const index = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1;
                    return <span>{index}</span>;
                },
            },
            {
                accessorKey: 'email',
                header: 'Email',
                size: 150,
            },
            {
                accessorKey: 'full_name',
                header: 'Họ tên',
                size: 150,
            },
            {
                accessorKey: 'role',
                header: 'Vai trò',
                size: 120,
                Cell: ({ cell }) => {
                    const role = cell.getValue();
                    const config = roleConfig[role] || { label: role };
                    return <Typography variant="body2">{config.label}</Typography>;
                },
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                size: 100,
                Cell: ({ cell }) => {
                    const status = cell.getValue();
                    const statusLabels = {
                        'active': 'Hoạt động',
                        'inactive': 'Không hoạt động',
                        'suspended': 'Bị tạm dừng'
                    };
                    return <Typography variant="body2">{statusLabels[status] || status}</Typography>;
                },
            },
            {
                accessorKey: 'is_active',
                header: 'Hoạt động',
                size: 80,
                Cell: ({ cell }) => (
                    <Typography variant="body2">{cell.getValue() ? 'Có' : 'Không'}</Typography>
                ),
            },
            {
                accessorKey: 'created_at',
                header: 'Ngày tạo',
                size: 150,
                Cell: ({ cell }) => {
                    const date = cell.getValue();
                    return new Date(date).toLocaleString('vi-VN');
                },
            },
        ],
        [],
    );

    const table = useMaterialReactTable({
        columns,
        data: filteredUsers,
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => {
            const userData = row.original;
            const isCurrentUser = userData.user_id === currentUser.user_id;
            
            return (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <ActionButton
                        icon={<Icon name="Edit" />}
                        action="edit"
                        onClick={() => handleOpenDialog(userData)}
                    />
                    <Tooltip title={userData.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                        <Switch
                            checked={userData.is_active}
                            onChange={(e) => handleToggleClick(userData, e.target.checked)}
                            disabled={isCurrentUser && !userData.is_active}
                            size="small"
                            color="primary"
                        />
                    </Tooltip>
                </Box>
            );
        },
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        localization: {
            actions: 'Hành động',
            search: 'Tìm kiếm',
            noRecordsMessage: 'Không có dữ liệu',
            pagination: {
                pageIndex: 'Trang',
                pageSize: 'Số hàng',
                rowsPerPage: 'Hàng mỗi trang',
                goToFirstPage: 'Tới trang đầu',
                goToLastPage: 'Tới trang cuối',
                goToNextPage: 'Tới trang sau',
                goToPreviousPage: 'Tới trang trước',
                backToTop: 'Quay lại đầu',
                numberOfRows: 'hàng',
                of: 'của',
                to: 'tới',
            },
        },
    });

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                        Quản lý Người dùng
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý danh sách tất cả người dùng trong hệ thống
                    </Typography>
                </Box>
                <PrimaryButton
                    startIcon={<Icon name="Add" />}
                    onClick={() => handleOpenDialog()}
                >
                    Thêm Người dùng
                </PrimaryButton>
            </Box>

            {error && (
                <Alert severity="error" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm kiếm theo email hoặc tên..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Vai trò</InputLabel>
                        <Select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            label="Vai trò"
                        >
                            <MenuItem value="">Tất cả vai trò</MenuItem>
                            {Object.keys(roleConfig).map(role => (
                                <MenuItem key={role} value={role}>
                                    {roleConfig[role].label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <MaterialReactTable table={table} />
            )}

            {/* User Dialog */}
            <UserDialog
                open={openDialog}
                onClose={handleCloseDialog}
                editingUser={editingUser}
                onSuccess={handleSuccess}
            />

            {/* Toggle Confirmation Dialog */}
            <Dialog
                open={!!toggleConfirm}
                onClose={handleCancelToggle}
            >
                <DialogTitle>
                    {toggleConfirm?.newStatus ? 'Xác nhận kích hoạt người dùng' : 'Xác nhận vô hiệu hóa người dùng'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {toggleConfirm?.newStatus ? (
                            <>
                                Bạn có chắc chắn muốn kích hoạt lại người dùng <strong>{toggleConfirm?.user?.full_name || toggleConfirm?.user?.email}</strong> không?
                            </>
                        ) : (
                            <>
                                Bạn có chắc chắn muốn vô hiệu hóa người dùng <strong>{toggleConfirm?.user?.full_name || toggleConfirm?.user?.email}</strong> không?
                            </>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <SecondaryButton
                        onClick={handleCancelToggle}
                    >
                        Hủy
                    </SecondaryButton>
                    {toggleConfirm?.newStatus ? (
                        <PrimaryButton
                            onClick={confirmToggle}
                        >
                            Kích hoạt
                        </PrimaryButton>
                    ) : (
                        <DangerButton
                            onClick={confirmToggle}
                        >
                            Vô hiệu hóa
                        </DangerButton>
                    )}
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default UserManagement;
