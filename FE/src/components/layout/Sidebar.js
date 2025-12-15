// src/components/layout/Sidebar.js
import React, { useState } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../../assets/Sidebar.css';
import ConfirmationModal from '../common/ConfirmationModal';

// Import icons (Thêm FaBars)
import {
    FaStore, FaUsersCog, FaBox, FaChartLine,
    FaWarehouse, FaTruck, FaSignOutAlt, FaUserFriends, FaCalendarAlt,
    FaBars, FaUserClock, FaCashRegister, FaChartPie, FaExchangeAlt,
    FaBoxes, FaHistory, FaClipboardList, FaGift, FaBuilding,
    FaUserCircle
} from 'react-icons/fa';

// --- Cấu hình navLinks và getMenuHeading giữ nguyên ---
const navLinks = {
    Admin: [
        // { to: "/admin/permissions", icon: <FaUsersCog />, text: "Phân quyền" },
        { to: "/admin/users", icon: <FaUserFriends />, text: "Quản lý Người dùng" }
    ],
    Manager: [
        { to: "/manager/dashboard", icon: <FaChartPie />, text: "Tổng quan" },
        { to: "/manager/inventory", icon: <FaWarehouse />, text: "Quản lý Tồn kho" },
        { to: "/manager/orders", icon: <FaClipboardList />, text: "Đơn nhập hàng" },
        { to: "/manager/reports/shifts", icon: <FaChartPie />, text: "Báo cáo ca làm" },
        { to: "/manager/payment-history", icon: <FaHistory />, text: "Lịch sử thanh toán" },
        { to: "/manager/vouchers", icon: <FaGift />, text: "Quản lý Voucher" },
        { to: "/manager/staff", icon: <FaUserFriends />, text: "Quản lý Nhân viên" },
        { to: "/manager/schedule", icon: <FaCalendarAlt />, text: "Lịch & đổi ca" },
    ],
    Cashier: [
        { to: "/cashier/pos", icon: <FaCashRegister />, text: "Bán hàng (POS)" },
        { to: "/cashier/payment-history", icon: <FaHistory />, text: "Lịch sử thanh toán" },
        { to: "/cashier/shift-reports", icon: <FaChartPie />, text: "Tổng kết ca" },
        { to: "/my-schedule", icon: <FaUserClock />, text: "Xem lịch làm việc" },
        { to: "/shift-change-request", icon: <FaExchangeAlt />, text: "Yêu cầu đổi lịch" },
        { to: "/cashier/profile", icon: <FaUserCircle />, text: "Hồ sơ cá nhân" }
    ],
    CEO: [
        { to: "/ceo/dashboard", icon: <FaChartLine />, text: "Bảng điều khiển" },
        { to: "/ceo/revenue", icon: <FaChartPie />, text: "Bảng doanh thu" },
        { to: "/ceo/orders", icon: <FaClipboardList />, text: "Bảng nhập/xuất" }
    ],
    Warehouse: [
        // - Quản lý tồn kho tổng
        { to: "/warehouse/inventory", icon: <FaBoxes />, text: "Quản lý Tồn kho" },
        { to: "/warehouse/stock-count-reports", icon: <FaChartPie />, text: "Báo cáo Kiểm kê" },
        // Đơn hàng
        { to: "/warehouse/orders", icon: <FaClipboardList />, text: "Phiếu nhập hàng" },
        { to: "/warehouse/branch-orders", icon: <FaTruck />, text: "Đơn hàng chi nhánh" },
        // Sản phẩm & Giá
        { to: "/warehouse/products", icon: <FaBox />, text: "Quản lý Sản phẩm" },
        { to: "/warehouse/suppliers", icon: <FaBuilding />, text: "Quản lý nhà cung cấp" },
    ],

    Supplier: [
        { to: "/supplier/portal", icon: <FaTruck />, text: "Đơn đặt hàng" }
    ],
};

const getMenuHeading = (role) => {
    switch (role) {
        case 'Admin': return 'Admin Tools';
        case 'Manager': return 'Quản lý Cửa hàng';
        case 'CEO': return 'Báo cáo';
        case 'Warehouse': return 'Kho vận';
        case 'Supplier': return 'Đối tác';
        case 'Cashier': return 'Nghiệp vụ';
        default: return 'Menu';
    }
};

const getRoleLabel = (role) => {
    switch (role) {
        case 'Admin': return 'Quản trị viên';
        case 'Manager': return 'Quản lý cửa hàng';
        case 'CEO': return 'Giám đốc';
        case 'Warehouse': return 'Tổng kho';
        case 'Supplier': return 'Nhà cung cấp';
        case 'Cashier': return 'Thu ngân';
        default: return role;
    }
};

// =====================================================
// SIDEBAR COMPONENT
// =====================================================

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const requestLogout = () => setShowConfirm(true);
    const cancelLogout = () => setShowConfirm(false);
    const confirmLogout = () => {
        setShowConfirm(false);
        handleLogout();
    };

    const userNavLinks = user ? navLinks[user.role] || [] : [];
    const menuHeading = user ? getMenuHeading(user.role) : 'Menu';

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

                        <span className="user-role">{getRoleLabel(user.role)}</span>
                    </div>
                )}
                <Button
                    variant="secondary"
                    className="w-100 btn-logout"
                    onClick={requestLogout}
                    title="Đăng xuất"
                >
                    <FaSignOutAlt className="logout-icon" />
                    <span className="nav-text">Đăng xuất</span>
                </Button>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                show={showConfirm}
                onHide={cancelLogout}
                onConfirm={confirmLogout}
                title="Xác nhận đăng xuất"
                message="Bạn có chắc chắn muốn đăng xuất không?"
            />
        </div>
    );
};

export default Sidebar;
