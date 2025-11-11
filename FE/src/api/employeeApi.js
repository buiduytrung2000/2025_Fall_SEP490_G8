const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
};

export async function fetchEmployees(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/employee/employees${query ? `?${query}` : ''}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function fetchEmployeeById(id) {
    const res = await fetch(`${API_BASE}/employee/employees/${id}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

export async function createEmployee(data) {
    const res = await fetch(`${API_BASE}/employee/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateEmployee(id, data) {
    const res = await fetch(`${API_BASE}/employee/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function deleteEmployee(id, permanent = false) {
    const res = await fetch(`${API_BASE}/employee/employees/${id}?permanent=${permanent}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
    });
    return res.json();
}

export async function activateEmployee(id) {
    const res = await fetch(`${API_BASE}/employee/employees/${id}/activate`, {
        method: 'PUT',
        headers: { ...getAuthHeaders() }
    });
    return res.json();
}

export async function fetchEmployeeStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/employee/employees/statistics${query ? `?${query}` : ''}`, {
        headers: { ...getAuthHeaders() }
    });
    return res.json();
}

// Alias for compatibility
export const getEmployees = fetchEmployees;


