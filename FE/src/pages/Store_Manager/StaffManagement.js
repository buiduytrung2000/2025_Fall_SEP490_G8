// src/pages/Manager/StaffManagement.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner, Modal, Form } from 'react-bootstrap';
import { getStaff } from '../../api/mockApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { FaUserPlus, FaEdit, FaTrash } from 'react-icons/fa';

const StaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State cho Modal Add/Edit
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);

    // State cho Modal Delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);

    useEffect(() => {
        getStaff().then(data => {
            setStaffList(data);
            setLoading(false);
        });
    }, []);

    const handleCloseFormModal = () => {
        setShowFormModal(false);
        setCurrentStaff(null);
        setIsEditMode(false);
    }
    
    const handleShowAddModal = () => {
        setIsEditMode(false);
        setCurrentStaff({ name: '', phone: '', role: 'Cashier' }); // Dữ liệu mặc định
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
        // Thêm logic gọi API để lưu ở đây
        if (isEditMode) {
            console.log("Updating staff:", currentStaff);
        } else {
            console.log("Adding new staff:", currentStaff);
        }
        handleCloseFormModal();
    }
    
    const confirmDelete = () => {
        console.log("Deleting staff:", staffToDelete.name);
        // Thêm logic gọi API để xóa ở đây
        setShowDeleteModal(false);
        setStaffToDelete(null);
    };

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Quản lý Nhân viên</h2>
                <Button variant="primary" onClick={handleShowAddModal}>
                    <FaUserPlus className="me-2" /> Thêm nhân viên
                </Button>
            </div>
            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Họ và Tên</th>
                        <th>Số điện thoại</th>
                        <th>Vai trò</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {staffList.map(staff => (
                        <tr key={staff.id}>
                            <td>{staff.id}</td>
                            <td>{staff.name}</td>
                            <td>{staff.phone}</td>
                            <td>{staff.role}</td>
                            <td>
                                <Button variant="warning" size="sm" className="me-2" onClick={() => handleShowEditModal(staff)}>
                                    <FaEdit /> Sửa
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(staff)}>
                                    <FaTrash /> Xóa
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Modal for Add/Edit Staff */}
            <Modal show={showFormModal} onHide={handleCloseFormModal} centered>
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

            {/* Modal for Deleting Staff */}
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