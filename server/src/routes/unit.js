import express from 'express'
import * as unitController from '../controllers/unit'

const router = express.Router()

router.get('/', unitController.getAll)
router.get('/:unit_id', unitController.getOne)
router.post('/', unitController.create)
router.put('/:unit_id', unitController.update)
router.delete('/:unit_id', unitController.remove)

export default router

