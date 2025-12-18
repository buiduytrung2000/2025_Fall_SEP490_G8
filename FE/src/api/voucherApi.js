const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Helper function to get auth headers
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

// Get available vouchers for a customer (optionally filtered by store_id)
export async function getAvailableVouchers(customerId, storeId = null) {
    try {
        const query = storeId ? `?store_id=${storeId}` : '';
        const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/available${query}`, {
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });

        console.log('Voucher API response status:', res.status);

        if (!res.ok) {
            console.error('Voucher API error:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response body:', text);
            return {
                err: 1,
                msg: `API error: ${res.status} ${res.statusText}`,
                data: []
            };
        }

        const data = await res.json();
        console.log('Voucher API data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        return {
            err: 1,
            msg: error.message,
            data: []
        };
    }
}

// Get all vouchers for a customer
export async function getAllVouchers(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}

// Validate voucher (optionally scoped by store_id)
export async function validateVoucher(voucherCode, customerId, purchaseAmount, storeId = null) {
    const res = await fetch(`${API_BASE}/voucher/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
            voucher_code: voucherCode,
            customer_id: customerId,
            purchase_amount: purchaseAmount,
            store_id: storeId
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
    try {
        const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });

        console.log('Generate voucher API response status:', res.status);

        if (!res.ok) {
            console.error('Generate voucher API error:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response body:', text);
            return {
                err: 1,
                msg: `API error: ${res.status} ${res.statusText}`,
                data: []
            };
        }

        const data = await res.json();
        console.log('Generate voucher API data:', data);
        return data;
    } catch (error) {
        console.error('Error generating vouchers:', error);
        return {
            err: 1,
            msg: error.message,
            data: []
        };
    }
}

