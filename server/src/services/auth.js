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

export const loginService = ({ email, password }) => new Promise(async (resolve, reject) => {
    try {
        const user = await db.User.findOne({
            where: { email },
            attributes: ['user_id', 'username', 'email', 'password', 'role', 'status']
        })

        if (!user) {
            resolve({
                err: 2,
                msg: 'Email not found!',
                token: null
            })
            return
        }

        // Check if user is active
        if (user.status !== 'active') {
            resolve({
                err: 2,
                msg: `Account is ${user.status}! Please contact administrator.`,
                token: null
            })
            return
        }

        // Verify password
        let isCorrectPassword = false
        if (typeof user.password === 'string' && user.password.startsWith('$2')) {
            // Hashed password
            isCorrectPassword = bcrypt.compareSync(password, user.password)
        } else {
            // Plain password (for demo purposes)
            isCorrectPassword = password === user.password
        }

        if (!isCorrectPassword) {
            resolve({
                err: 2,
                msg: 'Password is wrong!',
                token: null
            })
            return
        }

        const token = jwt.sign({
            user_id: user.user_id,
            username: user.username,
            role: user.role
        }, process.env.SECRET_KEY, { expiresIn: '2d' })

        resolve({
            err: 0,
            msg: 'Login is successfully!',
            token: token,
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
                email: user.email || null
            }
        })

    } catch (error) {
        reject(error)
    }
})