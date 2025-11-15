const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
};

// Get all customers
export async function getAllCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/customer${query ? `?${query}` : ''}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Get customer by ID
export async function getCustomerById(id) {
    const res = await fetch(`${API_BASE}/customer/${id}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Search customer by phone
export async function searchCustomerByPhone(phone) {
    const res = await fetch(`${API_BASE}/customer/search?phone=${encodeURIComponent(phone)}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Create new customer
export async function createCustomer(data) {
    const res = await fetch(`${API_BASE}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Update customer
export async function updateCustomer(id, data) {
    const res = await fetch(`${API_BASE}/customer/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Delete customer
export async function deleteCustomer(id) {
    const res = await fetch(`${API_BASE}/customer/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

