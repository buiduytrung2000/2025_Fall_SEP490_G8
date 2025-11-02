import express from 'express'
import * as categoryController from '../controllers/category'

const router = express.Router()

router.get('/', categoryController.getAll)
router.get('/:category_id', categoryController.getOne)
router.post('/', categoryController.create)
router.put('/:category_id', categoryController.update)
router.delete('/:category_id', categoryController.remove)

export default router

