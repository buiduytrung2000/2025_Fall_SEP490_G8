const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

// Get auth token from localStorage
const getAuthToken = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.token || '';
        }
    } catch (error) {
        console.error('Error getting token:', error);
    }
    return '';
};

// Common fetch headers
const getHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Create store order
export async function createStoreOrder(orderData) {
    try {
        const res = await fetch(`${API_BASE}/store-order`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(orderData)
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error creating store order:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

// Get store orders
export async function getStoreOrders(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'All') {
            params.append('status', filters.status);
        }
        if (filters.order_type && filters.order_type !== 'All') {
            params.append('order_type', filters.order_type);
        }

        const url = `${API_BASE}/store-order${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            console.error('Error fetching store orders:', errorData);
            return [];
        }
        
        const data = await res.json();
        if (data.err === 0 && data.data) {
            return data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching store orders:', error);
        return [];
    }
}

// Update store order status (for store to mark as delivered)
export async function updateStoreOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${API_BASE}/store-order/${orderId}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error updating store order status:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

