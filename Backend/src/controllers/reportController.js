const { success } = require('../utils/apiResponse')
const reportService = require('../services/reportService')

async function getMonthlyReport(req, res) {
  success(res, await reportService.getMonthlyReport())
}

async function getCategoryReport(req, res) {
  success(res, await reportService.getCategoryReport())
}

module.exports = { getMonthlyReport, getCategoryReport }