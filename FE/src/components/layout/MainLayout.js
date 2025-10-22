// src/components/layout/MainLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import Sidebar from './Sidebar';

const MainLayout = () => {
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="w-100 p-4" style={{ overflowY: 'auto', height: '100vh' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;