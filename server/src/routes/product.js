import express from 'express'
import * as productController from '../controllers/product'

const router = express.Router()

router.get('/', productController.getAll)
router.get('/for-pricing', productController.getForPriceManagement)
router.get('/by-store/:store_id', productController.getByStore)
router.get('/:product_id', productController.getOne)
router.post('/', productController.create)
router.put('/:product_id', productController.update)
router.delete('/:product_id', productController.remove)
router.patch('/:product_id/toggle', productController.toggleStatus)
router.patch('/:product_id/restore', productController.restore)
router.delete('/:product_id/hard-delete', productController.hardDelete)

export default router

