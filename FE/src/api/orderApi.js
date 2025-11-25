const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

/**
 * Get auth headers
 */
const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : { 'Content-Type': 'application/json' };
    } catch {
        return { 'Content-Type': 'application/json' };
    }
};

/**
 * Update order items
 * @param {number} orderId - Order ID
 * @param {Array} items - Array of order items
 */
export async function updateOrderItems(orderId, items) {
    try {
        const res = await fetch(`${API_BASE}/order/${orderId}/items`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ items })
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Update order details
 * @param {number} orderId - Order ID
 * @param {Object} orderData - Order data to update
 */
export async function updateOrder(orderId, orderData) {
    try {
        const res = await fetch(`${API_BASE}/order/${orderId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData)
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get all products
 * @param {Object} params - Query parameters
 */
export async function getAllProducts({ page = 1, limit = 100, search } = {}) {
    try {
        const params = new URLSearchParams({ page, limit });
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE}/product?${params}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get product units
 * @param {number} productId - Product ID
 */
export async function getProductUnits(productId) {
    try {
        const res = await fetch(`${API_BASE}/product/${productId}/units`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

