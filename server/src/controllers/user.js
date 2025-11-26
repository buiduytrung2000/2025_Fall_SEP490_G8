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
            msg: 'Failed at user controller: ' + error
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
            msg: 'Failed to fetch users: ' + error
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
                msg: 'User ID is required.'
            })
        }

        const response = await services.getUserById(id)
        return res.status(response.err ? 404 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed to get user: ' + error
        })
    }
}

// CREATE NEW USER
export const createUser = async (req, res) => {
    try {
        const { username, password, email, role, full_name, phone, address, store_id, status, is_active } = req.body

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                err: 1,
                msg: 'Username and password are required.'
            })
        }

        if (!role) {
            return res.status(400).json({
                err: 1,
                msg: 'Role is required.'
            })
        }

        const userData = {
            username,
            password,
            email: email || null,
            role,
            full_name: full_name || null,
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
            msg: 'Failed to create user: ' + error
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
                msg: 'User ID is required.'
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
            msg: 'Failed to update user: ' + error
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
                msg: 'User ID is required.'
            })
        }

        // Prevent user from deleting their own account
        if (req.user.user_id == id) {
            return res.status(403).json({
                err: 1,
                msg: 'You cannot deactivate your own account.'
            })
        }

        const response = await services.deleteUser(id)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed to delete user: ' + error
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
                msg: 'User ID is required.'
            })
        }

        const response = await services.reactivateUser(id)
        return res.status(response.err ? 400 : 200).json(response)
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed to reactivate user: ' + error
        })
    }
}