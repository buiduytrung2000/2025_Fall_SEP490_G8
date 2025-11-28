import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Modal, Form } from 'react-bootstrap';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employeeApi';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton, Button } from '@mui/material'; 
import { Edit, Delete, PersonAdd } from '@mui/icons-material'; 

const StaffManagement = () => {
    const { user } = useAuth();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);
    const [errors, setErrors] = useState({});

    const loadEmployees = async () => {
        setLoading(true);
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
            toast.error(res?.msg || 'Tải danh sách nhân viên thất bại');
        }
        setLoading(false);
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
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(cleaned)) return 'Số điện thoại phải gồm đúng 10 chữ số';
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
            toast.error('Vui lòng kiểm tra lại thông tin nhân viên.');
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
                if (res.err === 0) toast.success('Cập nhật nhân viên thành công');
                else toast.error(res.msg || 'Cập nhật thất bại');
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
                if (res.err === 0) toast.success('Thêm nhân viên thành công (mật khẩu mặc định: 123)');
                else toast.error(res.msg || 'Thêm thất bại');
            }
        } finally {
            handleCloseFormModal();
            loadEmployees();
        }
    }
    const confirmDelete = async () => {
        if (!staffToDelete) return;
        const res = await deleteEmployee(staffToDelete.id, false);
        if (res.err === 0) toast.success('Đã vô hiệu hóa nhân viên');
        else toast.error(res.msg || 'Xóa thất bại');
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
            { id: 'stt', header: 'STT', size: 50, enableSorting: false, Cell: ({ row }) => row.index + 1 },
            { accessorKey: 'name', header: 'Họ và Tên' },
            { accessorKey: 'phone', header: 'Số điện thoại' },
            { accessorKey: 'address', header: 'Địa chỉ' },
            { accessorKey: 'role', header: 'Vai trò' },
        ],
        [],
    );

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <h2 className="mb-3">Quản lý nhân viên</h2>
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

                renderTopToolbarCustomActions={() => (
                    <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={handleShowAddModal}
                    >
                        Thêm nhân viên
                    </Button>
                )}
                
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <IconButton
                            color="warning"
                            size="small"
                            onClick={() => handleShowEditModal(row.original)}
                        >
                            <Edit />
                        </IconButton>
                        <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleShowDeleteModal(row.original)}
                        >
                            <Delete />
                        </IconButton>
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
        </div>
    );
};
export default StaffManagement;