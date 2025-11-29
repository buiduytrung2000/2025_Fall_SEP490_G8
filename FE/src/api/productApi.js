const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

// Get auth token from localStorage
const getAuthToken = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.token || '';
        }
    } catch (error) {
        console.error('Error getting token:', error);
    }
    return '';
};

// Common fetch headers
const getHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// PRODUCT APIs
export async function getProductsByStore(storeId) {
    if (!storeId) {
        return { err: 1, msg: 'Missing storeId', data: [] };
    }
    try {
        const res = await fetch(`${API_BASE}/product/by-store/${storeId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

export async function getAllProducts(query = {}) {
    try {
        const queryString = new URLSearchParams(query).toString();
        const url = `${API_BASE}/product${queryString ? '?' + queryString : ''}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

export async function getProduct(productId) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

export async function getProductsForPriceManagement(query = {}) {
    try {
        const queryString = new URLSearchParams(query).toString();
        const url = `${API_BASE}/product/for-pricing${queryString ? '?' + queryString : ''}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

// CREATE PRODUCT
export async function createProduct(productData) {
    try {
        const token = getAuthToken();
        if (!token) {
            return { err: 1, msg: 'Missing access token. Please login again.' };
        }

        const res = await fetch(`${API_BASE}/product`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(productData)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// UPDATE PRODUCT
export async function updateProduct(productId, productData) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(productData)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// SOFT DELETE PRODUCT
export async function deleteProduct(productId) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// RESTORE PRODUCT
export async function restoreProduct(productId) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}/restore`, {
            method: 'PATCH',
            headers: getHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// HARD DELETE PRODUCT (permanent deletion)
export async function hardDeleteProduct(productId) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}/hard-delete`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// TOGGLE PRODUCT STATUS
export async function toggleProductStatus(productId) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/product/${productId}/toggle`, {
            method: 'PATCH',
            headers: getHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// CATEGORY APIs
export async function getAllCategories() {
    try {
        const res = await fetch(`${API_BASE}/category`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

// SUPPLIER APIs
export async function getAllSuppliers() {
    try {
        const res = await fetch(`${API_BASE}/supplier`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

// PRICING RULE APIs
export async function getAllPricingRules(query = {}) {
    try {
        const queryString = new URLSearchParams(query).toString();
        const url = `${API_BASE}/pricing-rule${queryString ? '?' + queryString : ''}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

export async function getPricingRule(ruleId) {
    if (!ruleId) {
        return { err: 1, msg: 'Missing ruleId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/pricing-rule/${ruleId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

export async function getProductPriceHistory(productId, storeId = null) {
    if (!productId) {
        return { err: 1, msg: 'Missing productId', data: [] };
    }
    try {
        const queryString = storeId ? `?store_id=${storeId}` : '';
        const res = await fetch(`${API_BASE}/pricing-rule/product/${productId}/history${queryString}`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}

export async function getCurrentPrice(productId, storeId) {
    if (!productId || !storeId) {
        return { err: 1, msg: 'Missing productId or storeId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/pricing-rule/product/${productId}/store/${storeId}/current`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

export async function createPricingRule(pricingRuleData) {
    try {
        const token = getAuthToken();
        if (!token) {
            return { err: 1, msg: 'Missing access token. Please login again.' };
        }

        const res = await fetch(`${API_BASE}/pricing-rule`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(pricingRuleData)
        });

        // Check if response is ok
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ err: 1, msg: 'Request failed' }));
            return errorData;
        }

        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

export async function updatePricingRule(ruleId, pricingRuleData) {
    if (!ruleId) {
        return { err: 1, msg: 'Missing ruleId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/pricing-rule/${ruleId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(pricingRuleData)
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

export async function deletePricingRule(ruleId) {
    if (!ruleId) {
        return { err: 1, msg: 'Missing ruleId', data: null };
    }
    try {
        const res = await fetch(`${API_BASE}/pricing-rule/${ruleId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: null };
    }
}

// UNIT APIs
export async function getAllUnits() {
    try {
        const res = await fetch(`${API_BASE}/unit`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await res.json();
        return data;
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message, data: [] };
    }
}


