const { success } = require('../utils/apiResponse')
const analyticsService = require('../services/analyticsService')

async function getAnalytics(req, res) {
  const analytics = await analyticsService.getAnalytics(req.user.id)
  success(res, analytics)
}

module.exports = { getAnalytics }