import { getAuthToken } from './authHelpers'
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1'

const headers = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

export async function getMyOpenShift(storeId) {
  try {
    const res = await fetch(`${API_BASE}/shifts/me/open${storeId ? `?store_id=${storeId}` : ''}`, {
      method: 'GET',
      headers: headers()
    })
    return await res.json()
  } catch (e) {
    return { err: -1, msg: e.message }
  }
}

export async function checkinShift({ store_id, opening_cash, note }) {
  try {
    const res = await fetch(`${API_BASE}/shifts/checkin`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ store_id, opening_cash, note })
    })
    return await res.json()
  } catch (e) {
    return { err: -1, msg: e.message }
  }
}

export async function checkoutShift({ shift_id, closing_cash, note }) {
  try {
    const res = await fetch(`${API_BASE}/shifts/${shift_id}/checkout`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ closing_cash, note })
    })
    return await res.json()
  } catch (e) {
    return { err: -1, msg: e.message }
  }
}

export async function createCashMovement({ shift_id, type, amount, reason }) {
  try {
    const res = await fetch(`${API_BASE}/shifts/${shift_id}/cash-movements`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ type, amount, reason })
    })
    return await res.json()
  } catch (e) {
    return { err: -1, msg: e.message }
  }
}

