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
    Divider,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { getAllUsers, deleteUser, reactivateUser } from '../../api/userApi';
import { getAllStores } from '../../api/storeApi';
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
    const [storeFilter, setStoreFilter] = useState('');
    const [stores, setStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [openViewDialog, setOpenViewDialog] = useState(false);

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers();
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoadingStores(true);
            const response = await getAllStores();
            if (response.err === 0 && response.data) {
                setStores(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setLoadingStores(false);
        }
    };

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

    // Filter users based on search, role filter, and store filter
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

        if (storeFilter) {
            filtered = filtered.filter(user => {
                const userStoreId = user.store_id?.toString() || '';
                return userStoreId === storeFilter;
            });
        }

        return filtered;
    }, [users, globalFilter, roleFilter, storeFilter]);

    // Role display names
    const roleConfig = {
        'Admin': { label: 'Quản trị viên' },
        'CEO': { label: 'Giám đốc điều hành' },
        'Store_Manager': { label: 'Quản lý cửa hàng' },
        'Cashier': { label: 'Thu ngân' },
        'Warehouse': { label: 'Kho' },
        'Supplier': { label: 'Nhà cung cấp' }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'user_id',
                header: 'Mã số',
                size: 50,
                Cell: ({ row, table }) => {
                    const index = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1;
                    return <span>{index}</span>;
                },
            },
            {
                accessorKey: 'email',
                header: 'Thư điện tử',
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
        enableGlobalFilter: false, // Disable built-in global filter since we have custom search
        renderRowActions: ({ row }) => {
            const userData = row.original;
            const isCurrentUser = userData.user_id === currentUser.user_id;

            return (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <ActionButton
                        icon={<Icon name="View" />}
                        action="view"
                        onClick={() => {
                            setViewingUser(userData);
                            setOpenViewDialog(true);
                        }}
                    />
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
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Cửa hàng</InputLabel>
                        <Select
                            value={storeFilter}
                            onChange={(e) => setStoreFilter(e.target.value)}
                            label="Cửa hàng"
                            disabled={loadingStores}
                        >
                            <MenuItem value="">Tất cả cửa hàng</MenuItem>
                            {stores.map(store => (
                                <MenuItem key={store.store_id} value={store.store_id.toString()}>
                                    {store.name}
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

            {/* User Dialog - Tự động xóa lịch làm việc tương lai khi chuyển nhân viên sang store mới */}
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

            {/* View User Details Dialog */}
            <Dialog
                open={openViewDialog}
                onClose={() => {
                    setOpenViewDialog(false);
                    setViewingUser(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" fontWeight={600}>
                        Thông tin chi tiết người dùng
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {viewingUser && (
                        <Box>
                            {/* Header Card with Avatar */}
                            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                bgcolor: 'rgba(255,255,255,0.2)',
                                                fontSize: '2rem',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {viewingUser.full_name?.charAt(0)?.toUpperCase() || viewingUser.email?.charAt(0)?.toUpperCase() || 'N'}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h5" fontWeight={600} gutterBottom>
                                                {viewingUser.full_name || 'Chưa có tên'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                {viewingUser.email || 'Không có'}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                                <Chip
                                                    label={roleConfig[viewingUser.role]?.label || viewingUser.role || 'Không có'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(255,255,255,0.2)',
                                                        color: 'white',
                                                        fontWeight: 500
                                                    }}
                                                />
                                                <Chip
                                                    label={viewingUser.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: viewingUser.is_active ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
                                                        color: 'white',
                                                        fontWeight: 500
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Information Cards */}
                            <Grid container spacing={2}>
                                {/* Basic Information */}
                                <Grid item xs={8}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                                                Thông tin cơ bản
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <PersonIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                ID
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                #{viewingUser.user_id}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <EmailIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Email
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {viewingUser.email || 'Không có'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <PhoneIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Số điện thoại
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {viewingUser.phone || 'Không có'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Work Information */}
                                <Grid item xs={4}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                                                Thông tin công việc
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <BusinessIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Vai trò
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {roleConfig[viewingUser.role]?.label || viewingUser.role || 'Không có'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <BusinessIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Cửa hàng
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {viewingUser.store_id
                                                                    ? stores.find(s => s.store_id === viewingUser.store_id)?.name || `Mã số: ${viewingUser.store_id}`
                                                                    : 'Không có'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Address Information */}
                                <Grid item xs={12} md={6}>
                                    {viewingUser.address ? (
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                                                    Địa chỉ
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                    <LocationOnIcon color="action" sx={{ mt: 0.5 }} />
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {viewingUser.address}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                                                    Địa chỉ
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                    <LocationOnIcon color="action" sx={{ mt: 0.5 }} />
                                                    <Typography variant="body1" fontWeight={500} color="text.secondary">
                                                        Không có
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    )}
                                </Grid>

                                {/* Timestamp Information */}
                                <Grid item xs={12} md={6}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                                                Thông tin thời gian
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <CalendarTodayIcon color="action" sx={{ mt: 0.5 }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Ngày tạo
                                                            </Typography>
                                                            <Typography variant="body1" fontWeight={500}>
                                                                {viewingUser.created_at
                                                                    ? new Date(viewingUser.created_at).toLocaleString('vi-VN')
                                                                    : 'Không có'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                {viewingUser.updated_at && (
                                                    <Grid item xs={12} sm={6}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                            <CalendarTodayIcon color="action" sx={{ mt: 0.5 }} />
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Ngày cập nhật
                                                                </Typography>
                                                                <Typography variant="body1" fontWeight={500}>
                                                                    {new Date(viewingUser.updated_at).toLocaleString('vi-VN')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <SecondaryButton
                        onClick={() => {
                            setOpenViewDialog(false);
                            setViewingUser(null);
                        }}
                    >
                        Đóng
                    </SecondaryButton>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default UserManagement;
