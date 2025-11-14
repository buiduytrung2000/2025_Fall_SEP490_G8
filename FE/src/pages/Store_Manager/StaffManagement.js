import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Modal, Form } from 'react-bootstrap';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employeeApi';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton, Button } from '@mui/material'; 
import { Edit, Delete, PersonAdd } from '@mui/icons-material'; 

const StaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);

    const loadEmployees = async () => {
        setLoading(true);
        const res = await fetchEmployees({ limit: 100 });
        if (res && res.err === 0) {
            const mapped = (res.data || []).map(u => ({
                id: u.user_id,
                name: u.name || u.username,
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

    useEffect(() => { loadEmployees(); }, []);

    const handleCloseFormModal = () => setShowFormModal(false);
    const handleShowAddModal = () => {
        setIsEditMode(false);
        setCurrentStaff({ name: '', phone: '', address: '', role: 'Cashier' });
        setShowFormModal(true);
    }
    const handleShowEditModal = (staff) => {
        setIsEditMode(true);
        setCurrentStaff(staff);
        setShowFormModal(true);
    };
    const handleShowDeleteModal = (staff) => {
        setStaffToDelete(staff);
        setShowDeleteModal(true);
    }
    const handleSaveStaff = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                const res = await updateEmployee(currentStaff.id, {
                    name: currentStaff.name,
                    phone: currentStaff.phone,
                    address: currentStaff.address,
                    role: currentStaff.role
                });
                if (res.err === 0) toast.success('Cập nhật nhân viên thành công');
                else toast.error(res.msg || 'Cập nhật thất bại');
            } else {
                const username = (currentStaff.name || 'user').toLowerCase().replace(/\s+/g, '') + Date.now().toString().slice(-4);
                const res = await createEmployee({
                    username,
                    password: '123',
                    name: currentStaff.name,
                    phone: currentStaff.phone,
                    address: currentStaff.address,
                    role: currentStaff.role
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
                            <Form.Label>Họ và Tên</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStaff?.name || ''}
                                onChange={handleInputChange('name')}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                                type="tel"
                                value={currentStaff?.phone || ''}
                                onChange={handleInputChange('phone')}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Địa chỉ</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentStaff?.address || ''}
                                onChange={handleInputChange('address')}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Vai trò</Form.Label>
                            <Form.Select
                                value={currentStaff?.role || 'Cashier'}
                                onChange={handleInputChange('role')}
                            >
                                <option value="Cashier">Thu ngân (Cashier)</option>
                            </Form.Select>
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