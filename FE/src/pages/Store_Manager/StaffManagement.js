import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employeeApi';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import { Box, Typography } from '@mui/material';
import { PrimaryButton, ActionButton, ToastNotification, Icon } from '../../components/common'; 

const StaffManagement = () => {
    const { user } = useAuth();
    const [staffList, setStaffList] = useState([]);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);
    const [errors, setErrors] = useState({});

    const loadEmployees = async () => {
        const res = await fetchEmployees({ limit: 100 });
        if (res && res.err === 0) {
            const mapped = (res.data || []).map(u => ({
                id: u.user_id,
                name: u.full_name || u.username,
                full_name: u.full_name || '',
                phone: u.phone || '',
                address: u.address || '',
                role: u.role,
                status: u.status,
                email: u.email || ''
            }));
            setStaffList(mapped);
        } else {
            ToastNotification.error(res?.msg || 'Tải danh sách nhân viên thất bại');
        }
    };

    useEffect(() => { 
        loadEmployees(); 
    }, []);

    useEffect(() => {
        document.title = 'Quản lý nhân viên';
    }, []);

    const handleCloseFormModal = () => {
        setShowFormModal(false);
        setCurrentStaff(null);
        setErrors({});
    };
    const handleShowAddModal = () => {
        setIsEditMode(false);
        setCurrentStaff({ email: '', name: '', phone: '', address: '', role: 'Cashier' });
        setErrors({});
        setShowFormModal(true);
    }
    const handleShowEditModal = (staff) => {
        setIsEditMode(true);
        setCurrentStaff(staff);
        setErrors({});
        setShowFormModal(true);
    };
    const handleShowDeleteModal = (staff) => {
        setStaffToDelete(staff);
        setShowDeleteModal(true);
    }
    const validateField = (field, value) => {
        if (field === 'username') {
            if (!value) return 'Tên đăng nhập là bắt buộc';
            if (value.length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
        }
        if (field === 'email') {
            if (!value) return 'Email là bắt buộc';
            // Regex đơn giản để kiểm tra email
            const emailRegex = /\S+@\S+\.\S+/;
            if (!emailRegex.test(value)) return 'Email không hợp lệ';
        }
        if (field === 'name') {
            if (!value?.trim()) return 'Họ và Tên là bắt buộc';
        }
        if (field === 'phone') {
            const cleaned = value?.trim() || '';
            if (!cleaned) return 'Số điện thoại là bắt buộc';
            // Yêu cầu: đúng 10 chữ số và phải bắt đầu bằng số 0
            const phoneRegex = /^0[0-9]{9}$/;
            if (!phoneRegex.test(cleaned)) {
                return 'Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số';
            }
        }
        if (field === 'role') {
            if (!value) return 'Vai trò là bắt buộc';
        }
        return '';
    };

    const validateAll = () => {
        if (!currentStaff) return false;
        const fieldsToValidate = ['email', 'name', 'phone', 'role'];
        const newErrors = {};

        fieldsToValidate.forEach((field) => {
            const value = currentStaff[field] || '';
            const error = validateField(field, value);
            if (error) {
                newErrors[field] = error;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveStaff = async (e) => {
        e.preventDefault();

        const isValid = validateAll();
        if (!isValid) {
            ToastNotification.error('Vui lòng kiểm tra lại thông tin nhân viên.');
            return;
        }

        try {
            const normalizedName = currentStaff.name?.trim() || '';
            if (isEditMode) {
                const res = await updateEmployee(currentStaff.id, {
                    name: normalizedName,
                    full_name: normalizedName,
                    phone: currentStaff.phone,
                    address: currentStaff.address,
                    role: currentStaff.role
                });
                if (res.err === 0) ToastNotification.success('Cập nhật nhân viên thành công');
                else ToastNotification.error(res.msg || 'Cập nhật thất bại');
            } else {
                const generatedUsername = () => {
                    const base = (currentStaff.email || '')
                        .split('@')[0]
                        ?.replace(/[^a-zA-Z0-9._-]/g, '') || '';
                    return base.length ? base : `user${Date.now()}`;
                };
                const res = await createEmployee({
                    username: generatedUsername(),
                    email: currentStaff.email,
                    password: '123', // Mật khẩu mặc định
                    name: normalizedName,
                    full_name: normalizedName,
                    phone: currentStaff.phone,
                    address: currentStaff.address,
                    role: currentStaff.role,
                    store_id: user.store_id // Lấy từ context
                });
                if (res.err === 0) ToastNotification.success('Thêm nhân viên thành công (mật khẩu mặc định: 123)');
                else ToastNotification.error(res.msg || 'Thêm thất bại');
            }
        } finally {
            handleCloseFormModal();
            loadEmployees();
        }
    }
    const confirmDelete = async () => {
        if (!staffToDelete) return;
        const res = await deleteEmployee(staffToDelete.id, false);
        if (res.err === 0) ToastNotification.success('Đã vô hiệu hóa nhân viên');
        else ToastNotification.error(res.msg || 'Xóa thất bại');
        setShowDeleteModal(false);
        setStaffToDelete(null);
        loadEmployees();
    };

    const handleInputChange = (field) => (e) => {
        const value = e.target.value;
        setCurrentStaff(prev => ({ ...prev, [field]: value }));

        // validate ngay khi nhập
        const errorMessage = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: errorMessage }));
    };

    const columns = useMemo(
        () => [
            { 
                id: 'stt', 
                header: 'STT', 
                size: 50, 
                enableSorting: false, 
                Cell: ({ row }) => row.index + 1,
                muiTableHeadCellProps: {
                    align: 'center',
                },
                muiTableBodyCellProps: {
                    align: 'center',
                },
            },
            { 
                accessorKey: 'name', 
                header: 'Họ và Tên',
                muiTableHeadCellProps: {
                    align: 'center',
                },
                muiTableBodyCellProps: {
                    align: 'center',
                },
            },
            { 
                accessorKey: 'phone', 
                header: 'Số điện thoại',
                muiTableHeadCellProps: {
                    align: 'center',
                },
                muiTableBodyCellProps: {
                    align: 'center',
                },
            },
            { 
                accessorKey: 'address', 
                header: 'Địa chỉ',
                muiTableHeadCellProps: {
                    align: 'center',
                },
                muiTableBodyCellProps: {
                    align: 'center',
                },
            },
            { 
                accessorKey: 'role', 
                header: 'Vai trò',
                muiTableHeadCellProps: {
                    align: 'center',
                },
                muiTableBodyCellProps: {
                    align: 'center',
                },
            },
        ],
        [],
    );

    return (
        <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Quản lý nhân viên</Typography>
            <MaterialReactTable
                columns={columns}
                data={staffList}
                enableRowActions
                
                positionActionsColumn="last"
                displayColumnDefOptions={{
                    'mrt-row-actions': {
                        header: 'Actions',
                        size: 100,        
                    },
                }}

                enableStickyHeader
                layoutMode="grid"
                initialState={{ 
                    density: 'compact',
                    pagination: { pageSize: 10, pageIndex: 0 }
                }}
                localization={MRT_Localization_VI}
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
                renderTopToolbarCustomActions={() => (
                    <PrimaryButton
                        startIcon={<Icon name="Add" />}
                        onClick={handleShowAddModal}
                    >
                        Thêm nhân viên
                    </PrimaryButton>
                )}
                
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <ActionButton
                            icon={<Icon name="Edit" />}
                            action="edit"
                            onClick={() => handleShowEditModal(row.original)}
                        />
                        <ActionButton
                            icon={<Icon name="Delete" />}
                            action="delete"
                            onClick={() => handleShowDeleteModal(row.original)}
                        />
                    </Box>
                )}
            />

            <Modal show={showFormModal} onHide={handleCloseFormModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSaveStaff}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={currentStaff?.email || ''}
                                onChange={handleInputChange('email')}
                                disabled={isEditMode}
                                isInvalid={!!errors.email}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.email}
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Họ và Tên</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStaff?.name || ''}
                                onChange={handleInputChange('name')}
                                isInvalid={!!errors.name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.name}
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                                type="tel"
                                value={currentStaff?.phone || ''}
                                onChange={handleInputChange('phone')}
                                isInvalid={!!errors.phone}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.phone}
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Địa chỉ</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStaff?.address || ''}
                                onChange={handleInputChange('address')}
                                isInvalid={!!errors.address}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.address}
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Vai trò</Form.Label>
                            <Form.Select
                                value={currentStaff?.role || 'Cashier'}
                                onChange={handleInputChange('role')}
                                isInvalid={!!errors.role}
                            >
                                <option value="Cashier">Thu ngân (Cashier)</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                                {errors.role}
                            </Form.Control.Feedback>
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                            <Button variant="secondary" onClick={handleCloseFormModal} className="me-2">
                                Hủy
                            </Button>
                            <Button variant="primary" type="submit">
                                Lưu
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <ConfirmationModal 
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc chắn muốn xóa nhân viên "${staffToDelete?.name}" không?`}
            />
        </Box>
    );
};
export default StaffManagement;