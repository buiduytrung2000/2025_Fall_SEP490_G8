// src/components/layout/Sidebar.js
import React from "react";
import { Nav, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "../../assets/Sidebar.css"; // Import file CSS mới

// Import các icon
import {
  FaStore,
  FaUsersCog,
  FaBox,
  FaChartLine,
  FaWarehouse,
  FaTruck,
  FaSignOutAlt,
  FaUserFriends, FaCalendarAlt,
} from "react-icons/fa";

// Cấu hình các link điều hướng theo vai trò để code sạch hơn
const navLinks = {
  Admin: [
    { to: "/admin/permissions", icon: <FaUsersCog />, text: "Phân quyền" },
  ],
  Manager: [
    { to: "/manager/products", icon: <FaBox />, text: "Quản lý Sản phẩm" },
    {
      to: "/manager/staff",
      icon: <FaUserFriends />,
      text: "Quản lý Nhân viên",
    },
    { to: "/manager/schedule", icon: <FaCalendarAlt />, text: "Lịch làm việc" },
  ],
  CEO: [
    { to: "/ceo/dashboard", icon: <FaChartLine />, text: "Bảng điều khiển" },
  ],
  Warehouse: [
    { to: "/warehouse/inventory", icon: <FaWarehouse />, text: "Tồn kho" },
  ],
  Supplier: [
    { to: "/supplier/portal", icon: <FaTruck />, text: "Đơn đặt hàng" },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Lấy danh sách link tương ứng với vai trò của user
  const userNavLinks = user ? navLinks[user.role] || [] : [];

  return (
    <div className="sidebar-container">
      {/* 1. Phần Brand/Logo */}
      <Link to="/" className="sidebar-brand">
        <FaStore className="sidebar-brand-icon" />
        <span>CCMS</span>
      </Link>

      {/* 2. Phần Điều Hướng Chính */}
      <Nav className="flex-column sidebar-nav">
        {userNavLinks.map((link) => (
          <LinkContainer to={link.to} key={link.to}>
            <Nav.Link>
              <span className="nav-icon">{link.icon}</span>
              {link.text}
            </Nav.Link>
          </LinkContainer>
        ))}
      </Nav>

      {/* 3. Phần Footer (Thông tin user & Đăng xuất) */}
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-role">{user?.role}</span>
        </div>
        <Button
          variant="outline-light"
          className="w-100"
          onClick={handleLogout}
        >
          <FaSignOutAlt className="me-2" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
