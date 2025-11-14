const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
};

export async function getTodayKPIs(storeId = null) {
    const query = storeId ? `?store_id=${storeId}` : '';
    const res = await fetch(`${API_BASE}/dashboard/kpis${query}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function getRevenueLast7Days(storeId = null) {
    const query = storeId ? `?store_id=${storeId}` : '';
    const res = await fetch(`${API_BASE}/dashboard/revenue-last-7-days${query}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function getTopSellingProducts(storeId = null, limit = 5) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId);
    params.append('limit', limit);
    const res = await fetch(`${API_BASE}/dashboard/top-products?${params}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function getTodaySchedules(storeId = null) {
    const query = storeId ? `?store_id=${storeId}` : '';
    const res = await fetch(`${API_BASE}/dashboard/today-schedules${query}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function getEmployeeStats(storeId = null) {
    const query = storeId ? `?store_id=${storeId}` : '';
    const res = await fetch(`${API_BASE}/dashboard/employee-stats${query}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function getLowStockProducts(storeId = null, limit = 5) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId);
    params.append('limit', limit);
    const res = await fetch(`${API_BASE}/dashboard/low-stock?${params}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

