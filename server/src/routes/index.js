import authRouter from './auth'

import userRouter from './user'

import scheduleRouter from './schedule'

import employeeRouter from './employee'

const initRoutes = (app) => {
    app.use('/api/v1/auth', authRouter)

    app.use('/api/v1/user', userRouter)

    app.use('/api/v1/schedule', scheduleRouter)

    app.use('/api/v1/employee', employeeRouter)

    return app.use('/', (req, res) => {
        res.send('server on...')

    })
}

export default initRoutes