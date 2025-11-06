import authRouter from './auth'
import userRouter from './user'
import categoryRouter from './category'
import supplierRouter from './supplier'
import productRouter from './product'

import scheduleRouter from './schedule'

import employeeRouter from './employee'

const initRoutes = (app) => {
    app.use('/api/v1/auth', authRouter)
    app.use('/api/v1/user', userRouter)
    app.use('/api/v1/category', categoryRouter)
    app.use('/api/v1/supplier', supplierRouter)
    app.use('/api/v1/product', productRouter)

    app.use('/api/v1/schedule', scheduleRouter)

    app.use('/api/v1/employee', employeeRouter)

    return app.use('/', (req, res) => {
        res.send('server on...')
    })
}

export default initRoutes