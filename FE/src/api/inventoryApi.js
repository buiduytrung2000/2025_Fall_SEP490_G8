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

export async function getStoreInventory(storeId = null) {
    try {
        const url = storeId 
            ? `${API_BASE}/inventory/store/${storeId}`
            : `${API_BASE}/inventory/store`;
        
        const res = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        
        // Check if response is actually JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Non-JSON response received:', text);
            return [];
        }
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            console.error('Error fetching inventory:', errorData);
            return [];
        }
        
        const data = await res.json();
        // Return data in the format expected by the component
        if (data.err === 0 && data.data) {
            return data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

/**
 * Update inventory stock (for Store Manager)
 */
export async function updateInventoryStock(inventoryId, stock, minStockLevel, reorderPoint) {
    try {
        const res = await fetch(`${API_BASE}/inventory/${inventoryId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                stock,
                min_stock_level: minStockLevel,
                reorder_point: reorderPoint
            })
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error updating inventory:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get all warehouse inventory with filters
 * For Warehouse staff
 */
export async function getAllWarehouseInventory({ page = 1, limit = 10, storeId, categoryId, status, search } = {}) {
    try {
        const params = new URLSearchParams({ page, limit });
        if (storeId) params.append('storeId', storeId);
        if (categoryId) params.append('categoryId', categoryId);
        if (status) params.append('status', status);
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE}/inventory/warehouse?${params}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error fetching warehouse inventory:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get inventory detail by ID
 * For Warehouse staff
 */
export async function getInventoryDetail(inventoryId) {
    try {
        const res = await fetch(`${API_BASE}/inventory/warehouse/${inventoryId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error fetching inventory detail:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get inventory statistics
 * For Warehouse staff
 */
export async function getInventoryStatistics(storeId) {
    try {
        const params = new URLSearchParams();
        if (storeId) params.append('storeId', storeId);

        const res = await fetch(`${API_BASE}/inventory/warehouse/statistics?${params}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Get low stock items
 * For Warehouse staff
 */
export async function getLowStockItems({ storeId, page = 1, limit = 10 } = {}) {
    try {
        const params = new URLSearchParams({ page, limit });
        if (storeId) params.append('storeId', storeId);

        const res = await fetch(`${API_BASE}/inventory/warehouse/low-stock?${params}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Update inventory settings (min_stock_level, reorder_point)
 * For Warehouse staff
 */
export async function updateInventorySettings(inventoryId, { min_stock_level, reorder_point }) {
    try {
        const res = await fetch(`${API_BASE}/inventory/warehouse/${inventoryId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ min_stock_level, reorder_point })
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error updating inventory settings:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

/**
 * Adjust stock manually
 * For Warehouse staff
 */
export async function adjustStock(inventoryId, { adjustment, reason }) {
    try {
        const res = await fetch(`${API_BASE}/inventory/warehouse/${inventoryId}/adjust`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ adjustment, reason })
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Error adjusting stock:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}
