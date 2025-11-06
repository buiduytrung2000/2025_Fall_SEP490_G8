import * as authService from '../services/auth'

export const register = async (req, res) => {
    const { username, password, role, phone, email, store_id } = req.body
    try {
        if (!username || !password || !role || !email) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs! Username, password, role, and email are required.'
            })
        }

        // Validate role
        const validRoles = ['CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier']
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                err: 1,
                msg: `Invalid role! Role must be one of: ${validRoles.join(', ')}`
            })
        }

        const response = await authService.registerService({ username, password, role, phone, email, store_id })
        return res.status(200).json(response)

    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at auth controller: ' + error.message
        })
    }
}
export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        if (!email || !password) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing inputs! Email and password are required.'
            })
        }
        const response = await authService.loginService({ email, password })
        return res.status(200).json(response)

    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Fail at auth controller: ' + error.message
        })
    }
}