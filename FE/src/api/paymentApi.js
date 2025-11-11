const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

function getHeaders() {
    return {
        'Content-Type': 'application/json'
    };
}

function getAuthHeaders() {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const token = user.token;
            if (token) {
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
            }
        }
    } catch (error) {
        console.error('Error getting auth token:', error);
    }
    return {
        'Content-Type': 'application/json'
    };
}

// Create cash payment
export async function createCashPayment(paymentData) {
    try {
        const res = await fetch(`${API_BASE}/payment/cash`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(paymentData)
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error creating cash payment:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

// Create QR payment
export async function createQRPayment(paymentData) {
    try {
        const res = await fetch(`${API_BASE}/payment/qr`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(paymentData)
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error creating QR payment:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

// Check payment status
export async function checkPaymentStatus(orderCode) {
    try {
        const res = await fetch(`${API_BASE}/payment/status/${orderCode}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error checking payment status:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

// Get transaction details
export async function getTransactionDetails(transactionId) {
    try {
        const res = await fetch(`${API_BASE}/payment/transaction/${transactionId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error getting transaction details:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

// Get transaction history
export async function getTransactionHistory(filters = {}) {
    try {
        const queryParams = new URLSearchParams();

        if (filters.date) queryParams.append('date', filters.date);
        if (filters.payment_method) queryParams.append('payment_method', filters.payment_method);
        if (filters.store_id) queryParams.append('store_id', filters.store_id);
        if (filters.cashier_id) queryParams.append('cashier_id', filters.cashier_id);

        const queryString = queryParams.toString();
        const url = `${API_BASE}/payment/history${queryString ? '?' + queryString : ''}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error getting transaction history:', error);
        return { err: -1, msg: 'Network error: ' + error.message };
    }
}

