import * as unitService from '../services/unit'

// GET ALL UNITS
export const getAll = async (req, res) => {
    try {
        const response = await unitService.getAll()
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at unit controller: ' + error
        })
    }
}

// GET ONE UNIT
export const getOne = async (req, res) => {
    const { unit_id } = req.params
    try {
        if (!unit_id) return res.status(400).json({
            err: 1,
            msg: 'Missing unit_id'
        })
        const response = await unitService.getOne(unit_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at unit controller: ' + error
        })
    }
}

