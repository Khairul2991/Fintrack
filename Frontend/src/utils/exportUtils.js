import ExcelJS from 'exceljs'
import { downloadBlob } from '../services/exportApi'
import { localizeCategoryName } from '../l10n/categories'

const HEADERS = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note']

function toDisplayAmount(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw ?? '')
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function typeLabel(type, lang) {
  return type === 'INCOME' ? (lang === 'id' ? 'Pendapatan' : 'Income') : lang === 'id' ? 'Pengeluaran' : 'Expense'
}

function buildRows(rows, lang) {
  return rows.map((row) => [
    row.date,
    typeLabel(row.type, lang),
    localizeCategoryName(row.category, lang),
    row.account || (lang === 'id' ? 'Tanpa akun' : 'No account'),
    toDisplayAmount(row.amount),
    row.note || '',
  ])
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildCsv(rows, lang) {
  const lines = [HEADERS.map(csvEscape).join(',')]
  for (const row of buildRows(rows, lang)) {
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(rows, lang) {
  const csv = buildCsv(rows, lang)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `Fintrack-transactions-${stamp}.csv`)
}

export async function downloadExcel(rows, lang) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FinTrack'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Transactions')

  sheet.columns = HEADERS.map((header) => ({ header, width: 18 }))
  for (const row of buildRows(rows, lang)) {
    sheet.addRow(row)
  }
  sheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `Fintrack-transactions-${stamp}.xlsx`)
}