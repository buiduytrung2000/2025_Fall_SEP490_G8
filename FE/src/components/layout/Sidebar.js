// src/components/layout/Sidebar.js
import React from 'react';
import { Nav, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../../assets/Sidebar.css';

// Import icons (Thêm FaBars)
import {
    FaStore, FaUsersCog, FaBox, FaChartLine,
    FaWarehouse, FaTruck, FaSignOutAlt, FaUserFriends, FaCalendarAlt,
    FaBars, FaUserClock, FaCashRegister , FaChartPie// Icon cho nút Toggle
} from 'react-icons/fa';

// --- Cấu hình navLinks và getMenuHeading giữ nguyên ---
const navLinks = {
    Admin: [ { to: "/admin/permissions", icon: <FaUsersCog />, text: "Phân quyền" } ],
    Manager: [
      { to: "/manager/dashboard", icon: <FaChartPie />, text: "Tổng quan" },
        { to: "/manager/products", icon: <FaBox />, text: "Quản lý Sản phẩm" },
        { to: "/manager/staff", icon: <FaUserFriends />, text: "Quản lý Nhân viên" },
        { to: "/manager/schedule", icon: <FaCalendarAlt />, text: "Lịch làm việc" },
    ],
    Cashier: [
        { to: "/cashier/pos", icon: <FaCashRegister />, text: "Bán hàng (POS)" },
        { to: "/my-schedule", icon: <FaUserClock />, text: "Xem lịch làm việc" }
    ],
    CEO: [ { to: "/ceo/dashboard", icon: <FaChartLine />, text: "Bảng điều khiển" } ],
    Warehouse: [ { to: "/warehouse/inventory", icon: <FaWarehouse />, text: "Tồn kho" } ],
    Supplier: [ { to: "/supplier/portal", icon: <FaTruck />, text: "Đơn đặt hàng" } ],
};

const getMenuHeading = (role) => {
    switch(role) {
        case 'Admin': return 'Admin Tools';
        case 'Manager': return 'Quản lý Cửa hàng';
        case 'CEO': return 'Báo cáo';
        case 'Warehouse': return 'Kho vận';
        case 'Supplier': return 'Đối tác';
        case 'Cashier': return 'Nghiệp vụ';
        default: return 'Menu';
    }
}
// --- Hết phần giữ nguyên ---


// Nhận props { isSidebarOpen, toggleSidebar }
const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    const userNavLinks = user ? navLinks[user.role] || [] : [];
    const menuHeading = user ? getMenuHeading(user.role) : 'Menu';

    // Thêm class 'collapsed' khi sidebar đóng
    const containerClass = `sidebar-container ${isSidebarOpen ? '' : 'collapsed'}`;

    return (
        <div className={containerClass}>
            {/* 1. Phần Brand/Logo & Toggle Button */}
            <div className="sidebar-header">
                <Link to="/" className="sidebar-brand">
                    <FaStore className="sidebar-brand-icon" />
                    <span className="brand-text">CCMS</span>
                </Link>
                {/* Nút Toggle */}
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    <FaBars />
                </button>
            </div>

            {/* 2. Phần Điều Hướng Chính */}
            <Nav className="flex-column sidebar-nav flex-grow-1">
                <span className="menu-heading">{menuHeading}</span>
                
                {userNavLinks.map((link) => (
                    <LinkContainer to={link.to} key={link.to}>
                        {/* Thêm 'title' để hiển thị tooltip khi thu gọn */}
                        <Nav.Link title={link.text}>
                            <span className="nav-icon">{link.icon}</span>
                            <span className="nav-text">{link.text}</span>
                        </Nav.Link>
                    </LinkContainer>
                ))}
            </Nav>
            
            {/* 3. Phần Footer (Thông tin user & Đăng xuất) */}
            <div className="sidebar-footer">
                {user && (
                    <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-role">{user.role}</span>
                    </div>
                )}
                <Button variant="secondary" className="w-100 btn-logout" onClick={handleLogout} title="Đăng xuất">
                    <FaSignOutAlt className="logout-icon" />
                    <span className="nav-text">Đăng xuất</span>
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;