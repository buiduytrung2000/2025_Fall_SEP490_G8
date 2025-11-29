import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const getToken = () => {
    try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored).token : null;
    } catch {
        return null;
    }
};

// Get all users (Admin only)
export const getAllUsers = async () => {
    try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/user/list`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

// Get user by ID
export const getUserById = async (userId) => {
    try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// Create new user
export const createUser = async (userData) => {
    try {
        const token = getToken();
        const response = await axios.post(`${API_URL}/user`, userData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// Update user
export const updateUser = async (userId, updateData) => {
    try {
        const token = getToken();
        const response = await axios.put(`${API_URL}/user/${userId}`, updateData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Delete user (soft delete)
export const deleteUser = async (userId) => {
    try {
        const token = getToken();
        const response = await axios.delete(`${API_URL}/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// Reactivate user
export const reactivateUser = async (userId) => {
    try {
        const token = getToken();
        const response = await axios.patch(`${API_URL}/user/${userId}/reactivate`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error reactivating user:', error);
        throw error;
    }
};

// Current user info
export const getCurrentUser = async () => {
    const token = getToken();
    const response = await axios.get(`${API_URL}/user/get-current`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

export const updateMyProfile = async (payload) => {
    const token = getToken();
    const response = await axios.put(`${API_URL}/user/me/profile`, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const changeMyPassword = async (payload) => {
    const token = getToken();
    const response = await axios.put(`${API_URL}/user/me/password`, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};
