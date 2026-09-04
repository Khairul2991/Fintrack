const { success } = require('../utils/apiResponse')
const aiInsightService = require('../services/aiInsightService')

async function getAiInsights(req, res) {
  const lang = req.query.lang === 'id' ? 'id' : 'en'
  const result = await aiInsightService.getAiInsights(req.query, lang)
  success(res, result)
}

module.exports = { getAiInsights }