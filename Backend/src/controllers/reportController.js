const { success } = require('../utils/apiResponse')
const reportService = require('../services/reportService')
const { generateReportPdf } = require('../services/pdfService')

async function getMonthlyReport(req, res) {
  success(res, await reportService.getMonthlyReport(req.user.id))
}

async function getCategoryReport(req, res) {
  success(res, await reportService.getCategoryReport(req.user.id))
}

async function downloadPdf(req, res) {
  const lang = req.query.lang === 'id' ? 'id' : 'en'
  const pdf = await generateReportPdf(req.user.id, lang)
  const filename = `FinTrack-FinancialReport-${new Date().toISOString().slice(0, 10)}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(pdf)
}

module.exports = { getMonthlyReport, getCategoryReport, downloadPdf }