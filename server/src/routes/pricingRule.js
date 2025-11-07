import express from 'express'
import * as pricingRuleController from '../controllers/pricingRule'
import verifyToken from '../middlewares/verifyToken'

const router = express.Router()

// All pricing rule routes require authentication
router.use(verifyToken)

router.get('/', pricingRuleController.getAll)
router.get('/product/:product_id/history', pricingRuleController.getProductPriceHistory)
router.get('/product/:product_id/store/:store_id/current', pricingRuleController.getCurrentPrice)
router.get('/:rule_id', pricingRuleController.getOne)
router.post('/', pricingRuleController.create)
router.put('/:rule_id', pricingRuleController.update)
router.delete('/:rule_id', pricingRuleController.remove)

export default router

