const { Router } = require('express')
const exportController = require('../controllers/exportController')

const router = Router()

router.get('/transactions', exportController.exportTransactions)

module.exports = router