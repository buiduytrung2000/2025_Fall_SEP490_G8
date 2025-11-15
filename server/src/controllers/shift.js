import * as shiftService from '../services/shift.js'

export const checkin = async (req, res) => {
  try {
    const cashier_id = req.user?.user_id
    const store_id = req.body.store_id || req.user?.store_id
    const opening_cash = Number(req.body.opening_cash || 0)
    const note = req.body.note || null
    const schedule_id = req.body.schedule_id ? Number(req.body.schedule_id) : null
    if (!cashier_id || !store_id) return res.status(400).json({ err: 1, msg: 'Missing cashier/store' })
    const resp = await shiftService.checkin({ cashier_id, store_id, opening_cash, note, schedule_id })
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at shift checkin: ' + e.message })
  }
}

export const checkout = async (req, res) => {
  try {
    const shift_id = Number(req.params.id)
    const closing_cash = Number(req.body.closing_cash || 0)
    const note = req.body.note || null
    if (!shift_id) return res.status(400).json({ err: 1, msg: 'Missing shift_id' })
    const resp = await shiftService.checkout({ shift_id, closing_cash, note })
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at shift checkout: ' + e.message })
  }
}

export const addCashMovement = async (req, res) => {
  try {
    const shift_id = Number(req.params.id)
    const { type, amount, reason } = req.body
    if (!shift_id || !type || amount == null) return res.status(400).json({ err: 1, msg: 'Missing params' })
    const resp = await shiftService.addCashMovement({ shift_id, type, amount: Number(amount), reason })
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at cash movement: ' + e.message })
  }
}

export const list = async (req, res) => {
  try {
    const resp = await shiftService.list(req.query)
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at shift list: ' + e.message })
  }
}

export const detail = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const resp = await shiftService.detail(id)
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at shift detail: ' + e.message })
  }
}

export const myOpenShift = async (req, res) => {
  try {
    const cashier_id = req.user?.user_id
    const store_id = req.query.store_id || req.user?.store_id
    if (!cashier_id || !store_id) return res.status(400).json({ err: 1, msg: 'Missing cashier/store' })
    const shift = await shiftService.getOpenShiftByCashier({ cashier_id, store_id })
    return res.status(200).json({ err: 0, data: shift })
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at myOpenShift: ' + e.message })
  }
}

export const report = async (req, res) => {
  try {
    const resp = await shiftService.getShiftReport(req.query)
    return res.status(200).json(resp)
  } catch (e) {
    return res.status(500).json({ err: -1, msg: 'Fail at shift report: ' + e.message })
  }
}

