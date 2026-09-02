const { Router } = require('express')
const dashboardController = require('../controllers/dashboardController')

const router = Router()

router.get('/summary', dashboardController.getSummary)

module.exports = router