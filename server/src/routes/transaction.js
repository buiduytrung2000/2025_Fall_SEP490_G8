import express from 'express'
import * as transactionController from '../controllers/transaction'
import verifyToken from '../middlewares/verifyToken'

const router = express.Router()

// checkout (create transaction + payment + items)
router.post('/checkout', verifyToken, transactionController.checkout)

export default router
