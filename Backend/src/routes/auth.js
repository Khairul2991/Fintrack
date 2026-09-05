const { Router } = require('express')
const { requireSupabaseUser } = require('../middleware/requireAuth')
const authController = require('../controllers/authController')

const router = Router()

router.get('/me', requireSupabaseUser, authController.getMe)
router.post('/provision', requireSupabaseUser, authController.provision)

module.exports = router