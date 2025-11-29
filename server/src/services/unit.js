import db from '../models'

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

