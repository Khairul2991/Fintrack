const { Router } = require('express')
const reportController = require('../controllers/reportController')

const router = Router()

router.get('/monthly', reportController.getMonthlyReport)
router.get('/categories', reportController.getCategoryReport)
router.get('/pdf', reportController.downloadPdf)

module.exports = router