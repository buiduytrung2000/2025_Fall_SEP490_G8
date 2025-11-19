// src/components/layout/MainLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../../assets/MainLayout.css';

const MainLayout = () => {
    // Thêm state để quản lý sidebar, mặc định là mở
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    // Hàm để đảo ngược trạng thái
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        if (location.pathname.startsWith('/manager/schedule')) {
            setIsSidebarOpen(true);
        }
    }, [location.pathname]);

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