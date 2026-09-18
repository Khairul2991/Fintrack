import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { buildCsv, buildExcelBuffer } from '../src/utils/exportUtils.js'

const LABELS = {
  en: {
    date: 'Date',
    type: 'Type',
    category: 'Category',
    account: 'Account',
    amount: 'Amount',
    note: 'Note',
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    noAccount: 'No account',
    sheetName: 'Transactions',
  },
  id: {
    date: 'Tanggal',
    type: 'Tipe',
    category: 'Kategori',
    account: 'Akun',
    amount: 'Jumlah',
    note: 'Catatan',
    income: 'Pendapatan',
    expense: 'Pengeluaran',
    transfer: 'Transfer',
    noAccount: 'Tanpa akun',
    sheetName: 'Transaksi',
  },
}

// Mirrors the JSON rows returned by Backend `/export/transactions`:
// type/category/account come from the stored data, not from the label catalog.
const ROWS = [
  { id: 1, date: '2026-09-18', type: 'INCOME', category: 'Salary', account: 'Main Bank', amount: '1500000', note: 'Monthly salary', description: 'Monthly salary' },
  { id: 2, date: '2026-09-17', type: 'EXPENSE', category: 'Food', account: '', amount: '50000.5', note: '', description: 'Lunch' },
  { id: 3, date: '2026-09-16', type: 'TRANSFER', category: '', account: 'Main Bank \u2192 Savings', amount: '200000', note: 'Move', description: 'Move' },
  { id: 4, date: '2026-09-15', type: 'EXPENSE', category: 'My Custom Cat', account: 'Savings', amount: '75000', note: 'note aku', description: 'desc' },
]

describe('export i18n - CSV', () => {
  it('renders Indonesian headers and labels for lang=id', () => {
    const csv = buildCsv(ROWS, 'id', LABELS.id)
    assert.ok(csv.startsWith('Tanggal,Tipe,Kategori,Akun,Jumlah,Catatan'))
    assert.ok(csv.includes('Pendapatan'))
    assert.ok(csv.includes('Pengeluaran'))
    assert.ok(csv.includes('Transfer'))
    assert.ok(csv.includes('Makanan'))
    assert.ok(csv.includes('Gaji'))
    assert.ok(csv.includes('Tanpa akun'))
    assert.ok(csv.includes('My Custom Cat'))
    assert.ok(csv.includes('1.500.000'))
    assert.ok(csv.includes('50.000,5'))
    assert.ok(csv.includes('2026-09-18'))

    for (const leak of ['Date,Type,Category', 'Income', 'Expense', 'No account', 'Salary',
      'Food', 'Transactions']) {
      assert.ok(!csv.includes(leak), `id CSV leaks "${leak}"`)
    }
  })

  it('renders English headers and labels for lang=en', () => {
    const csv = buildCsv(ROWS, 'en', LABELS.en)
    assert.ok(csv.startsWith('Date,Type,Category,Account,Amount,Note'))
    assert.ok(csv.includes('Income'))
    assert.ok(csv.includes('Expense'))
    assert.ok(csv.includes('Transfer'))
    assert.ok(csv.includes('Salary'))
    assert.ok(csv.includes('Food'))
    assert.ok(csv.includes('No account'))
    assert.ok(csv.includes('My Custom Cat'))
    assert.ok(csv.includes('1,500,000'))
    assert.ok(csv.includes('50,000.5'))
    assert.ok(csv.includes('2026-09-18'))

    for (const leak of ['Tanggal', 'Tipe', 'Pendapatan', 'Pengeluaran', 'Makanan', 'Gaji',
      'Tanpa akun', 'Jumlah', 'Catatan']) {
      assert.ok(!csv.includes(leak), `en CSV leaks "${leak}"`)
    }
  })

  it('keeps user data intact in both languages', () => {
    for (const lang of ['id', 'en']) {
      const csv = buildCsv(ROWS, lang, LABELS[lang])
      assert.ok(csv.includes('Monthly salary'), `${lang} CSV lost the note`)
      assert.ok(csv.includes('My Custom Cat'), `${lang} CSV translated a custom category`)
      assert.ok(csv.includes('Main Bank'), `${lang} CSV lost the account name`)
      assert.ok(csv.includes('75000') || csv.includes('75.000') || csv.includes('75,000'), `${lang} CSV lost the raw amount`)
    }
  })
})

describe('export i18n - Excel', () => {
  async function loadExcel(lang) {
    const buffer = await buildExcelBuffer(ROWS, lang, LABELS[lang])
    assert.ok(Buffer.from(buffer).slice(0, 2).toString() === 'PK', 'Excel must be a valid zip')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    return workbook
  }

  it('builds an Indonesian workbook with localized sheet name and headers', async () => {
    const workbook = await loadExcel('id')
    const sheet = workbook.getWorksheet('Transaksi')
    assert.ok(sheet, 'expected a "Transaksi" worksheet')
    assert.equal(workbook.getWorksheet('Transactions'), undefined, 'no English sheet name')

    assert.equal(sheet.getRow(1).getCell(1).value, 'Tanggal')
    assert.equal(sheet.getRow(1).getCell(2).value, 'Tipe')
    assert.equal(sheet.getRow(1).getCell(6).value, 'Catatan')

    assert.equal(sheet.getRow(2).getCell(1).value, '2026-09-18')
    assert.equal(sheet.getRow(2).getCell(2).value, 'Pendapatan')
    assert.equal(sheet.getRow(2).getCell(3).value, 'Gaji')
    assert.equal(sheet.getRow(2).getCell(5).value, '1.500.000')

    assert.equal(sheet.getRow(3).getCell(4).value, 'Tanpa akun')
    assert.equal(sheet.getRow(3).getCell(3).value, 'Makanan')

    assert.equal(sheet.getRow(5).getCell(3).value, 'My Custom Cat')
    assert.equal(sheet.getRow(5).getCell(6).value, 'note aku')
  })

  it('builds an English workbook with localized sheet name and headers', async () => {
    const workbook = await loadExcel('en')
    const sheet = workbook.getWorksheet('Transactions')
    assert.ok(sheet, 'expected a "Transactions" worksheet')
    assert.equal(workbook.getWorksheet('Transaksi'), undefined, 'no Indonesian sheet name')

    assert.equal(sheet.getRow(1).getCell(1).value, 'Date')
    assert.equal(sheet.getRow(1).getCell(2).value, 'Type')
    assert.equal(sheet.getRow(1).getCell(6).value, 'Note')

    assert.equal(sheet.getRow(2).getCell(2).value, 'Income')
    assert.equal(sheet.getRow(2).getCell(3).value, 'Salary')
    assert.equal(sheet.getRow(2).getCell(5).value, '1,500,000')

    assert.equal(sheet.getRow(3).getCell(4).value, 'No account')
    assert.equal(sheet.getRow(3).getCell(3).value, 'Food')

    assert.equal(sheet.getRow(5).getCell(3).value, 'My Custom Cat')
    assert.equal(sheet.getRow(5).getCell(6).value, 'note aku')
  })
})