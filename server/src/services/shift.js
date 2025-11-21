import db from '../models'
import { Op } from 'sequelize'

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
  
    // Tính lại tổng doanh thu từ tất cả transaction trong shift này (lấy từ database)
  if (shift) {
    // Tính tổng doanh thu tiền mặt từ tất cả transaction cash
    const cashTransactions = await db.Transaction.findAll({
      where: { 
        shift_id: shift.shift_id,
        status: 'completed'
      },
      include: [{ 
        model: db.Payment, 
        as: 'payment', 
        where: { 
          method: 'cash',
          status: 'completed' 
        },
        required: true
      }]
    })
    const cashSalesTotal = cashTransactions.reduce((acc, tr) => acc + parseFloat(tr.total_amount || 0), 0)
    
    // Tính tổng doanh thu từ chuyển khoản (bank_transfer, qr)
    const bankTransferTransactions = await db.Transaction.findAll({
      where: { 
        shift_id: shift.shift_id,
        status: 'completed'
      },
      include: [{ 
        model: db.Payment, 
        as: 'payment', 
        where: { 
          method: { [Op.in]: ['bank_transfer', 'qr'] },
          status: 'completed' 
        },
        required: true
      }]
    })
    const bankTransferTotal = bankTransferTransactions.reduce((acc, tr) => acc + parseFloat(tr.total_amount || 0), 0)
    
    // Thêm vào shift object để frontend có thể sử dụng
    const shiftData = shift.toJSON()
    shiftData.cash_sales_total = cashSalesTotal // Cập nhật giá trị tính từ database
    shiftData.bank_transfer_total = bankTransferTotal
    shiftData.total_sales = cashSalesTotal + bankTransferTotal
    console.log(`getOpenShiftByCashier - shift_id: ${shift.shift_id}, cash_sales_total (from DB): ${cashSalesTotal}, bank_transfer_total (from DB): ${bankTransferTotal}, total_sales: ${shiftData.total_sales}`)
    return shiftData
  }
  
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
  
  // Tính expected cash (opening + cash sales)
  const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0)
  const discrepancy = shift.closing_cash != null ? parseFloat(shift.closing_cash) - expectedCash : null
  
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
  
  // Filter theo closed_at (ưu tiên) hoặc opened_at nếu closed_at null
  if (date_from || date_to) {
    const dateConditions = []
    
    if (date_from) {
      const fromDate = new Date(date_from)
      fromDate.setHours(0, 0, 0, 0)
      dateConditions.push({
        [Op.or]: [
          { closed_at: { [Op.gte]: fromDate } },
          { 
            closed_at: null,
            opened_at: { [Op.gte]: fromDate }
          }
        ]
      })
    }
    
    if (date_to) {
      const toDate = new Date(date_to)
      toDate.setHours(23, 59, 59, 999) // End of day
      dateConditions.push({
        [Op.or]: [
          { closed_at: { [Op.lte]: toDate } },
          { 
            closed_at: null,
            opened_at: { [Op.lte]: toDate }
          }
        ]
      })
    }
    
    if (dateConditions.length > 0) {
      where[Op.and] = dateConditions
    }
  }
  
  console.log('Shift report query:', JSON.stringify(where, null, 2))

  const shifts = await db.Shift.findAll({
    where,
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] }
    ],
    order: [['opened_at', 'DESC']]
  })
  
  console.log(`Found ${shifts.length} closed shifts for store_id=${store_id}, date_from=${date_from}, date_to=${date_to}`)

  // Tính bank_transfer_total và total_sales cho mỗi shift, và số lượng transaction
  const shiftsWithDetails = await Promise.all(shifts.map(async (shift) => {
    // Tính tổng doanh thu từ chuyển khoản
    const bankTransferTransactions = await db.Transaction.findAll({
      where: { 
        shift_id: shift.shift_id,
        status: 'completed'
      },
      include: [{ 
        model: db.Payment, 
        as: 'payment', 
        where: { 
          method: { [Op.in]: ['bank_transfer', 'qr'] },
          status: 'completed' 
        },
        required: true
      }]
    })
    const bankTransferTotal = bankTransferTransactions.reduce((acc, tr) => acc + parseFloat(tr.total_amount || 0), 0)
    
    // Đếm số lượng transaction
    const transactionCount = await db.Transaction.count({
      where: { 
        shift_id: shift.shift_id,
        status: 'completed'
      }
    })

    const cashSalesTotal = parseFloat(shift.cash_sales_total || 0)
    const totalSales = cashSalesTotal + bankTransferTotal

    const shiftData = shift.toJSON()
    shiftData.bank_transfer_total = bankTransferTotal
    shiftData.total_sales = totalSales
    shiftData.transaction_count = transactionCount

    return shiftData
  }))

  // Tính toán thống kê
  const stats = shiftsWithDetails.reduce((acc, shift) => {
    const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales_total || 0)
    const actualCash = parseFloat(shift.closing_cash || 0)
    const discrepancy = actualCash - expectedCash

    acc.total_shifts += 1
    acc.total_opening_cash += parseFloat(shift.opening_cash || 0)
    acc.total_cash_sales += parseFloat(shift.cash_sales_total || 0)
    acc.total_bank_transfer += parseFloat(shift.bank_transfer_total || 0)
    acc.total_sales += parseFloat(shift.total_sales || 0)
    acc.total_transactions += shift.transaction_count || 0
    acc.total_closing_cash += actualCash
    acc.total_discrepancy += discrepancy
    if (discrepancy !== 0) acc.shifts_with_discrepancy += 1

    return acc
  }, {
    total_shifts: 0,
    total_opening_cash: 0,
    total_cash_sales: 0,
    total_bank_transfer: 0,
    total_sales: 0,
    total_transactions: 0,
    total_closing_cash: 0,
    total_discrepancy: 0,
    shifts_with_discrepancy: 0
  })

  return {
    err: 0,
    data: {
      shifts: shiftsWithDetails,
      summary: {
        ...stats,
        average_discrepancy: stats.total_shifts > 0 ? stats.total_discrepancy / stats.total_shifts : 0,
        average_transactions_per_shift: stats.total_shifts > 0 ? stats.total_transactions / stats.total_shifts : 0
      }
    }
  }
}
