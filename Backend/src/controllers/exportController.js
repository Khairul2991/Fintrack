const { success } = require('../utils/apiResponse')
const exportService = require('../services/exportService')

async function exportTransactions(req, res) {
  const rows = await exportService.exportTransactions(req.user.id, req.query)
  success(res, rows)
}

module.exports = { exportTransactions }