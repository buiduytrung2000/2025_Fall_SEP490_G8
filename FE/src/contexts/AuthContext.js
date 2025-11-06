// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

    const login = async (email, password) => {
        try {
            const res = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data && data.err === 0 && data.token) {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                const backendRole = payload.role;
                const roleMap = { 'Store_Manager': 'Manager' };
                const mappedRole = roleMap[backendRole] || backendRole;
                const loggedInUser = {
                    id: payload.id,
                    email: payload.email,
                    username: payload.username,
                    role: mappedRole,
                    token: data.token
                };
                localStorage.setItem('user', JSON.stringify(loggedInUser));
                setUser(loggedInUser);
                return { success: true, user: loggedInUser };
            }
            return { success: false, message: data?.msg || 'Login failed' };
        } catch (e) {
            return { success: false, message: 'Network error' };
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);