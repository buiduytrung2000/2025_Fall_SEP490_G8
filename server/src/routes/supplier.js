import express from 'express'
import * as supplierController from '../controllers/supplier'

const router = express.Router()

router.get('/', supplierController.getAll)
router.get('/:supplier_id', supplierController.getOne)
router.post('/', supplierController.create)
router.put('/:supplier_id', supplierController.update)
router.delete('/:supplier_id', supplierController.remove)

export default router

