import db from '../models'
import { Op } from 'sequelize'

// GET ALL UNITS
export const getAll = async () => {
    try {
        const units = await db.Unit.findAll({
            order: [['level', 'ASC'], ['name', 'ASC']]
        })
        return {
            err: 0,
            msg: 'Get all units successfully',
            data: units
        }
    } catch (error) {
        throw error
    }
}

// GET ONE UNIT
export const getOne = async (unitId) => {
    try {
        const unit = await db.Unit.findByPk(unitId)
        if (!unit) {
            return {
                err: 1,
                msg: 'Unit not found',
                data: null
            }
        }
        return {
            err: 0,
            msg: 'Get unit successfully',
            data: unit
        }
    } catch (error) {
        throw error
    }
}

// CREATE UNIT
export const create = async ({ name, symbol, level }) => {
    if (!name || !symbol || level == null) {
        return {
            err: 1,
            msg: 'Thiếu thông tin đơn vị (name, symbol, level)',
            data: null
        }
    }

    const trimmedName = name.trim()
    const trimmedSymbol = symbol.trim()

    if (!trimmedName || !trimmedSymbol) {
        return {
            err: 1,
            msg: 'Tên và ký hiệu đơn vị không được để trống',
            data: null
        }
    }

    const existing = await db.Unit.findOne({
        where: {
            [Op.or]: [
                { name: trimmedName },
                { symbol: trimmedSymbol }
            ]
        }
    })

    if (existing) {
        return {
            err: 1,
            msg: 'Đơn vị với tên hoặc ký hiệu này đã tồn tại',
            data: null
        }
    }

    const unit = await db.Unit.create({
        name: trimmedName,
        symbol: trimmedSymbol,
        level
    })

    return {
        err: 0,
        msg: 'Tạo đơn vị thành công',
        data: unit
    }
}

// UPDATE UNIT
export const update = async (unitId, payload) => {
    if (!unitId) {
        return { err: 1, msg: 'Missing unit_id', data: null }
    }

    const unit = await db.Unit.findByPk(unitId)
    if (!unit) {
        return { err: 1, msg: 'Đơn vị không tồn tại', data: null }
    }

    const updates = {}
    if (payload.name != null) updates.name = payload.name.trim()
    if (payload.symbol != null) updates.symbol = payload.symbol.trim()
    if (payload.level != null) updates.level = payload.level

    if (updates.name || updates.symbol) {
        const conflict = await db.Unit.findOne({
            where: {
                [Op.and]: [
                    { unit_id: { [Op.ne]: unitId } },
                    {
                        [Op.or]: [
                            updates.name ? { name: updates.name } : null,
                            updates.symbol ? { symbol: updates.symbol } : null
                        ].filter(Boolean)
                    }
                ]
            }
        })
        if (conflict) {
            return {
                err: 1,
                msg: 'Tên hoặc ký hiệu đơn vị đã được sử dụng',
                data: null
            }
        }
    }

    await unit.update(updates)

    return {
        err: 0,
        msg: 'Cập nhật đơn vị thành công',
        data: unit
    }
}

// DELETE UNIT
export const remove = async (unitId) => {
    if (!unitId) {
        return { err: 1, msg: 'Missing unit_id', data: null }
    }

    const unit = await db.Unit.findByPk(unitId)
    if (!unit) {
        return { err: 1, msg: 'Đơn vị không tồn tại', data: null }
    }

    // Không cho xóa nếu đang được sử dụng ở sản phẩm, ProductUnit hoặc StoreOrderItem
    const [productCount, productUnitCount, storeOrderItemCount] = await Promise.all([
        db.Product.count({ where: { base_unit_id: unitId } }),
        db.ProductUnit.count({ where: { unit_id: unitId } }),
        db.StoreOrderItem.count({
            where: {
                [Op.or]: [
                    { unit_id: unitId },
                    { package_unit_id: unitId }
                ]
            }
        })
    ])

    if (productCount > 0 || productUnitCount > 0 || storeOrderItemCount > 0) {
        return {
            err: 1,
            msg: 'Không thể xóa đơn vị vì đang được sử dụng trong sản phẩm hoặc đơn hàng',
            data: null
        }
    }

    await unit.destroy()

    return {
        err: 0,
        msg: 'Xóa đơn vị thành công',
        data: null
    }
}

