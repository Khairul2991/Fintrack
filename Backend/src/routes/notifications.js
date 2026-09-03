const { Router } = require('express')
const notificationController = require('../controllers/notificationController')

const router = Router()

router.get('/', notificationController.listNotifications)
router.post('/generate', notificationController.generate)
router.post('/read-all', notificationController.markAllRead)
router.patch('/:id/read', notificationController.markRead)

module.exports = router