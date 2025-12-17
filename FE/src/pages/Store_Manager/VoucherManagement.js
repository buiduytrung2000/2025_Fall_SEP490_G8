import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Chip,
  Stack
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import * as voucherTemplateApi from '../../api/voucherTemplateApi';
import * as customerApi from '../../api/customerApi';
import {
    PrimaryButton,
    SecondaryButton,
    ActionButton,
    ToastNotification,
    Icon
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

function VoucherManagement() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    
    const [formData, setFormData] = useState({
        voucher_code_prefix: '',
        voucher_name: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: 0,
        max_discount_amount: '',
        required_loyalty_points: 0,
        validity_days: 30,
        is_active: true
    });

    const getStoreId = () => {
        // Ưu tiên lấy từ user context
        if (user?.store_id) return user.store_id;
        // Fallback: lấy từ localStorage user object
        try {
            const persisted = localStorage.getItem('user');
            if (persisted) {
                const parsed = JSON.parse(persisted);
                if (parsed.store_id) return parsed.store_id;
            }
        } catch (error) {
            console.error('Error reading store_id from localStorage user:', error);
        }
        // Fallback: lấy từ localStorage store_id riêng
        try {
            const storeIdStr = localStorage.getItem('store_id');
            if (storeIdStr) return Number(storeIdStr);
        } catch (error) {
            console.error('Error reading store_id from localStorage:', error);
        }
        return null;
    };

    useEffect(() => {
        loadTemplates();
        loadCustomers();
    }, []);

    const loadTemplates = async () => {
        try {
            const storeId = getStoreId();
            const res = await voucherTemplateApi.getAllVoucherTemplates({ store_id: storeId });
            console.log('Voucher templates response:', res);
            if (res && res.err === 0) {
                const list = res.data || [];
                const filtered = storeId ? list.filter(t => !t.store_id || t.store_id === storeId) : list;
                setTemplates(filtered);
            } else {
                console.error('Error loading templates:', res);
                ToastNotification.error(res?.msg || 'Lỗi khi tải danh sách mẫu mã khuyến mãi');
            }
        } catch (error) {
            console.error('Exception loading templates:', error);
            ToastNotification.error('Lỗi khi tải danh sách mẫu mã khuyến mãi: ' + error.message);
        }
    };

    const loadCustomers = async () => {
        try {
            const res = await customerApi.getAllCustomers();
            if (res && res.err === 0) {
                setCustomers(res.data);
            }
        } catch (error) {
            ToastNotification.error('Lỗi khi tải danh sách khách hàng');
        }
    };

    const handleShowTemplateModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                voucher_code_prefix: template.voucher_code_prefix,
                voucher_name: template.voucher_name,
                discount_type: template.discount_type,
                discount_value: template.discount_value,
                min_purchase_amount: template.min_purchase_amount,
                max_discount_amount: template.max_discount_amount || '',
                required_loyalty_points: template.required_loyalty_points,
                validity_days: template.validity_days,
                is_active: template.is_active
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                voucher_code_prefix: '',
                voucher_name: '',
                discount_type: 'percentage',
                discount_value: '',
                min_purchase_amount: 0,
                max_discount_amount: '',
                required_loyalty_points: 0,
                validity_days: 30,
                is_active: true
            });
        }
        setShowTemplateModal(true);
    };

    const handleCloseTemplateModal = () => {
        setShowTemplateModal(false);
        setEditingTemplate(null);
    };

    const handleSaveTemplate = async () => {
        try {
            let res;
            const storeId = getStoreId();
            if (!storeId) {
                ToastNotification.error('Không xác định được cửa hàng. Vui lòng đăng nhập lại.');
                return;
            }
            const payload = { ...formData, store_id: storeId };
            console.log('Saving voucher template with payload:', payload);

            const isEditing = !!editingTemplate;

            if (isEditing) {
                // Chỉ cập nhật template, KHÔNG tự gán lại cho tất cả khách hàng
                res = await voucherTemplateApi.updateVoucherTemplate(editingTemplate.voucher_template_id, payload);
            } else {
                // Tạo template mới
                res = await voucherTemplateApi.createVoucherTemplate(payload);
            }

            if (res && res.err === 0) {
                // Nếu là tạo mới, tự động gán voucher cho KH đủ điều kiện theo điểm tích lũy
                if (!isEditing) {
                    const newTemplateId =
                        res.data?.voucher_template_id ||
                        res.data?.id ||
                        res.data?.voucherTemplate?.voucher_template_id;

                    if (newTemplateId && customers && customers.length > 0) {
                        const requiredPoints = Number(formData.required_loyalty_points || 0);
                        // Lọc chỉ khách hàng có điểm >= required_loyalty_points
                        const eligibleCustomers = customers.filter(
                            (c) => Number(c.loyalty_point || 0) >= requiredPoints
                        );

                        console.log('Auto-assign voucher template', newTemplateId, 'to customers:', {
                            totalCustomers: customers.length,
                            requiredPoints,
                            eligibleCount: eligibleCustomers.length,
                        });

                        try {
                            await Promise.all(
                                eligibleCustomers.map((c) =>
                                    voucherTemplateApi.addVoucherFromTemplate(c.customer_id, newTemplateId, storeId)
                                )
                            );
                            ToastNotification.success(
                                `Đã tự động gán mã khuyến mãi mới cho ${eligibleCustomers.length} khách hàng đủ điểm`
                            );
                        } catch (assignError) {
                            console.error('Error auto-assigning vouchers to customers:', assignError);
                            ToastNotification.error('Đã tạo mẫu mã, nhưng lỗi khi tự gán cho khách hàng');
                        }
                    }
                }

                ToastNotification.success(
                    isEditing
                        ? 'Cập nhật mẫu mã khuyến mãi thành công'
                        : 'Tạo mẫu mã khuyến mãi thành công'
                );
                handleCloseTemplateModal();
                loadTemplates();
            } else {
                ToastNotification.error(res?.msg || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error saving voucher template:', error);
            ToastNotification.error('Lỗi khi lưu mẫu mã khuyến mãi');
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mẫu mã khuyến mãi này?')) {
            try {
                const res = await voucherTemplateApi.deleteVoucherTemplate(id);
                if (res && res.err === 0) {
                    ToastNotification.success('Xóa mẫu mã khuyến mãi thành công');
                    loadTemplates();
                } else {
                    ToastNotification.error(res.msg || 'Có lỗi xảy ra');
                }
            } catch (error) {
                ToastNotification.error('Lỗi khi xóa mẫu mã khuyến mãi');
            }
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    // Định nghĩa cột cho MaterialReactTable
    const templateColumns = useMemo(() => [
        {
            accessorKey: 'index',
            header: 'STT',
            size: 50,
            Cell: ({ row }) => row.index + 1,
            enableColumnFilter: false,
        },
        {
            accessorKey: 'voucher_code_prefix',
            header: 'Mã tiền tố',
            size: 100,
        },
        {
            accessorKey: 'voucher_name',
            header: 'Tên mã khuyến mãi',
            size: 150,
        },
        {
            accessorKey: 'discount_type',
            header: 'Loại giảm giá',
            size: 120,
            Cell: ({ cell }) => cell.getValue() === 'percentage' ? 'Phần trăm' : 'Số tiền cố định',
        },
        {
            accessorKey: 'discount_value',
            header: 'Giá trị',
            size: 100,
            Cell: ({ row }) => {
                const template = row.original;
                return template.discount_type === 'percentage'
                    ? `${template.discount_value}%`
                    : formatCurrency(template.discount_value);
            },
            enableColumnFilter: false,
        },
        {
            accessorKey: 'min_purchase_amount',
            header: 'Đơn tối thiểu',
            size: 110,
            Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
            enableColumnFilter: false,
        },
        {
            accessorKey: 'max_discount_amount',
            header: 'Giảm tối đa',
            size: 110,
            Cell: ({ cell }) => cell.getValue() ? formatCurrency(cell.getValue()) : 'Không giới hạn',
            enableColumnFilter: false,
        },
        {
            accessorKey: 'required_loyalty_points',
            header: 'Điểm yêu cầu',
            size: 100,
            Cell: ({ cell }) => cell.getValue() || 0,
            enableColumnFilter: false,
        },
        {
            accessorKey: 'validity_days',
            header: 'Hiệu lực (ngày)',
            size: 100,
            Cell: ({ cell }) => cell.getValue() || 0,
            enableColumnFilter: false,
        },
        {
            accessorKey: 'is_active',
            header: 'Trạng thái',
            size: 100,
            Cell: ({ row }) => (
                <Chip
                    size="small"
                    color={row.original.is_active ? 'success' : 'default'}
                    label={row.original.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                />
            ),
        },
    ], []);

    return (
        <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Quản lý Mã Khuyến Mãi</Typography>

            <Paper sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>Danh sách mã khuyến mãi</Typography>
                    <PrimaryButton
                        startIcon={<Icon name="Add" />}
                        onClick={() => handleShowTemplateModal()}
                    >
                        Tạo mới
                    </PrimaryButton>
                </Stack>
                <MaterialReactTable
                    columns={templateColumns}
                    data={templates}
                    enableStickyHeader
                    enableColumnActions={false}
                    enableColumnFilters={false}
                    enableSorting={true}
                    enableTopToolbar={false}
                    enableBottomToolbar={true}
                    enablePagination={true}
                    enableRowActions={true}
                    positionActionsColumn="last"
                    layoutMode="grid"
                    initialState={{ 
                        density: 'compact',
                        pagination: { pageSize: 10, pageIndex: 0 }
                    }}
                    renderRowActions={({ row }) => (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <ActionButton
                                icon={<Icon name="Edit" />}
                                action="edit"
                                onClick={() => handleShowTemplateModal(row.original)}
                            />
                            <ActionButton
                                icon={<Icon name="Delete" />}
                                action="delete"
                                onClick={() => handleDeleteTemplate(row.original.voucher_template_id)}
                            />
                        </Box>
                    )}
                    muiTableContainerProps={{
                        sx: { maxHeight: { xs: '70vh', md: '600px' } }
                    }}
                    muiTablePaperProps={{
                        elevation: 0,
                        sx: { boxShadow: 'none' }
                    }}
                    muiTableHeadCellProps={{
                        sx: {
                            fontWeight: 700,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }
                    }}
                    muiTableBodyCellProps={{
                        sx: { whiteSpace: 'normal', wordBreak: 'break-word' }
                    }}
                    localization={MRT_Localization_VI}
                />
            </Paper>

            {/* Template Modal */}
            <Dialog open={showTemplateModal} onClose={handleCloseTemplateModal} maxWidth="md" fullWidth>
                <DialogTitle>{editingTemplate ? 'Chỉnh sửa' : 'Tạo mới'} Mẫu mã khuyến mãi</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Mã tiền tố *"
                                fullWidth
                                value={formData.voucher_code_prefix}
                                onChange={(e) => setFormData({...formData, voucher_code_prefix: e.target.value})}
                                placeholder="VD: WELCOME, LOYAL100"
                            />
                            <TextField
                                label="Tên mã khuyến mãi *"
                                fullWidth
                                value={formData.voucher_name}
                                onChange={(e) => setFormData({...formData, voucher_name: e.target.value})}
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>Loại giảm giá *</InputLabel>
                                <Select
                                    value={formData.discount_type}
                                    onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                    label="Loại giảm giá *"
                                >
                                    <MenuItem value="percentage">Phần trăm (%)</MenuItem>
                                    <MenuItem value="fixed_amount">Số tiền cố định (VND)</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Giá trị giảm giá *"
                                fullWidth
                                type="number"
                                value={formData.discount_value}
                                onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                                placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Đơn hàng tối thiểu (VND)"
                                fullWidth
                                type="number"
                                value={formData.min_purchase_amount}
                                onChange={(e) => setFormData({...formData, min_purchase_amount: e.target.value})}
                            />
                            <TextField
                                label="Giảm tối đa (VND)"
                                fullWidth
                                type="number"
                                value={formData.max_discount_amount}
                                onChange={(e) => setFormData({...formData, max_discount_amount: e.target.value})}
                                placeholder="Để trống nếu không giới hạn"
                            />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Điểm tích lũy yêu cầu"
                                fullWidth
                                type="number"
                                value={formData.required_loyalty_points}
                                onChange={(e) => setFormData({...formData, required_loyalty_points: e.target.value})}
                            />
                            <TextField
                                label="Số ngày hiệu lực"
                                fullWidth
                                type="number"
                                value={formData.validity_days}
                                onChange={(e) => setFormData({...formData, validity_days: e.target.value})}
                            />
                        </Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                />
                            }
                            label="Kích hoạt"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={handleCloseTemplateModal}>Hủy</SecondaryButton>
                    <PrimaryButton onClick={handleSaveTemplate}>
                        {editingTemplate ? 'Cập nhật' : 'Tạo mới'}
                    </PrimaryButton>
                </DialogActions>
            </Dialog>

        </Box>
    );
}

export default VoucherManagement;

