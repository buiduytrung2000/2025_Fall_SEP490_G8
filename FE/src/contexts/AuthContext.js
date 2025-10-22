// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import { loginApi } from '../api/mockApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

    const login = async (username, password) => {
        const response = await loginApi(username, password);
        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);
        }
        return response;
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