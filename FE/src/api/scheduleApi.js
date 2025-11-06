const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

const getAuthHeaders = () => {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
};

export async function getShiftTemplates() {
    const res = await fetch(`${API_BASE}/schedule/shift-templates`, { headers: { ...getAuthHeaders() } });
    return res.json();
}

export async function getSchedules(storeId, startDate, endDate) {
    const qs = new URLSearchParams({ store_id: storeId, start_date: startDate, end_date: endDate }).toString();
    const res = await fetch(`${API_BASE}/schedule/schedules?${qs}`, { headers: { ...getAuthHeaders() } });
    return res.json();
}

export async function getMySchedules(startDate, endDate) {
    const qs = new URLSearchParams({ start_date: startDate, end_date: endDate }).toString();
    const res = await fetch(`${API_BASE}/schedule/schedules/my-schedules?${qs}`, { headers: { ...getAuthHeaders() } });
    return res.json();
}

export async function createSchedule(data) {
    const res = await fetch(`${API_BASE}/schedule/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateSchedule(id, data) {
    const res = await fetch(`${API_BASE}/schedule/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function deleteSchedule(id) {
    const res = await fetch(`${API_BASE}/schedule/schedules/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
    });
    return res.json();
}

export async function getAvailableEmployees(storeId, workDate, shiftTemplateId, role = 'Cashier') {
    const qs = new URLSearchParams({ store_id: storeId, work_date: workDate, shift_template_id: shiftTemplateId, role }).toString();
    const res = await fetch(`${API_BASE}/schedule/schedules/available-employees?${qs}`, { headers: { ...getAuthHeaders() } });
    return res.json();
}


