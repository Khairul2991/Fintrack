const { Router } = require('express')
const notificationController = require('../controllers/notificationController')

const router = Router()

router.get('/', notificationController.listNotifications)
router.post('/generate', notificationController.generate)
router.post('/read-all', notificationController.markAllRead)
router.patch('/:id/read', notificationController.markRead)
router.delete('/:id', notificationController.deleteNotification)

module.exports = router