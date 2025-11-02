import authRouter from './auth'

import userRouter from './user'

import scheduleRouter from './schedule'

const initRoutes = (app) => {
    app.use('/api/v1/auth', authRouter)

    app.use('/api/v1/user', userRouter)

    app.use('/api/v1/schedule', scheduleRouter)

    return app.use('/', (req, res) => {
        res.send('server on...')

    })
}

export default initRoutes