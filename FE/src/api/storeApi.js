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

// Get all stores
export const getAllStores = async () => {
    try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/employee/stores`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching stores:', error);
        return { err: 1, data: [] };
    }
};

// Create store (CEO)
export const createStore = async (payload) => {
    try {
        const token = getToken();
        const response = await axios.post(`${API_URL}/employee/stores`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error creating store:', error);
        return error.response?.data || { err: 1, msg: 'Lỗi khi tạo cửa hàng' };
    }
};

// Update store (CEO)
export const updateStore = async (id, payload) => {
    try {
        const token = getToken();
        const response = await axios.put(`${API_URL}/employee/stores/${id}`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating store:', error);
        return error.response?.data || { err: 1, msg: 'Lỗi khi cập nhật cửa hàng' };
    }
};

// Delete store (CEO)
export const deleteStore = async (id) => {
    try {
        const token = getToken();
        const response = await axios.delete(`${API_URL}/employee/stores/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting store:', error);
        return error.response?.data || { err: 1, msg: 'Lỗi khi xóa cửa hàng' };
    }
};

