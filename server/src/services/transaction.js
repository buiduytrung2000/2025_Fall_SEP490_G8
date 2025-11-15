import db from '../models'

export const checkout = (payload, options = {}) => new Promise(async (resolve, reject) => {
    const t = await db.sequelize.transaction()
    try {
        const { store_id, customer_id = null, payment = {}, items = [], created_by = null } = payload

        if (!store_id) {
            await t.rollback()
            return resolve({ err: 1, msg: 'Missing store_id' })
        }

        if (!Array.isArray(items) || items.length === 0) {
            await t.rollback()
            return resolve({ err: 1, msg: 'No items provided' })
        }

        // Calculate totals and validate stock
        let totalAmount = 0
        for (const it of items) {
            if (!it.product_id || !it.quantity || !it.unit_price) {
                await t.rollback()
                return resolve({ err: 1, msg: 'Each item must have product_id, quantity and unit_price' })
            }
            const qty = Number(it.quantity)
            const unit = parseFloat(it.unit_price)
            if (qty <= 0 || unit < 0) {
                await t.rollback()
                return resolve({ err: 1, msg: 'Invalid item quantity or unit_price' })
            }
            totalAmount += qty * unit

            // check inventory
            const inv = await db.Inventory.findOne({ where: { store_id, product_id: it.product_id }, transaction: t, lock: t.LOCK.UPDATE })
            if (!inv) {
                await t.rollback()
                return resolve({ err: 1, msg: `Product ${it.product_id} not available in store ${store_id}` })
            }
            if (inv.stock < qty) {
                await t.rollback()
                return resolve({ err: 1, msg: `Insufficient stock for product ${it.product_id}` })
            }
        }

        // Create payment
        const paymentData = {
            method: payment.method || 'cash',
            amount: payment.amount != null ? payment.amount : totalAmount,
            status: payment.status || 'completed',
            paid_at: payment.paid_at || new Date(),
            given_amount: payment.given_amount || null,
            change_amount: payment.change_amount || null,
            reference: payment.reference || null
        }
        const paymentRecord = await db.Payment.create(paymentData, { transaction: t })

        // Optional: validate and attach shift if provided
        let shiftId = payload.shift_id || null
        let shift = null
        if (shiftId) {
            shift = await db.Shift.findOne({ where: { shift_id: shiftId, store_id, status: 'opened' }, transaction: t, lock: t.LOCK.UPDATE })
            if (!shift) {
                await t.rollback()
                return resolve({ err: 1, msg: 'Shift không hợp lệ hoặc đã đóng' })
            }
        }

        // Create transaction
        const transactionRecord = await db.Transaction.create({
            order_id: null,
            customer_id,
            payment_id: paymentRecord.payment_id,
            store_id,
            shift_id: shiftId,
            total_amount: totalAmount,
            status: 'completed'
        }, { transaction: t })

        // Create items and decrement inventory
        for (const it of items) {
            const qty = Number(it.quantity)
            const unit = parseFloat(it.unit_price)
            const subtotal = qty * unit

            await db.TransactionItem.create({
                transaction_id: transactionRecord.transaction_id,
                product_id: it.product_id,
                quantity: qty,
                unit_price: unit,
                subtotal
            }, { transaction: t })

            // decrement inventory (update explicitly)
            const inv = await db.Inventory.findOne({ where: { store_id, product_id: it.product_id }, transaction: t, lock: t.LOCK.UPDATE })
            await inv.update({ stock: inv.stock - qty }, { transaction: t })
        }

        // Nếu có shift và thanh toán bằng tiền mặt thành công, cập nhật cash_sales_total
        if (shift && paymentData.method === 'cash' && paymentData.status === 'completed') {
            const cashAmount = parseFloat(paymentData.amount || 0)
            await shift.update({ 
                cash_sales_total: parseFloat(shift.cash_sales_total || 0) + cashAmount 
            }, { transaction: t })
        }

        await t.commit()

        // return created transaction with payment and items
        const result = await db.Transaction.findOne({
            where: { transaction_id: transactionRecord.transaction_id },
            include: [
                { model: db.TransactionItem, as: 'transactionItems' },
                { model: db.Payment, as: 'payment' }
            ]
        })

        resolve({ err: 0, msg: 'Checkout successful', data: result })
    } catch (error) {
        await t.rollback()
        reject(error)
    }
})
