const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

/**
 * Login API
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {Promise<Object>} Response với err, msg, token, user
 */
export async function login(email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return {
            err: -1,
            msg: 'Network error: ' + error.message,
            token: null,
            user: null
        };
    }
}

/**
 * Register API
 * @param {Object} userData - User data
 * @param {string} userData.username - Username (required)
 * @param {string} userData.password - Password (required)
 * @param {string} userData.role - Role: CEO, Store_Manager, Cashier, Warehouse, Supplier (required)
 * @param {string} [userData.email] - Email (optional)
 * @param {number} [userData.store_id] - Store ID (optional)
 * @returns {Promise<Object>} Response với err, msg, token, user
 */
export async function register(userData) {
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return {
            err: -1,
            msg: 'Network error: ' + error.message,
            token: null,
            user: null
        };
    }
}

/**
 * Get auth headers for authenticated requests
 * @returns {Object} Headers với Authorization token
 */
export const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
        return {};
    }
};

