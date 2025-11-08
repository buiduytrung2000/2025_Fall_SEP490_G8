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

// Get inventory by store_id (for store manager)
// If store_id not provided, will use user's store_id
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

// Update inventory stock
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

