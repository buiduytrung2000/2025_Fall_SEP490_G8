// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import { login as loginApi, register as registerApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const login = async (email, password) => {
        try {
            const data = await loginApi(email, password);
            if (data && data.err === 0 && data.token) {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                const backendRole = payload.role;
                const roleMap = { 'Store_Manager': 'Manager' };
                const mappedRole = roleMap[backendRole] || backendRole;
                const loggedInUser = {
                    user_id: payload.user_id,
                    id: payload.user_id, // Keep for backward compatibility
                    email: data.user?.email || null,
                    username: payload.username,
                    role: mappedRole,
                    token: data.token
                };
                localStorage.setItem('user', JSON.stringify(loggedInUser));
                setUser(loggedInUser);
                return { success: true, user: loggedInUser };
            }
            return { success: false, message: data?.msg || 'Đăng nhập thất bại' };
        } catch (e) {
            return { success: false, message: 'Lỗi kết nối: ' + e.message };
        }
    };

    const register = async (userData) => {
        try {
            const data = await registerApi(userData);
            if (data && data.err === 0 && data.token) {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                const backendRole = payload.role;
                const roleMap = { 'Store_Manager': 'Manager' };
                const mappedRole = roleMap[backendRole] || backendRole;
                const registeredUser = {
                    user_id: payload.user_id,
                    id: payload.user_id,
                    email: data.user?.email || null,
                    username: payload.username,
                    role: mappedRole,
                    token: data.token
                };
                localStorage.setItem('user', JSON.stringify(registeredUser));
                setUser(registeredUser);
                return { success: true, user: registeredUser, message: data.msg };
            }
            return { success: false, message: data?.msg || 'Đăng ký thất bại' };
        } catch (e) {
            return { success: false, message: 'Lỗi kết nối: ' + e.message };
        }
    };

    const logout = () => {
        try {
            localStorage.removeItem('user');
            localStorage.removeItem('store_id');
        } catch {}
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);