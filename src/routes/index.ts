import express from 'express'
import {register, registerEmail} from '../controllers/authController'
import {me} from '../controllers/userController'
import {authMiddleware, verifyAdmin, verifyUserId} from '../utils/auth'
import {deactivateUser} from '../controllers/deactivateController'
import {
  getPreferences,
  updatePreferences,
} from '../controllers/preferencesController'
import {getUserActivity} from '../controllers/activityController'
import {undoTweet} from '../controllers/moderationController'

function getRouter() {
  const router = express.Router()
  router.post('/register', register)
  router.post('/register-email', authMiddleware, verifyUserId, registerEmail)
  router.get('/me', authMiddleware, verifyUserId, me)
  router.get('/preference', authMiddleware, verifyUserId, getPreferences)
  router.post('/preference', authMiddleware, verifyUserId, updatePreferences)
  router.get('/activity', authMiddleware, verifyUserId, getUserActivity)
  router.delete('/deactivate', authMiddleware, verifyUserId, deactivateUser)
  router.delete('/moderation/undo-tweet/:tweetId', authMiddleware, verifyAdmin, undoTweet)
  return router
}
export default getRouter
