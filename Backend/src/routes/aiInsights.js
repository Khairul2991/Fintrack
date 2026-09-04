const { Router } = require('express')
const aiInsightController = require('../controllers/aiInsightController')

const router = Router()

router.get('/', aiInsightController.getAiInsights)

module.exports = router