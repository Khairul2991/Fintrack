const { Router } = require('express')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.get('/summary', analyticsController.getAnalytics)

module.exports = router