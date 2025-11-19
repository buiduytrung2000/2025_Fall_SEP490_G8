import express from 'express'
import * as shiftCtrl from '../controllers/shift.js'
import verifyToken from '../middlewares/verifyToken.js'

const router = express.Router()

router.use(verifyToken)

router.post('/checkin', shiftCtrl.checkin)
router.post('/:id/checkout', shiftCtrl.checkout)
router.get('/report', shiftCtrl.report)
router.get('/me/open', shiftCtrl.myOpenShift)
router.get('/', shiftCtrl.list)
router.get('/:id', shiftCtrl.detail)

export default router

