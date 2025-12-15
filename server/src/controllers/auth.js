import * as authService from '../services/auth'

export const register = async (req, res) => {
    const { username, password, role, phone, email, store_id } = req.body
    try {
        if (!username || !password || !role || !email) {
            return res.status(400).json({
                err: 1,
                msg: 'Thiếu thông tin bắt buộc! Vui lòng nhập đầy đủ tên người dùng, mật khẩu, vai trò và email.'
            })
        }

        // Validate role
        const validRoles = ['CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier']
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                err: 1,
                msg: `Vai trò không hợp lệ! Vai trò phải là một trong các giá trị: ${validRoles.join(', ')}`
            })
        }

        const response = await authService.registerService({ username, password, role, phone, email, store_id })
        return res.status(200).json(response)

    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi tại auth controller: ' + error.message
        })
    }
}
export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        if (!email || !password) {
            return res.status(400).json({
                err: 1,
                msg: 'Thiếu thông tin! Vui lòng nhập email và mật khẩu.'
            })
        }
        const response = await authService.loginService({ email, password })
        return res.status(200).json(response)

    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi tại auth controller: ' + error.message
        })
    }
}