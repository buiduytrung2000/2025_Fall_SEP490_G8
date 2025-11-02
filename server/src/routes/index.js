import authRouter from './auth'
import userRouter from './user'
import categoryRouter from './category'
import supplierRouter from './supplier'
import productRouter from './product'

const initRoutes = (app) => {
    app.use('/api/v1/auth', authRouter)
    app.use('/api/v1/user', userRouter)
    app.use('/api/v1/category', categoryRouter)
    app.use('/api/v1/supplier', supplierRouter)
    app.use('/api/v1/product', productRouter)

    return app.use('/', (req, res) => {
        res.send('server on...')
    })
}

export default initRoutes