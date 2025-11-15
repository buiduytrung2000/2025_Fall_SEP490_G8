import db from '../models'

export const getOpenShiftByCashier = async ({ cashier_id, store_id }) => {
  const shift = await db.Shift.findOne({ 
    where: { cashier_id, store_id, status: 'opened' },
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] },
      { 
        model: db.Schedule, 
        as: 'schedule', 
        attributes: ['schedule_id', 'attendance_status', 'work_date'],
        required: false 
      }
    ]
  })
  return shift
}

export const checkin = async ({ cashier_id, store_id, opening_cash = 0, note = null, schedule_id = null }) => {
  const t = await db.sequelize.transaction()
  try {
    const existing = await db.Shift.findOne({ 
      where: { cashier_id, store_id, status: 'opened' }, 
      transaction: t, 
      lock: t.LOCK.UPDATE 
    })
    if (existing) {
      await t.rollback()
      return { err: 1, msg: 'Hiện đang có ca mở' }
    }

    // Nếu không có schedule_id, tìm schedule tương ứng với cashier, store và ngày hôm nay
    let foundScheduleId = schedule_id
    if (!foundScheduleId) {
      const today = new Date().toISOString().split('T')[0]
      const schedule = await db.Schedule.findOne({
        where: {
          user_id: cashier_id,
          store_id: store_id,
          work_date: today,
          status: 'confirmed'
        },
        transaction: t
      })
      if (schedule) {
        foundScheduleId = schedule.schedule_id
      }
    }

    // Bắt buộc phải có schedule để check-in
    if (!foundScheduleId) {
      await t.rollback()
      return { err: 1, msg: 'Bạn không có lịch làm việc hôm nay. Vui lòng liên hệ quản lý để được phân công lịch.' }
    }

    const shift = await db.Shift.create({ 
      cashier_id, 
      store_id,
      schedule_id: foundScheduleId,
      opening_cash, 
      status: 'opened', 
      note 
    }, { transaction: t })

    // Cập nhật attendance_status của schedule nếu có
    if (foundScheduleId) {
      await db.Schedule.update(
        { attendance_status: 'checked_in' },
        { where: { schedule_id: foundScheduleId }, transaction: t }
      )
    }

    await t.commit()
    return { err: 0, data: shift }
  } catch (e) {
    await t.rollback()
    return { err: -1, msg: 'Fail at shift checkin: ' + e.message }
  }
}

export const checkout = async ({ shift_id, closing_cash = 0, note = null }) => {
  const t = await db.sequelize.transaction()
  try {
    const shift = await db.Shift.findOne({ 
      where: { shift_id }, 
      transaction: t, 
      lock: t.LOCK.UPDATE 
    })
    if (!shift || shift.status !== 'opened') {
      await t.rollback()
      return { err: 1, msg: 'Ca không tồn tại hoặc đã đóng' }
    }

    // Tính lại tổng doanh thu tiền mặt từ Transaction + Payment để đảm bảo chính xác
    // (cash_sales_total đã được cập nhật real-time khi checkout, nhưng tính lại để đảm bảo)
    const cashTransactions = await db.Transaction.findAll({
      where: { shift_id: shift.shift_id },
      include: [{ 
        model: db.Payment, 
        as: 'payment', 
        where: { method: 'cash', status: 'completed' },
        required: true
      }],
      transaction: t
    })
    const sumCash = cashTransactions.reduce((acc, tr) => acc + parseFloat(tr.total_amount || 0), 0)

    await shift.update({
      status: 'closed',
      closed_at: new Date(),
      closing_cash: closing_cash,
      cash_sales_total: sumCash, // Cập nhật lại để đảm bảo chính xác
      note
    }, { transaction: t })

    // Cập nhật attendance_status của schedule nếu có
    if (shift.schedule_id) {
      await db.Schedule.update(
        { attendance_status: 'checked_out' },
        { where: { schedule_id: shift.schedule_id }, transaction: t }
      )
    }

    await t.commit()
    return { err: 0, data: shift }
  } catch (e) {
    await t.rollback()
    return { err: -1, msg: 'Fail at shift checkout: ' + e.message }
  }
}

export const addCashMovement = async ({ shift_id, type, amount, reason = null }) => {
  try {
    const shift = await db.Shift.findOne({ where: { shift_id } })
    if (!shift || shift.status !== 'opened') return { err: 1, msg: 'Ca không hợp lệ' }
    const movement = await db.ShiftCashMovement.create({ shift_id, type, amount, reason })
    return { err: 0, data: movement }
  } catch (e) {
    return { err: -1, msg: 'Fail at cash movement: ' + e.message }
  }
}

export const list = async (query) => {
  const { store_id, cashier_id, status, from, to } = query
  const where = {}
  if (store_id) where.store_id = store_id
  if (cashier_id) where.cashier_id = cashier_id
  if (status) where.status = status
  if (from || to) {
    where.opened_at = {}
    if (from) where.opened_at[db.Sequelize.Op.gte] = new Date(from)
    if (to) where.opened_at[db.Sequelize.Op.lte] = new Date(to)
  }
  const rows = await db.Shift.findAll({ 
    where, 
    order: [['opened_at', 'DESC']],
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] }
    ]
  })
  return { err: 0, data: rows }
}

export const detail = async (id) => {
  const shift = await db.Shift.findOne({
    where: { shift_id: id },
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] },
      { model: db.ShiftCashMovement, as: 'cashMovements', order: [['created_at', 'DESC']] },
      { 
        model: db.Transaction, 
        as: 'transactions', 
        attributes: ['transaction_id','total_amount','created_at'],
        include: [
          { model: db.Payment, as: 'payment', attributes: ['method', 'status', 'amount'] }
        ]
      }
    ]
  })
  if (!shift) return { err: 1, msg: 'Not found' }
  
  // Tính expected cash (opening + cash sales + cash movements)
  const cashMovements = shift.cashMovements || []
  const netCashMovement = cashMovements.reduce((acc, m) => {
    return acc + (m.type === 'cash_in' ? parseFloat(m.amount || 0) : -parseFloat(m.amount || 0))
  }, 0)
  const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0) + netCashMovement
  const discrepancy = shift.closing_cash ? parseFloat(shift.closing_cash) - expectedCash : null
  
  return { 
    err: 0, 
    data: {
      ...shift.toJSON(),
      expected_cash: expectedCash,
      discrepancy: discrepancy
    }
  }
}

// Báo cáo: Tổng hợp ca theo ngày/cửa hàng/nhân viên
export const getShiftReport = async (query) => {
  const { store_id, cashier_id, date_from, date_to } = query
  const where = { status: 'closed' } // Chỉ lấy ca đã đóng
  if (store_id) where.store_id = store_id
  if (cashier_id) where.cashier_id = cashier_id
  if (date_from || date_to) {
    where.opened_at = {}
    if (date_from) where.opened_at[db.Sequelize.Op.gte] = new Date(date_from)
    if (date_to) where.opened_at[db.Sequelize.Op.lte] = new Date(date_to)
  }

  const shifts = await db.Shift.findAll({
    where,
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] },
      { model: db.ShiftCashMovement, as: 'cashMovements' }
    ],
    order: [['opened_at', 'DESC']]
  })

  // Tính toán thống kê
  const stats = shifts.reduce((acc, shift) => {
    const cashMovements = shift.cashMovements || []
    const netCashMovement = cashMovements.reduce((sum, m) => {
      return sum + (m.type === 'cash_in' ? parseFloat(m.amount || 0) : -parseFloat(m.amount || 0))
    }, 0)
    const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0) + netCashMovement
    const actualCash = parseFloat(shift.closing_cash || 0)
    const discrepancy = actualCash - expectedCash

    acc.total_shifts += 1
    acc.total_opening_cash += parseFloat(shift.opening_cash || 0)
    acc.total_cash_sales += parseFloat(shift.cash_sales_total || 0)
    acc.total_closing_cash += actualCash
    acc.total_discrepancy += discrepancy
    if (discrepancy !== 0) acc.shifts_with_discrepancy += 1

    return acc
  }, {
    total_shifts: 0,
    total_opening_cash: 0,
    total_cash_sales: 0,
    total_closing_cash: 0,
    total_discrepancy: 0,
    shifts_with_discrepancy: 0
  })

  return {
    err: 0,
    data: {
      shifts,
      summary: {
        ...stats,
        average_discrepancy: stats.total_shifts > 0 ? stats.total_discrepancy / stats.total_shifts : 0
      }
    }
  }
}
