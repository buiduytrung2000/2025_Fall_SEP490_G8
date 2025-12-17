const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

function getAuthHeaders() {
    try {
        const stored = localStorage.getItem('user');
        if (!stored) return {};
        const { token } = JSON.parse(stored);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch {
        return {};
    }
}

// Get all voucher templates
// params: { is_active?, store_id? }
export async function getAllVoucherTemplates(params = {}) {
    const search = new URLSearchParams();
    if (params.is_active !== undefined && params.is_active !== null) {
        search.append('is_active', params.is_active);
    }
    if (params.store_id !== undefined && params.store_id !== null) {
        search.append('store_id', params.store_id);
    }
    const qs = search.toString();
    const res = await fetch(`${API_BASE}/voucher-template${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Get voucher template by ID
export async function getVoucherTemplateById(id) {
    const res = await fetch(`${API_BASE}/voucher-template/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Create voucher template
export async function createVoucherTemplate(data) {
    const res = await fetch(`${API_BASE}/voucher-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Update voucher template
export async function updateVoucherTemplate(id, data) {
    const res = await fetch(`${API_BASE}/voucher-template/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Delete voucher template
export async function deleteVoucherTemplate(id) {
    const res = await fetch(`${API_BASE}/voucher-template/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Get available templates for customer
// params: { store_id? }
export async function getAvailableTemplatesForCustomer(customerId, params = {}) {
    const search = new URLSearchParams();
    if (params.store_id !== undefined && params.store_id !== null) {
        search.append('store_id', params.store_id);
    }
    const qs = search.toString();
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/available-templates${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Add voucher from template
// Optional third param: storeId - để gán voucher theo cửa hàng của người tạo
export async function addVoucherFromTemplate(customerId, templateId, storeId) {
    const payload = {
        customer_id: customerId,
        template_id: templateId,
    };
    if (storeId !== undefined && storeId !== null) {
        payload.store_id = storeId;
    }

    const res = await fetch(`${API_BASE}/voucher/add-from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
    });
    return res.json();
}

