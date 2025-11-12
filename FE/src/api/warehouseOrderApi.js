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
 * Get all warehouse orders with filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status
 * @param {number} params.storeId - Filter by store
 * @param {number} params.supplierId - Filter by supplier
 * @param {string} params.search - Search term
 */
export async function getAllWarehouseOrders({ page = 1, limit = 10, status, storeId, supplierId, search } = {}) {
    try {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        if (storeId) params.append('storeId', storeId);
        if (supplierId) params.append('supplierId', supplierId);
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE}/warehouse-order?${params}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get warehouse order detail
 * @param {number} orderId - Order ID
 */
export async function getWarehouseOrderDetail(orderId) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/${orderId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Update warehouse order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status: pending, confirmed, shipped, delivered, cancelled
 */
export async function updateWarehouseOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/${orderId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Update expected delivery date
 * @param {number} orderId - Order ID
 * @param {string} expected_delivery - Delivery date (YYYY-MM-DD HH:mm:ss)
 */
export async function updateExpectedDelivery(orderId, expected_delivery) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/${orderId}/delivery`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ expected_delivery })
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get orders by status
 * @param {string} status - Status filter
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
export async function getOrdersByStatus(status, page = 1, limit = 10) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/status/${status}?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get order statistics
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
export async function getOrderStatistics(startDate, endDate) {
    try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`${API_BASE}/warehouse-order/statistics?${params}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get orders by store
 * @param {number} storeId - Store ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
export async function getOrdersByStore(storeId, page = 1, limit = 10) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/store/${storeId}?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

export async function updateOrderItemQuantity(orderItemId, actual_quantity) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order/order-item/${orderItemId}/quantity`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ actual_quantity })
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Create warehouse order (Store Manager -> Warehouse)
 * payload: { items: [{ inventory_id, quantity }], note?, store_id? }
 */
export async function createWarehouseOrder(payload) {
    try {
        const res = await fetch(`${API_BASE}/warehouse-order`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}