const PDFDocument = require('pdfkit')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange } = require('../utils/date')
const { getMonthlySeries, getExpenseByCategory } = require('./reportService')
const { localizeCategoryName } = require('../utils/categoryLocale')

const MONTH_COUNT = 12
const TOP_CATEGORIES = 5

function formatMoney(value, lang) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const whole = Math.round(n * 100) % 100 === 0
  const body = new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n)
  return `Rp${body}`
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

async function buildReport(userId) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  const months = await getMonthlySeries(prisma, userId, MONTH_COUNT)
  const totalIncome = months.reduce((sum, m) => sum.plus(m.income), new Decimal(0))
  const totalExpense = months.reduce((sum, m) => sum.plus(m.expense), new Decimal(0))
  const balance = totalIncome.minus(totalExpense)

  const byCategory = await getExpenseByCategory(prisma, userId, { take: TOP_CATEGORIES })
  const transactionAgg = await prisma.transaction.aggregate({ where: { userId }, _count: true, _sum: { amount: true } })
  const expenseAgg = await prisma.transaction.aggregate({
    where: { type: 'EXPENSE', userId },
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

function writeSummary(doc, report, t, lang) {
  doc.fontSize(13).fillColor('#111827').text(t.summary)
  doc.moveDown(0.4)
  const rows = [
    [t.income, formatMoney(report.totalIncome, lang)],
    [t.expense, formatMoney(report.totalExpense, lang)],
    [t.balance, formatMoney(report.balance, lang)],
  ]
  for (const [label, value] of rows) {
    doc.fontSize(11).fillColor('#374151').text(label, { continued: true })
    doc.text('   ' + value, { align: 'right' })
  }
  doc.moveDown(1)
}

// Height of the category share bar and the gap below it. The cursor is
// advanced past the bar deterministically so the bar can never cover text.
const BAR_HEIGHT = 6
const BAR_GAP = 8

function writeTopCategories(doc, report, t, lang) {
  doc.fontSize(13).fillColor('#111827').text(t.topCategories)
  doc.moveDown(0.3)
  if (report.byCategory.length === 0) {
    doc.fontSize(10).fillColor('#6b7280').text(t.noExpense)
    doc.moveDown(1)
    return
  }
  const max = Number(report.byCategory[0].total) || 1
  for (const cat of report.byCategory) {
    const label = localizeCategoryName(cat.name, lang)
    const share = Math.round((Number(cat.total) / max) * 100)
    doc.fontSize(10).fillColor('#374151').text(`${label}: ${formatMoney(cat.total, lang)}`)
    const width = Math.max(10, (share / 100) * 400)
    const barTop = doc.y + 2
    doc.rect(60, barTop, width, BAR_HEIGHT).fill('#c7d2fe')
    doc.fillColor('#374151')
    doc.y = barTop + BAR_HEIGHT + BAR_GAP
  }
  doc.moveDown(0.5)
}

function writeMonthlySummary(doc, report, t, lang) {
  doc.fontSize(13).fillColor('#111827').text(t.monthly)
  doc.moveDown(0.3)
  const cols = {
    month: 120,
    income: 140,
    expense: 140,
    net: 120,
  }
  let y = doc.y
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
  doc.text(t.colMonth, 50, y)
  doc.text(t.colIncome, 50 + cols.month, y, { width: cols.income })
  doc.text(t.colExpense, 50 + cols.month + cols.income, y, { width: cols.expense })
  doc.text(t.colNet, 50 + cols.month + cols.income + cols.expense, y, { width: cols.net })
  doc.moveDown(0.5)
  doc.font('Helvetica')
  for (const month of report.months) {
    const ym = month.month
    const [year, mm] = ym.split('-').map(Number)
    const label = monthLabel(year, mm, lang)
    const net = Number(month.income) - Number(month.expense)
    y = doc.y
    doc.fillColor('#374151')
    doc.text(label, 50, y)
    doc.text(formatMoney(month.income, lang), 50 + cols.month, y, { width: cols.income })
    doc.text(formatMoney(month.expense, lang), 50 + cols.month + cols.income, y, { width: cols.expense })
    doc.text(formatMoney(net, lang), 50 + cols.month + cols.income + cols.expense, y, { width: cols.net })
    doc.moveDown(0.4)
  }
  // Table cells use explicit x positions, which leaves the text cursor at the
  // last column. Reset x so the next section starts at the left margin.
  doc.x = doc.page.margins.left
  doc.moveDown(0.7)
}

function writeTransactionSummary(doc, report, t) {
  doc.fontSize(13).fillColor('#111827').text(t.transactions)
  doc.moveDown(0.4)
  doc.fontSize(10).fillColor('#374151')
  doc.text(`${t.totalTx}: ${report.transactionCount}`)
  doc.text(`${t.expenseTx}: ${report.expenseCount}`)
  doc.moveDown(1)
}

async function generateReportPdf(userId, lang = 'en') {
  const report = await buildReport(userId)
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
    topCategories: isId ? 'Kategori Pengeluaran Teratas' : 'Top Expense Categories',
    noExpense: isId ? 'Belum ada data pengeluaran.' : 'No expense data available.',
    monthly: isId ? 'Ringkasan Bulanan' : 'Monthly Summary',
    colMonth: isId ? 'Bulan' : 'Month',
    colIncome: isId ? 'Pendapatan' : 'Income',
    colExpense: isId ? 'Pengeluaran' : 'Expense',
    colNet: isId ? 'Bersih' : 'Net',
    transactions: isId ? 'Ringkasan Transaksi' : 'Transaction Summary',
    totalTx: isId ? 'Total transaksi' : 'Total transactions',
    expenseTx: isId ? 'Transaksi pengeluaran' : 'Expense transactions',
    generated: isId ? 'Dibuat' : 'Generated',
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    writeHeader(doc, t)
    writeSummary(doc, report, t, lang)
    writeTopCategories(doc, report, t, lang)
    writeMonthlySummary(doc, report, t, lang)
    writeTransactionSummary(doc, report, t)

    // Footer with generated date. If content reached the footer zone,
    // continue on a fresh page so the footer never covers content.
    const now = new Date()
    const footerY = doc.page.height - 50
    if (doc.y > footerY - 12) doc.addPage()
    doc.fontSize(8).fillColor('#9ca3af')
    doc.text(
      `${t.generated} ${now.toISOString().slice(0, 10)} FinTrack`,
      50,
      doc.page.height - 50,
      { lineBreak: false },
    )

    doc.end()
  })
}

module.exports = { generateReportPdf }