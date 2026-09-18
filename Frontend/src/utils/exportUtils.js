import ExcelJS from 'exceljs'
import { downloadBlob } from '../services/exportApi'
import { localizeCategoryName } from '../l10n/categories'

// Column keys mirror the JSON rows from Backend `/export/transactions` and are
// used for both file formats so CSV and Excel always share the same mapping.
const COLUMN_KEYS = ['date', 'type', 'category', 'account', 'amount', 'note']

function toDisplayAmount(raw, lang) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw ?? '')
  const whole = Math.round(n * 100) % 100 === 0
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n)
}

function typeLabel(type, labels) {
  if (type === 'INCOME') return labels.income
  if (type === 'TRANSFER') return labels.transfer
  return labels.expense
}

function buildRows(rows, lang, labels) {
  return rows.map((row) => [
    row.date,
    typeLabel(row.type, labels),
    localizeCategoryName(row.category, lang),
    row.account || labels.noAccount,
    toDisplayAmount(row.amount, lang),
    row.note || '',
  ])
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildCsv(rows, lang, labels) {
  const lines = [COLUMN_KEYS.map((key) => csvEscape(labels[key])).join(',')]
  for (const row of buildRows(rows, lang, labels)) {
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(rows, lang, labels) {
  const csv = buildCsv(rows, lang, labels)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `Fintrack-transactions-${stamp}.csv`)
}

export async function buildExcelBuffer(rows, lang, labels) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FinTrack'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(labels.sheetName)

  sheet.columns = COLUMN_KEYS.map((key) => ({ header: labels[key], width: 18 }))
  for (const row of buildRows(rows, lang, labels)) {
    sheet.addRow(row)
  }
  sheet.getRow(1).font = { bold: true }

  return workbook.xlsx.writeBuffer()
}

export async function downloadExcel(rows, lang, labels) {
  const buffer = await buildExcelBuffer(rows, lang, labels)
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `Fintrack-transactions-${stamp}.xlsx`)
}