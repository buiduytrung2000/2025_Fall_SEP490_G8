import * as services from '../services/user'

// GET CURRENT USER
export const getCurrent = async (req, res) => {
    const { user_id } = req.user
    try {
        const response = await services.getOne(user_id)
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi tại user controller: ' + error
        })
    }
}

// GET ALL USERS (Admin only)
export const listUsers = async (req, res) => {
    try {
        const response = await services.getAllUsers()
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi tải danh sách người dùng: ' + error
        })
    }
}

// GET USER BY ID
export const getUser = async (req, res) => {
    const { id } = req.params
    try {
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'ID người dùng là bắt buộc.'
            })
        }

        const response = await services.getUserById(id)
        return res.status(response.err ? 404 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi lấy thông tin người dùng: ' + error
        })
    }
}

// CREATE NEW USER
export const createUser = async (req, res) => {
    try {
        const { username, password, email, role, full_name, phone, address, store_id, status, is_active } = req.body

        // Validation
        if (!email || !email.trim()) {
            return res.status(400).json({
                err: 1,
                msg: 'Email là bắt buộc.'
            })
        }

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({
                err: 1,
                msg: 'Họ tên là bắt buộc.'
            })
        }

        if (!password) {
            return res.status(400).json({
                err: 1,
                msg: 'Mật khẩu là bắt buộc.'
            })
        }

        if (!role) {
            return res.status(400).json({
                err: 1,
                msg: 'Vai trò là bắt buộc.'
            })
        }

        // Auto-generate username from email if not provided
        const generatedUsername = username || email.split('@')[0];

        const userData = {
            username: generatedUsername,
            password,
            email: email.trim(),
            role,
            full_name: full_name.trim(),
            phone: phone || null,
            address: address || null,
            store_id: store_id || null,
            status: status || 'active',
            is_active: is_active !== false
        }

        const response = await services.createUser(userData)
        return res.status(response.err ? 400 : 201).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi tạo người dùng: ' + error
        })
    }
}

// UPDATE USER
export const updateUser = async (req, res) => {
    const { id } = req.params
    try {
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'ID người dùng là bắt buộc.'
            })
        }

        const updateData = req.body

        // Remove sensitive fields that shouldn't be directly updated
        delete updateData.user_id
        delete updateData.created_at

        const response = await services.updateUser(id, updateData)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi cập nhật người dùng: ' + error
        })
    }
}

// DELETE USER (Soft delete - mark as inactive)
export const deleteUser = async (req, res) => {
    const { id } = req.params
    try {
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'ID người dùng là bắt buộc.'
            })
        }

        // Prevent user from deleting their own account
        if (req.user.user_id == id) {
            return res.status(403).json({
                err: 1,
                msg: 'Bạn không thể vô hiệu hóa tài khoản của chính mình.'
            })
        }

        const response = await services.deleteUser(id)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi xóa người dùng: ' + error
        })
    }
}

// REACTIVATE USER
export const reactivateUser = async (req, res) => {
    const { id } = req.params
    try {
        if (!id) {
            return res.status(400).json({
                err: 1,
                msg: 'ID người dùng là bắt buộc.'
            })
        }

        const response = await services.reactivateUser(id)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi kích hoạt lại người dùng: ' + error
        })
    }
}

// UPDATE PROFILE (current user)
export const updateProfile = async (req, res) => {
    const { user_id } = req.user
    const { full_name, phone } = req.body
    try {
        const response = await services.updateProfile(user_id, { full_name, phone })
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi cập nhật hồ sơ: ' + error
        })
    }
}

// CHANGE PASSWORD (current user)
export const changePassword = async (req, res) => {
    const { user_id } = req.user
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) {
        return res.status(400).json({
            err: 1,
            msg: 'Vui lòng cung cấp đầy đủ mật khẩu hiện tại và mật khẩu mới.'
        })
    }

    if (new_password.length < 6) {
        return res.status(400).json({
            err: 1,
            msg: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
        })
    }

    try {
        const response = await services.changePassword(user_id, current_password, new_password)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Lỗi khi đổi mật khẩu: ' + error
        })
    }
}