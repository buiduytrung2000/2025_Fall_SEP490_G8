const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

export async function getProductsByStore(storeId) {
    if (!storeId) {
        return { err: 1, msg: 'Missing storeId', data: [] };
    }
    try {
        const res = await fetch(`${API_BASE}/product/by-store/${storeId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}


