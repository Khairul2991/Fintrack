const { success } = require('../utils/apiResponse')
const analyticsService = require('../services/analyticsService')

async function getAnalytics(req, res) {
  const analytics = await analyticsService.getAnalytics()
  success(res, analytics)
}

module.exports = { getAnalytics }