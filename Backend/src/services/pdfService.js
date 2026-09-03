const PDFDocument = require('pdfkit')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange } = require('../utils/date')
const { getMonthlySeries, getExpenseByCategory } = require('./reportService')
const { localizeCategoryName } = require('../utils/categoryLocale')

const MONTH_COUNT = 12
const TOP_CATEGORIES = 5

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return (
    'Rp' +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function monthLabel(year, month, lang) {
  const table = lang === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN
  return `${table[month - 1]} ${year}`
}

async function buildReport() {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  const months = await getMonthlySeries(prisma, MONTH_COUNT)
  const totalIncome = months.reduce((sum, m) => sum.plus(m.income), new Decimal(0))
  const totalExpense = months.reduce((sum, m) => sum.plus(m.expense), new Decimal(0))
  const balance = totalIncome.minus(totalExpense)

  const byCategory = await getExpenseByCategory(prisma, { take: TOP_CATEGORIES })
  const transactionAgg = await prisma.transaction.aggregate({ _count: true, _sum: { amount: true } })
  const expenseAgg = await prisma.transaction.aggregate({
    where: { type: 'EXPENSE' },
    _count: true,
    _sum: { amount: true },
  })

  const starts = lastNMonthStarts(MONTH_COUNT)
  const periodStart = starts[0]
  const periodEnd = starts[starts.length - 1]
  const endLabel = periodEnd.toISOString().slice(0, 7)
  const startLabel = periodStart.toISOString().slice(0, 7)

  return {
    months,
    totalIncome,
    totalExpense,
    balance,
    byCategory,
    transactionCount: transactionAgg._count,
    transactionTotal: transactionAgg._sum.amount ?? new Decimal(0),
    expenseCount: expenseAgg._count,
    expenseTotal: expenseAgg._sum.amount ?? new Decimal(0),
    period: { start: startLabel, end: endLabel },
    endDate: periodEnd,
  }
}

function writeHeader(doc, t) {
  doc.fontSize(22).fillColor('#4f46e5').text('FinTrack', { continued: false })
  doc.moveDown(0.3)
  doc.fontSize(13).fillColor('#111827').text(t.title)
  doc.moveDown(0.2)
  doc.fontSize(10).fillColor('#6b7280').text(t.period)
  doc.moveDown(1)
}

function writeSummary(doc, report, t) {
  doc.fontSize(13).fillColor('#111827').text(t.summary)
  doc.moveDown(0.4)
  const rows = [
    [t.income, formatMoney(report.totalIncome)],
    [t.expense, formatMoney(report.totalExpense)],
    [t.balance, formatMoney(report.balance)],
  ]
  for (const [label, value] of rows) {
    doc.fontSize(11).fillColor('#374151').text(label, { continued: true })
    doc.text('   ' + value, { align: 'right' })
  }
  doc.moveDown(1)
}

function writeTopCategories(doc, report, lang) {
  doc.fontSize(13).fillColor('#111827').text('Top Expense Categories')
  doc.moveDown(0.3)
  if (report.byCategory.length === 0) {
    doc.fontSize(10).fillColor('#6b7280').text('No expense data available.')
    doc.moveDown(1)
    return
  }
  const max = Number(report.byCategory[0].total) || 1
  for (const cat of report.byCategory) {
    const label = localizeCategoryName(cat.name, lang)
    const share = Math.round((Number(cat.total) / max) * 100)
    doc.fontSize(10).fillColor('#374151').text(`${label}: ${formatMoney(cat.total)}`)
    const width = Math.max(10, (share / 100) * 400)
    doc.rect(60, doc.y + 2, width, 6).fill('#c7d2fe')
    doc.moveDown(0.7)
  }
  doc.moveDown(0.5)
}

function writeMonthlySummary(doc, report, lang) {
  doc.fontSize(13).fillColor('#111827').text('Monthly Summary')
  doc.moveDown(0.3)
  const cols = {
    month: 120,
    income: 140,
    expense: 140,
    net: 120,
  }
  let y = doc.y
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
  doc.text('Month', 50, y)
  doc.text('Income', 50 + cols.month, y, { width: cols.income })
  doc.text('Expense', 50 + cols.month + cols.income, y, { width: cols.expense })
  doc.text('Net', 50 + cols.month + cols.income + cols.expense, y, { width: cols.net })
  doc.moveDown(0.5)
  const tableTop = doc.y
  doc.font('Helvetica')
  for (const month of report.months) {
    const ym = month.month
    const [year, mm] = ym.split('-').map(Number)
    const label = monthLabel(year, mm, lang)
    const net = Number(month.income) - Number(month.expense)
    y = doc.y
    doc.fillColor('#374151')
    doc.text(label, 50, y)
    doc.text(formatMoney(month.income), 50 + cols.month, y, { width: cols.income })
    doc.text(formatMoney(month.expense), 50 + cols.month + cols.income, y, { width: cols.expense })
    doc.text(formatMoney(net), 50 + cols.month + cols.income + cols.expense, y, { width: cols.net })
    doc.moveDown(0.4)
  }
  doc.moveDown(0.7)
}

function writeTransactionSummary(doc, report) {
  doc.fontSize(13).fillColor('#111827').text('Transaction Summary')
  doc.moveDown(0.4)
  doc.fontSize(10).fillColor('#374151')
  doc.text(`Total transactions: ${report.transactionCount}`)
  doc.text(`Expense transactions: ${report.expenseCount}`)
  doc.moveDown(1)
}

async function generateReportPdf(lang = 'en') {
  const report = await buildReport()
  const isId = lang === 'id'
  const start = report.period.start
  const end = report.period.end
  const t = {
    title: isId ? 'Laporan Keuangan' : 'Financial Report',
    period: isId ? `Periode: ${start} – ${end}` : `Period: ${start} – ${end}`,
    summary: isId ? 'Ringkasan' : 'Summary',
    income: isId ? 'Pendapatan' : 'Total income',
    expense: isId ? 'Pengeluaran' : 'Total expense',
    balance: isId ? 'Saldo' : 'Balance',
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    writeHeader(doc, t)
    writeSummary(doc, report, t)
    writeTopCategories(doc, report, lang)
    writeMonthlySummary(doc, report, lang)
    writeTransactionSummary(doc, report)

    // Footer with generated date.
    const now = new Date()
    doc.fontSize(8).fillColor('#9ca3af')
    doc.text(
      `Generated ${now.toISOString().slice(0, 10)} FinTrack`,
      50,
      doc.page.height - 50,
      { lineBreak: false },
    )

    doc.end()
  })
}

module.exports = { generateReportPdf }