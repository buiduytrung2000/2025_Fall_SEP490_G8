// src/components/layout/MainLayout.js
import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../../assets/MainLayout.css';

const MainLayout = () => {
    // Thêm state để quản lý sidebar, mặc định là mở
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Hàm để đảo ngược trạng thái
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="layout-container">
            {/* Truyền state và hàm toggle vào Sidebar */}
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            
            {/* Thêm class động cho main content */}
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;