import db from '../models'
import bcrypt from 'bcryptjs'

// GET CURRENT USER
export const getOne = (id) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.User.findOne({
            where: { user_id: id },
            raw: true,
            attributes: {
                exclude: ['password']
            }
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'Failed to get user.',
            response
        })
    } catch (error) {
        reject(error)
    }
})

// GET ALL USERS (Admin only)
export const getAllUsers = () => new Promise(async (resolve, reject) => {
    try {
        const response = await db.User.findAll({
            raw: true,
            attributes: {
                exclude: ['password']
            },
            order: [['created_at', 'DESC']]
        })
        resolve({
            err: 0,
            msg: 'OK',
            response
        })
    } catch (error) {
        reject(error)
    }
})

// GET USER BY ID
export const getUserById = (userId) => new Promise(async (resolve, reject) => {
    try {
        const response = await db.User.findOne({
            where: { user_id: userId },
            raw: true,
            attributes: {
                exclude: ['password']
            }
        })
        resolve({
            err: response ? 0 : 1,
            msg: response ? 'OK' : 'User not found.',
            response
        })
    } catch (error) {
        reject(error)
    }
})

// CREATE NEW USER
export const createUser = (userData) => new Promise(async (resolve, reject) => {
    try {
        // Check if username already exists
        const existingUser = await db.User.findOne({
            where: { username: userData.username }
        })
        if (existingUser) {
            return resolve({
                err: 1,
                msg: 'Username already exists.'
            })
        }

        // Check if email already exists
        if (userData.email) {
            const existingEmail = await db.User.findOne({
                where: { email: userData.email }
            })
            if (existingEmail) {
                return resolve({
                    err: 1,
                    msg: 'Email already exists.'
                })
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10)

        const newUser = await db.User.create({
            username: userData.username,
            password: hashedPassword,
            email: userData.email || null,
            phone: userData.phone || null,
            address: userData.address || null,
            full_name: userData.full_name || null,
            role: userData.role || 'Cashier',
            store_id: userData.store_id || null,
            status: userData.status || 'active',
            is_active: userData.is_active !== false
        })

        const userResponse = {
            user_id: newUser.user_id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            full_name: newUser.full_name,
            is_active: newUser.is_active,
            status: newUser.status,
            created_at: newUser.created_at
        }

        resolve({
            err: 0,
            msg: 'User created successfully.',
            response: userResponse
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE USER
export const updateUser = (userId, updateData) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({
            where: { user_id: userId }
        })

        if (!user) {
            return resolve({
                err: 1,
                msg: 'User not found.'
            })
        }

        // Check for duplicate username if updating
        if (updateData.username && updateData.username !== user.username) {
            const existingUser = await db.User.findOne({
                where: { username: updateData.username }
            })
            if (existingUser) {
                return resolve({
                    err: 1,
                    msg: 'Username already exists.'
                })
            }
        }

        // Check for duplicate email if updating
        if (updateData.email && updateData.email !== user.email) {
            const existingEmail = await db.User.findOne({
                where: { email: updateData.email }
            })
            if (existingEmail) {
                return resolve({
                    err: 1,
                    msg: 'Email already exists.'
                })
            }
        }

        // Hash password if provided
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10)
        }

        await user.update(updateData)

        const userResponse = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            is_active: user.is_active,
            status: user.status,
            updated_at: user.updated_at
        }

        resolve({
            err: 0,
            msg: 'User updated successfully.',
            response: userResponse
        })
    } catch (error) {
        reject(error)
    }
})

// SOFT DELETE USER (mark as inactive)
export const deleteUser = (userId) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({
            where: { user_id: userId }
        })

        if (!user) {
            return resolve({
                err: 1,
                msg: 'User not found.'
            })
        }

        // Soft delete - mark as inactive
        await user.update({
            is_active: false,
            status: 'inactive'
        })

        resolve({
            err: 0,
            msg: 'User deactivated successfully.'
        })
    } catch (error) {
        reject(error)
    }
})

// REACTIVATE USER
export const reactivateUser = (userId) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({
            where: { user_id: userId }
        })

        if (!user) {
            return resolve({
                err: 1,
                msg: 'User not found.'
            })
        }

        await user.update({
            is_active: true,
            status: 'active'
        })

        resolve({
            err: 0,
            msg: 'User reactivated successfully.'
        })
    } catch (error) {
        reject(error)
    }
})

// UPDATE PROFILE FOR CURRENT USER
export const updateProfile = (userId, data = {}) => new Promise(async (resolve, reject) => {
    try {
        const allowedFields = ['full_name', 'phone'];
        const updates = {};
        allowedFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                updates[field] = data[field];
            }
        });

        if (!Object.keys(updates).length) {
            return resolve({
                err: 1,
                msg: 'Không có dữ liệu hợp lệ để cập nhật.'
            });
        }

        const [updated] = await db.User.update(updates, {
            where: { user_id: userId }
        });

        if (!updated) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy người dùng.'
            });
        }

        const freshUser = await db.User.findOne({
            where: { user_id: userId },
            attributes: ['user_id', 'full_name', 'phone', 'email', 'role', 'store_id', 'status'],
            raw: true
        });

        resolve({
            err: 0,
            msg: 'Cập nhật hồ sơ thành công.',
            data: freshUser
        });
    } catch (error) {
        reject(error);
    }
});

// CHANGE PASSWORD FOR CURRENT USER
export const changePassword = (userId, currentPassword, newPassword) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({ where: { user_id: userId } });
        if (!user) {
            return resolve({
                err: 1,
                msg: 'Không tìm thấy người dùng.'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return resolve({
                err: 1,
                msg: 'Mật khẩu hiện tại không chính xác.'
            });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashed });

        resolve({
            err: 0,
            msg: 'Đổi mật khẩu thành công.'
        });
    } catch (error) {
        reject(error);
    }
});