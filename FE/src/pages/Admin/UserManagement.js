import React, { useState, useEffect, useMemo } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
    MRT_ColumnDef,
} from 'material-react-table';
import {
    Box,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { getAllUsers, deleteUser, reactivateUser } from '../../api/userApi';
import UserDialog from '../../components/common/UserDialog';
import { useAuth } from '../../contexts/AuthContext';
import './UserManagement.css';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
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
                toast.error(response.msg || 'Không thể tải danh sách người dùng');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message || 'Có lỗi xảy ra';
            setError(errorMsg);
            toast.error(errorMsg);
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

    const handleDeleteClick = (userToDelete) => {
        // Prevent self-deletion
        if (userToDelete.user_id === currentUser.user_id) {
            toast.warning('Bạn không thể vô hiệu hóa tài khoản của chính mình');
            return;
        }
        setDeleteConfirm(userToDelete);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        try {
            const response = await deleteUser(deleteConfirm.user_id);
            if (response.err === 0) {
                toast.success('Người dùng đã được vô hiệu hóa thành công');
                fetchUsers();
            } else {
                toast.error(response.msg || 'Lỗi khi vô hiệu hóa người dùng');
            }
        } catch (error) {
            toast.error('Lỗi khi vô hiệu hóa người dùng');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const handleReactivate = async (userToReactivate) => {
        try {
            const response = await reactivateUser(userToReactivate.user_id);
            if (response.err === 0) {
                toast.success('Người dùng đã được kích hoạt lại thành công');
                fetchUsers();
            } else {
                toast.error(response.msg || 'Lỗi khi kích hoạt lại người dùng');
            }
        } catch (error) {
            toast.error('Lỗi khi kích hoạt lại người dùng');
        }
    };

    // Filter users based on search and role filter
    const filteredUsers = useMemo(() => {
        let filtered = users;

        if (globalFilter) {
            const searchTerm = globalFilter.toLowerCase();
            filtered = filtered.filter(user =>
                user.username?.toLowerCase().includes(searchTerm) ||
                user.email?.toLowerCase().includes(searchTerm) ||
                user.full_name?.toLowerCase().includes(searchTerm)
            );
        }

        if (roleFilter) {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        return filtered;
    }, [users, globalFilter, roleFilter]);

    // Calculate role statistics
    const roleStats = useMemo(() => {
        const stats = {
            'Admin': 0,
            'CEO': 0,
            'Store_Manager': 0,
            'Cashier': 0,
            'Warehouse': 0,
            'Supplier': 0,
            'Total': users.length
        };

        users.forEach(user => {
            if (stats.hasOwnProperty(user.role)) {
                stats[user.role]++;
            }
        });

        return stats;
    }, [users]);

    // Role display names and colors
    const roleConfig = {
        'Admin': { label: 'Admin', color: '#dc3545', icon: '👤' },
        'CEO': { label: 'CEO', color: '#007bff', icon: '👨‍💼' },
        'Store_Manager': { label: 'Manager', color: '#28a745', icon: '🏪' },
        'Cashier': { label: 'Cashier', color: '#ffc107', icon: '💳' },
        'Warehouse': { label: 'Kho', color: '#17a2b8', icon: '📦' },
        'Supplier': { label: 'NCC', color: '#6f42c1', icon: '🚚' }
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
                accessorKey: 'username',
                header: 'Username',
                size: 120,
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
                    const roleColors = {
                        'Admin': '#dc3545',
                        'CEO': '#007bff',
                        'Store_Manager': '#28a745',
                        'Cashier': '#ffc107',
                        'Warehouse': '#17a2b8',
                        'Supplier': '#6f42c1'
                    };
                    return (
                        <Chip
                            label={role}
                            size="small"
                            sx={{
                                backgroundColor: roleColors[role] || '#6c757d',
                                color: 'white',
                                fontWeight: 'bold'
                            }}
                        />
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                size: 100,
                Cell: ({ cell }) => {
                    const status = cell.getValue();
                    const statusColors = {
                        'active': '#28a745',
                        'inactive': '#6c757d',
                        'suspended': '#dc3545'
                    };
                    const statusLabels = {
                        'active': 'Hoạt động',
                        'inactive': 'Không hoạt động',
                        'suspended': 'Bị tạm dừng'
                    };
                    return (
                        <Chip
                            label={statusLabels[status] || status}
                            size="small"
                            sx={{
                                backgroundColor: statusColors[status] || '#6c757d',
                                color: 'white'
                            }}
                        />
                    );
                },
            },
            {
                accessorKey: 'is_active',
                header: 'Hoạt động',
                size: 80,
                Cell: ({ cell }) => (
                    <Chip
                        label={cell.getValue() ? 'Có' : 'Không'}
                        size="small"
                        color={cell.getValue() ? 'success' : 'error'}
                        variant="outlined"
                    />
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
            return (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleOpenDialog(userData)}
                        sx={{ textTransform: 'none' }}
                    >
                        Sửa
                    </Button>
                    {userData.is_active ? (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Delete />}
                            onClick={() => handleDeleteClick(userData)}
                            disabled={userData.user_id === currentUser.user_id}
                            sx={{ textTransform: 'none' }}
                        >
                            Vô hiệu hóa
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            onClick={() => handleReactivate(userData)}
                            sx={{ textTransform: 'none' }}
                        >
                            Kích hoạt
                        </Button>
                    )}
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
        <div className="user-management-container">
            <div className="user-management-header">
                <div>
                    <h2>Quản lý Người dùng</h2>
                    <p>Quản lý danh sách tất cả người dùng trong hệ thống</p>
                </div>
                <div className="header-actions">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                    >
                        Thêm Người dùng
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchUsers}
                        disabled={loading}
                    >
                        Làm mới
                    </Button>
                </div>
            </div>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Role Statistics Section */}
            <div className="stats-section">
                <div className="stats-title">Thống kê tài khoản</div>
                <div className="stats-grid">
                    {Object.keys(roleConfig).map(role => (
                        <div key={role} className="stat-card" style={{ borderLeftColor: roleConfig[role].color }}>
                            <div className="stat-icon">{roleConfig[role].icon}</div>
                            <div className="stat-info">
                                <div className="stat-label">{roleConfig[role].label}</div>
                                <div className="stat-value">{roleStats[role]}</div>
                            </div>
                        </div>
                    ))}
                    <div key="total" className="stat-card stat-card-total">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <div className="stat-label">Tổng cộng</div>
                            <div className="stat-value">{roleStats['Total']}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="filters-section">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo username, email, hoặc tên..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="filter-input"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="Admin">Admin</option>
                    <option value="CEO">CEO</option>
                    <option value="Store_Manager">Store Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Supplier">Supplier</option>
                </select>
            </div>

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

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
            >
                <DialogTitle>Xác nhận vô hiệu hóa người dùng</DialogTitle>
                <DialogContent>
                    Bạn có chắc chắn muốn vô hiệu hóa người dùng <strong>{deleteConfirm?.username}</strong> không?
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        variant="secondary"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDelete}
                    >
                        Vô hiệu hóa
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default UserManagement;
