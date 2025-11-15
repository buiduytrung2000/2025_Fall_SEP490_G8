import express from 'express'
import * as customerController from '../controllers/customer'
import verifyToken from '../middlewares/verifyToken'

const router = express.Router()

// All customer routes require authentication
router.use(verifyToken)

router.get('/', customerController.getAll)
router.get('/search', customerController.searchByPhone)
router.get('/:customer_id', customerController.getOne)
router.post('/', customerController.create)
router.put('/:customer_id', customerController.update)
router.put('/:customer_id/loyalty-points', customerController.updateLoyaltyPoints)
router.delete('/:customer_id', customerController.remove)

export default router

