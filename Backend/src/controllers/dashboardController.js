const { success } = require('../utils/apiResponse')
const dashboardService = require('../services/dashboardService')

async function getSummary(req, res) {
  success(res, await dashboardService.getSummary(req.user.id))
}

module.exports = { getSummary }