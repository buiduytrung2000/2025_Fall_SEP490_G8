import express from 'express'
import * as unitController from '../controllers/unit'

const router = express.Router()

router.get('/', unitController.getAll)
router.get('/:unit_id', unitController.getOne)

export default router

