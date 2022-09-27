import express from 'express'
import {register, registerEmail} from '../controllers/authController'
import {me} from '../controllers/userController'
import {authMiddleware, verifyUserId} from '../utils/auth'
import {
  getPreferences,
  updatePreferences,
} from '../controllers/preferencesController'

function getRouter() {
  const router = express.Router()
  router.post('/register', register)
  router.post('/register-email', authMiddleware, verifyUserId, registerEmail)
  router.get('/me', authMiddleware, verifyUserId, me)
  router.get('/preference', authMiddleware, verifyUserId, getPreferences)
  router.put('/preference', authMiddleware, verifyUserId, updatePreferences)

  return router
}
export default getRouter
