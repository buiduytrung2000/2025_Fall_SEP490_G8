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

export async function getShiftReport({ store_id, cashier_id, date_from, date_to }) {
  try {
    const params = new URLSearchParams()
    if (store_id) params.append('store_id', store_id)
    if (cashier_id) params.append('cashier_id', cashier_id)
    if (date_from) params.append('date_from', date_from)
    if (date_to) params.append('date_to', date_to)
    
    const res = await fetch(`${API_BASE}/shifts/report?${params.toString()}`, {
      method: 'GET',
      headers: headers()
    })
    return await res.json()
  } catch (e) {
    return { err: -1, msg: e.message }
  }
}

