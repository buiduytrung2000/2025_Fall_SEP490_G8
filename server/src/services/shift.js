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
    let selectedScheduleForLate = null // giữ lại schedule để tính đi muộn
    if (!foundScheduleId) {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      
      console.log('=== Check-in: Tự động tìm schedule ===');
      console.log('Cashier ID:', cashier_id, 'Store ID:', store_id, 'Today:', today);
      console.log('Giờ hiện tại:', now.toISOString(), '|', now.toLocaleString('vi-VN'));
      
      // Tìm tất cả schedules của ngày hôm nay
      const allSchedules = await db.Schedule.findAll({
        where: {
          user_id: cashier_id,
          store_id: store_id,
          work_date: today,
          status: 'confirmed'
        },
        include: [{
          model: db.ShiftTemplate,
          as: 'shiftTemplate',
          attributes: ['shift_template_id', 'start_time', 'end_time'],
          required: true
        }],
        transaction: t,
        raw: false
      })
      
      console.log(`Tìm thấy ${allSchedules.length} schedule(s) cho ngày hôm nay:`);
      allSchedules.forEach(s => {
        console.log(`  - Schedule ID: ${s.schedule_id}, Shift Template ID: ${s.shift_template_id}, Status: ${s.attendance_status}, Time: ${s.shiftTemplate?.start_time} - ${s.shiftTemplate?.end_time}`);
      });
      
      // Ưu tiên: ca chưa check-in > ca đang trong thời gian làm việc > ca đầu tiên
      let selectedSchedule = null
      
      // 1. Tìm ca chưa check-in (not_checked_in, null, '')
      const uncheckedSchedules = allSchedules.filter(s => 
        !s.attendance_status || 
        s.attendance_status === 'not_checked_in' || 
        s.attendance_status === '' ||
        s.attendance_status === 'not_check'
      )
      
      if (uncheckedSchedules.length > 0) {
        console.log(`Tìm thấy ${uncheckedSchedules.length} ca chưa check-in`);
        
        // Nếu có nhiều ca chưa check-in, ưu tiên ca đang trong thời gian làm việc
        let inTimeSchedule = null
        for (const s of uncheckedSchedules) {
          const shiftTemplate = s.shiftTemplate
          if (!shiftTemplate) continue
          
          const [startHour, startMinute] = shiftTemplate.start_time.split(':').map(Number)
          const [endHour, endMinute] = shiftTemplate.end_time.split(':').map(Number)
          
          const shiftStart = new Date(s.work_date)
          shiftStart.setHours(startHour, startMinute, 0, 0)
          
          const shiftEnd = new Date(s.work_date)
          shiftEnd.setHours(endHour, endMinute, 0, 0)
          
          // Xử lý ca qua đêm
          if (shiftEnd < shiftStart) {
            shiftEnd.setDate(shiftEnd.getDate() + 1)
          }
          
          // Kiểm tra có đang trong ca không
          if (now >= shiftStart && now <= shiftEnd) {
            inTimeSchedule = s
            console.log(`  → Ca đang trong thời gian làm việc: Schedule ID ${s.schedule_id} (${shiftTemplate.start_time} - ${shiftTemplate.end_time})`);
            break
          }
        }
        
        selectedSchedule = inTimeSchedule || uncheckedSchedules[0]
        console.log(`Chọn schedule: ${selectedSchedule.schedule_id} (Shift Template: ${selectedSchedule.shift_template_id})`);
      } else {
        // Không có ca chưa check-in, lấy ca đầu tiên
        selectedSchedule = allSchedules[0]
        if (selectedSchedule) {
          console.log(`Không có ca chưa check-in, chọn ca đầu tiên: ${selectedSchedule.schedule_id}`);
        }
      }
      
      if (selectedSchedule) {
        foundScheduleId = selectedSchedule.schedule_id
        console.log(`→ Final schedule_id: ${foundScheduleId}\n`);
        // giữ lại để tính phút đi muộn sau này
        selectedScheduleForLate = selectedSchedule
      }
    } else {
      console.log('=== Check-in: Sử dụng schedule_id từ request ===');
      console.log('Schedule ID:', schedule_id);
    }

    // Bắt buộc phải có schedule để check-in
    if (!foundScheduleId) {
      await t.rollback()
      return { err: 1, msg: 'Bạn không có lịch làm việc hôm nay. Vui lòng liên hệ quản lý để được phân công lịch.' }
    }

    // Lấy thông tin schedule + shift template để tính phút đi muộn
    let scheduleForLate = selectedScheduleForLate
    if (!scheduleForLate) {
      scheduleForLate = await db.Schedule.findOne({
        where: { schedule_id: foundScheduleId },
        include: [
          {
            model: db.ShiftTemplate,
            as: 'shiftTemplate',
            attributes: ['start_time', 'end_time']
          }
        ],
        transaction: t,
        lock: t.LOCK.UPDATE
      })
    }

    // Tính phút đi muộn (nếu có)
    // Thời gian hợp lệ check-in là ±5 phút từ thời gian bắt đầu ca
    // Chỉ coi là muộn nếu check-in sau thời gian bắt đầu ca hơn 5 phút
    let lateMinutes = 0
    if (scheduleForLate && scheduleForLate.shiftTemplate && scheduleForLate.work_date) {
      const [startHour, startMinute] = scheduleForLate.shiftTemplate.start_time.split(':').map(Number)
      const shiftStart = new Date(scheduleForLate.work_date)
      shiftStart.setHours(startHour, startMinute, 0, 0)
      const now = new Date()
      // Cho phép check-in sớm 5 phút hoặc muộn 5 phút (tổng cộng 10 phút window)
      const validStartTime = new Date(shiftStart)
      validStartTime.setMinutes(validStartTime.getMinutes() - 5) // Cho phép sớm 5 phút
      const validEndTime = new Date(shiftStart)
      validEndTime.setMinutes(validEndTime.getMinutes() + 5) // Cho phép muộn 5 phút
      
      // Chỉ tính là muộn nếu check-in sau thời gian hợp lệ (sau shiftStart + 5 phút)
      if (now > validEndTime) {
        lateMinutes = Math.floor((now - validEndTime) / 60000)
      }
    }

    // Nếu check-in muộn (sau thời gian hợp lệ), bắt buộc phải có note
    if (lateMinutes > 0 && (!note || !note.trim())) {
      await t.rollback()
      return { err: 1, msg: 'Bạn đang check-in muộn. Vui lòng nhập lý do vào phần ghi chú.' }
    }

    // lateMinutes đã được tính từ sau thời gian hợp lệ (shiftStart + 5 phút)
    // Lưu late_minutes vào DB và note (lý do) riêng biệt
    // Note chỉ lưu lý do do người dùng nhập, không lưu thông tin "Đi muộn X phút"
    const shift = await db.Shift.create({ 
      cashier_id, 
      store_id,
      schedule_id: foundScheduleId,
      opening_cash, 
      status: 'opened', 
      note: note && note.trim() ? note.trim() : null,
      late_minutes: lateMinutes > 0 ? lateMinutes : null
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

    // Tính phút kết ca sớm (nếu có) dựa trên schedule + shift template
    // Thời gian hợp lệ checkout là ±5 phút quanh thời gian kết thúc ca
    // Chỉ coi là kết ca sớm nếu checkout TRƯỚC (end_time - 5 phút)
    let earlyMinutes = 0
    try {
      if (shift.schedule_id) {
        const schedule = await db.Schedule.findOne({
          where: { schedule_id: shift.schedule_id },
          include: [
            {
              model: db.ShiftTemplate,
              as: 'shiftTemplate',
              attributes: ['start_time', 'end_time']
            }
          ],
          transaction: t,
          lock: t.LOCK.UPDATE
        })

        if (schedule && schedule.shiftTemplate && schedule.work_date) {
          const [endHour, endMinute] = schedule.shiftTemplate.end_time.split(':').map(Number)
          const shiftEnd = new Date(schedule.work_date)
          shiftEnd.setHours(endHour, endMinute, 0, 0)

          // Xử lý ca qua đêm: nếu end < start thì +1 ngày cho end
          if (schedule.shiftTemplate.start_time) {
            const [startHour, startMinute] = schedule.shiftTemplate.start_time.split(':').map(Number)
            const shiftStart = new Date(schedule.work_date)
            shiftStart.setHours(startHour, startMinute, 0, 0)
            if (shiftEnd < shiftStart) {
              shiftEnd.setDate(shiftEnd.getDate() + 1)
            }
          }

          const now = new Date()
          // Cho phép checkout sớm 5 phút hoặc muộn 5 phút quanh thời gian kết ca
          const validEarlyTime = new Date(shiftEnd)
          validEarlyTime.setMinutes(validEarlyTime.getMinutes() - 5) // sớm tối đa 5 phút vẫn xem là hợp lệ
          // const validLateTime = new Date(shiftEnd)
          // validLateTime.setMinutes(validLateTime.getMinutes() + 5) // nếu muốn xử lý checkout muộn

          // Chỉ tính là kết ca sớm nếu checkout trước thời gian hợp lệ
          if (now < validEarlyTime) {
            earlyMinutes = Math.floor((validEarlyTime - now) / 60000)
          }
        }
      }
    } catch (timeErr) {
      console.error('Lỗi khi tính earlyMinutes cho checkout:', timeErr)
    }

    // Nếu kết ca sớm (trước thời gian hợp lệ), bắt buộc phải có note
    if (earlyMinutes > 0 && (!note || !note.trim())) {
      await t.rollback()
      return { err: 1, msg: 'Bạn đang kết ca sớm. Vui lòng nhập lý do vào phần ghi chú.' }
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

    // Giữ nguyên note cũ nếu note mới là null/rỗng, chỉ cập nhật nếu có note mới
    const updateData = {
      status: 'closed',
      closed_at: new Date(),
      closing_cash: closing_cash,
      cash_sales_total: sumCash, // Cập nhật lại để đảm bảo chính xác
      early_minutes: earlyMinutes > 0 ? earlyMinutes : null
    }
    
    // Chỉ cập nhật note nếu có note mới (không null và không rỗng)
    // Nếu không có note mới, giữ nguyên note cũ (lý do muộn khi check-in)
    if (note && note.trim()) {
      // Nếu có note cũ, merge với note mới
      const existingNote = shift.note ? shift.note.trim() : ''
      if (existingNote) {
        updateData.note = `${existingNote} | ${note.trim()}`
      } else {
        updateData.note = note.trim()
      }
    }
    // Nếu note mới là null/rỗng, không cập nhật note (giữ nguyên note cũ)
    
    await shift.update(updateData, { transaction: t })

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
  
  const shifts = await db.Shift.findAll({
    where,
    include: [
      { model: db.Store, as: 'store', attributes: ['store_id', 'name'] },
      { model: db.User, as: 'cashier', attributes: ['user_id', 'username'] }
    ],
    order: [['opened_at', 'DESC']]
  })
  
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

