import express from 'express'
import verifyToken from '../middlewares/verifyToken'
import checkRole from '../middlewares/checkRole'
import * as userController from '../controllers/user'

const router = express.Router()

// Protected routes - require authentication
router.use(verifyToken)

// Current user info
router.get('/get-current', userController.getCurrent)

// Admin-only routes for user management
router.get('/list', checkRole('Admin'), userController.listUsers)
router.get('/:id', checkRole('Admin'), userController.getUser)
router.post('/', checkRole('Admin'), userController.createUser)
router.put('/:id', checkRole('Admin'), userController.updateUser)
router.delete('/:id', checkRole('Admin'), userController.deleteUser)
router.patch('/:id/reactivate', checkRole('Admin'), userController.reactivateUser)

export default router