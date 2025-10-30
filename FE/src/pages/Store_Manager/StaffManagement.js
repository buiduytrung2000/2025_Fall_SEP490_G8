// src/pages/Manager/StaffManagement.js
import React, { useState, useEffect, useMemo } from 'react';
// Import Button của MUI thay vì react-bootstrap
import { Spinner, Modal, Form } from 'react-bootstrap';
import { getStaff } from '../../api/mockApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton, Button } from '@mui/material'; // <-- Thay đổi ở đây
import { Edit, Delete, PersonAdd } from '@mui/icons-material'; // <-- Thêm icon PersonAdd

const StaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // ... (các state và hàm xử lý modal giữ nguyên)
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);

    useEffect(() => {
        getStaff().then(data => {
            setStaffList(data);
            setLoading(false);
        });
    }, []);

    const handleCloseFormModal = () => setShowFormModal(false);
    const handleShowAddModal = () => {
        setIsEditMode(false);
        setCurrentStaff({ name: '', phone: '', role: 'Cashier' });
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
    const handleSaveStaff = (e) => {
        e.preventDefault();
        console.log(isEditMode ? "Updating" : "Adding", currentStaff);
        handleCloseFormModal();
    }
    const confirmDelete = () => {
        console.log("Deleting staff:", staffToDelete.name);
        setShowDeleteModal(false);
        setStaffToDelete(null);
    };

    // Cột (giữ nguyên)
    const columns = useMemo(
        () => [
            { accessorKey: 'id', header: 'ID', size: 50 },
            { accessorKey: 'name', header: 'Họ và Tên' },
            { accessorKey: 'phone', header: 'Số điện thoại' },
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
                
                // --- PHẦN SỬA LỖI ---
                positionActionsColumn="first" // Giữ nguyên: Đưa cột Actions lên đầu
                displayColumnDefOptions={{
                    'mrt-row-actions': {
                        header: 'Actions', // Đặt tên header
                        size: 100,         // Đặt độ rộng cố định cho cột Sửa/Xóa
                    },
                }}
                // --- HẾT PHẦN SỬA LỖI ---

                // Nút "Thêm nhân viên" (Dùng Button của MUI cho đồng bộ)
                renderTopToolbarCustomActions={() => (
                    <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={handleShowAddModal}
                    >
                        Thêm nhân viên
                    </Button>
                )}
                
                // Nút Sửa/Xóa (giữ nguyên)
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

            {/* Các Modal (giữ nguyên, vẫn dùng React Bootstrap) */}
            <Modal show={showFormModal} onHide={handleCloseFormModal} centered>
                {/* ... (Nội dung Modal không đổi) ... */}
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSaveStaff}>
                        <Form.Group className="mb-3">
                            <Form.Label>Họ và Tên</Form.Label>
                            <Form.Control type="text" defaultValue={currentStaff?.name} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control type="tel" defaultValue={currentStaff?.phone} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Vai trò</Form.Label>
                            <Form.Select defaultValue={currentStaff?.role}>
                                <option value="Cashier">Thu ngân (Cashier)</option>
                                <option value="Warehouse Staff">Nhân viên kho (Warehouse)</option>
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