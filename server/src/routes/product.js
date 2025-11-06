import express from 'express'
import * as productController from '../controllers/product'

const router = express.Router()

router.get('/', productController.getAll)
router.get('/:product_id', productController.getOne)
router.post('/', productController.create)
router.put('/:product_id', productController.update)
router.delete('/:product_id', productController.remove)

export default router

