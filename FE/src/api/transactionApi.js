import { getAuthToken } from './authHelpers'
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1'

export async function checkoutCart(payload) {
    try {
        const token = getAuthToken()
        const res = await fetch(`${API_BASE}/transaction/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(payload)
        })
        const data = await res.json()
        return data
    } catch (error) {
        return { err: -1, msg: 'Network error: ' + error.message }
    }
}
