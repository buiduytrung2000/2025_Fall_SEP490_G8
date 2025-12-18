import db from '../models'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const hashPassword = password => bcrypt.hashSync(password, bcrypt.genSaltSync(12))

export const registerService = ({ username, password, role, email, store_id }) => new Promise(async (resolve, reject) => {
    try {
        // Check if username already exists
        const existingUsername = await db.User.findOne({
            where: { username }
        })

        if (existingUsername) {
            resolve({
                err: 2,
                msg: 'Username has been already used!',
                token: null
            })
            return
        }

        // Check if email already exists (required for login)
        if (email) {
            const existingEmail = await db.User.findOne({
                where: { email }
            })

            if (existingEmail) {
                resolve({
                    err: 2,
                    msg: 'Email has been already used!',
                    token: null
                })
                return
            }
        }

        // Create new user with only fields that exist in database
        const userData = {
            username,
            password: hashPassword(password),
            role,
            email, // Email is now required
            status: 'active'
        }

        // Add optional fields only if provided
        if (store_id) userData.store_id = store_id

        const newUser = await db.User.create(userData)

        const token = jwt.sign({
            user_id: newUser.user_id,
            username: newUser.username,
            role: newUser.role
        }, process.env.SECRET_KEY, { expiresIn: '2d' })

        resolve({
            err: 0,
            msg: 'Register is successfully!',
            token: token,
            user: {
                user_id: newUser.user_id,
                username: newUser.username,
                role: newUser.role,
                email: newUser.email || null
            }
        })

    } catch (error) {
        reject(error)
    }
})


export const loginService = async ({ email, password }) => {
    try {
        const user = await db.User.findOne({
            where: { email },
            raw: true
        })

        if (!user) {
            return {
                err: 1,
                // Thông báo tiếng Việt khi email không tồn tại
                msg: 'Email không tồn tại trong hệ thống!'
            }
        }

        // Validate password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return {
                err: 1,
                // Thông báo tiếng Việt khi mật khẩu không đúng
                msg: 'Mật khẩu không chính xác!'
            }
        }

        if (user.status !== 'active') {
            return {
                err: 1,
                // Thông báo tiếng Việt khi tài khoản bị khóa / không hoạt động
                msg: 'Tài khoản của bạn đang không hoạt động. Vui lòng liên hệ quản lý!'
            }
        }

        // Generate token with role included
        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                store_id: user.store_id
            },
            process.env.SECRET_KEY,
            { expiresIn: '30d' } 
        )

        return {
            err: 0,
            // Thông báo tiếng Việt khi đăng nhập thành công
            msg: 'Đăng nhập thành công!',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                store_id: user.store_id,
                status: user.status
            }
        }
    } catch (error) {
        throw error
    }
}
