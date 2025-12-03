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

