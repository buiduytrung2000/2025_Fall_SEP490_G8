import authRouter from './auth'
import userRouter from './user'
import categoryRouter from './category'
import supplierRouter from './supplier'
import productRouter from './product'
import pricingRuleRouter from './pricingRule'

import scheduleRouter from './schedule'

import employeeRouter from './employee'
import inventoryRouter from './inventory'
import storeOrderRouter from './storeOrder'
import customerRouter from './customer'
import customerVoucherRouter from './customerVoucher'
import voucherTemplateRouter from './voucherTemplate'
import paymentRouter from './payment'

const initRoutes = (app) => {
    app.use('/api/v1/auth', authRouter)
    app.use('/api/v1/user', userRouter)
    app.use('/api/v1/category', categoryRouter)
    app.use('/api/v1/supplier', supplierRouter)
    app.use('/api/v1/product', productRouter)
    app.use('/api/v1/pricing-rule', pricingRuleRouter)

    app.use('/api/v1/schedule', scheduleRouter)

    app.use('/api/v1/employee', employeeRouter)
    app.use('/api/v1/inventory', inventoryRouter)
    app.use('/api/v1/store-order', storeOrderRouter)
    app.use('/api/v1/customer', customerRouter)
    app.use('/api/v1/voucher', customerVoucherRouter)
    app.use('/api/v1/voucher-template', voucherTemplateRouter)
    app.use('/api/v1/payment', paymentRouter)

    app.get('/', (req, res) => {
        res.status(200).json({
            message: 'Server is running...',
            status: 'OK',
            timestamp: new Date().toISOString()
        })
    })

    app.use('*', (req, res) => {
        res.status(404).json({
            err: 1,
            msg: 'Route not found',
            path: req.originalUrl
        })
    })

}

export default initRoutes