const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Get available vouchers for a customer
export async function getAvailableVouchers(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/available`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Get all vouchers for a customer
export async function getAllVouchers(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Validate voucher
export async function validateVoucher(voucherCode, customerId, purchaseAmount) {
    const res = await fetch(`${API_BASE}/voucher/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
            voucher_code: voucherCode,
            customer_id: customerId,
            purchase_amount: purchaseAmount
        })
    });
    return res.json();
}

// Create voucher
export async function createVoucher(data) {
    const res = await fetch(`${API_BASE}/voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Update customer loyalty points
export async function updateCustomerLoyaltyPoints(customerId, purchaseAmount) {
    const res = await fetch(`${API_BASE}/customer/${customerId}/loyalty-points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ purchase_amount: purchaseAmount })
    });
    return res.json();
}

export async function generateVouchersForCustomer(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

