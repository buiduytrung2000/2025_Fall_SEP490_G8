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
export async function getAllVoucherTemplates(isActive = null) {
    const params = new URLSearchParams();
    if (isActive !== null) {
        params.append('is_active', isActive);
    }
    const res = await fetch(`${API_BASE}/voucher-template?${params.toString()}`, {
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
export async function getAvailableTemplatesForCustomer(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/available-templates`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Add voucher from template
export async function addVoucherFromTemplate(customerId, templateId) {
    const res = await fetch(`${API_BASE}/voucher/add-from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ customer_id: customerId, template_id: templateId })
    });
    return res.json();
}

