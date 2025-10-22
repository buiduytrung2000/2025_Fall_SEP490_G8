// src/components/layout/Sidebar.js
import React from 'react';
import { Nav, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SidebarNav = ({ role }) => {
    // Render navigation links based on user role
    switch (role) {
        case 'Admin':
            return <LinkContainer to="/admin/permissions"><Nav.Link>Quản lý Phân quyền</Nav.Link></LinkContainer>;
        case 'Manager':
            return <LinkContainer to="/manager/products"><Nav.Link>Quản lý Sản phẩm</Nav.Link></LinkContainer>;
        case 'CEO':
            return <LinkContainer to="/ceo/dashboard"><Nav.Link>Bảng điều khiển CEO</Nav.Link></LinkContainer>;
        case 'Warehouse':
            return <LinkContainer to="/warehouse/inventory"><Nav.Link>Quản lý Tồn kho</Nav.Link></LinkContainer>;
        case 'Supplier':
            return <LinkContainer to="/supplier/portal"><Nav.Link>Cổng Nhà cung cấp</Nav.Link></LinkContainer>;
        default:
            return null;
    }
}

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <div className="d-flex flex-column vh-100 p-3 bg-light" style={{ width: '250px' }}>
            <Nav className="flex-column flex-grow-1">
                <Nav.Item className="mb-3">
                    <h5 className='text-primary'>CCMS</h5>
                    <span>Chào, {user?.name} ({user?.role})</span>
                </Nav.Item>
                <hr />
                {user && <SidebarNav role={user.role} />}
            </Nav>
            <Button variant="outline-danger" onClick={handleLogout}>Đăng xuất</Button>
        </div>
    );
};

export default Sidebar;