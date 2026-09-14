import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { startBackend, stopBackend, resetDb, isoDate } from './helpers.mjs'
import { listCategories } from '../src/services/categoryApi.js'
import { listTransactions, createTransaction } from '../src/services/transactionApi.js'
import { createAccount, deleteAccount, listAccounts } from '../src/services/accountApi.js'
import { messages } from '../src/l10n/messages.js'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(DIR, '../src')

function read(rel) {
  return readFileSync(path.join(SRC, rel), 'utf8')
}

before(async () => {
  await startBackend()
})

after(() => {
  stopBackend()
})

describe('Calendar - month range data pipeline', () => {
  before(async () => {
    await resetDb()
  })

  it('fetches exactly the requested month, inclusive end date, across pages', async () => {
    const categories = await listCategories()
    const food = categories.data.find((c) => c.name === 'Food')
    const salary = categories.data.find((c) => c.name === 'Salary')
    const bank = await createAccount({ name: 'Cal Month Bank', type: 'BANK', initialBalance: '50000' })
    const wallet = await createAccount({ name: 'Cal Month Wallet', type: 'EWALLET', initialBalance: '0' })
    try {
      await createTransaction({
        description: 'Sep salary',
        amount: '100000',
        type: 'INCOME',
        categoryId: salary.id,
        date: isoDate(2026, 9, 2),
      })
      await createTransaction({
        description: 'Sep lunch',
        amount: '40000',
        type: 'EXPENSE',
        categoryId: food.id,
        date: isoDate(2026, 9, 30),
      })
      await createTransaction({
        description: 'Sep move',
        amount: '20000',
        type: 'TRANSFER',
        accountId: bank.data.id,
        transferAccountId: wallet.data.id,
        date: isoDate(2026, 9, 15),
      })
      await createTransaction({
        description: 'Jan bonus',
        amount: '50000',
        type: 'INCOME',
        categoryId: salary.id,
        date: isoDate(2027, 1, 3),
      })

      const all = []
      let page = 1
      let totalPages = 1
      do {
        const res = await listTransactions({
          startDate: isoDate(2026, 9, 1),
          endDate: isoDate(2026, 9, 30),
          limit: 2,
          page,
        })
        all.push(...res.data)
        totalPages = res.meta.totalPages
        page += 1
      } while (page <= totalPages)

      assert.equal(all.length, 3)
      assert.deepEqual(
        all.map((tx) => tx.description).sort(),
        ['Sep lunch', 'Sep move', 'Sep salary'],
      )
      for (const tx of all) {
        assert.equal(String(tx.date).slice(0, 10).startsWith('2026-09'), true)
      }
      const transfer = all.find((tx) => tx.type === 'TRANSFER')
      assert.equal(transfer.transferAccount.name, 'Cal Month Wallet')
      assert.equal(transfer.account.id, bank.data.id)
    } finally {
      await deleteAccountQuiet(bank.data.id)
      await deleteAccountQuiet(wallet.data.id)
    }
  })

  it('returns nothing for a month without transactions', async () => {
    const res = await listTransactions({
      startDate: isoDate(2026, 8, 1),
      endDate: isoDate(2026, 8, 31),
      limit: 100,
    })
    assert.equal(res.data.length, 0)
    assert.equal(res.meta.total, 0)
  })
})

async function deleteAccountQuiet(id) {
  try {
    await deleteAccount(id)
  } catch {
    // already gone; no-op
  }
}

describe('Calendar - account filter pipeline', () => {
  before(async () => {
    await resetDb()
  })

  it('filters the month list to one account and keeps archived history under all accounts', async () => {
    const bank = await createAccount({ name: 'Cal Filter Bank', type: 'BANK', initialBalance: '50000' })
    const wallet = await createAccount({ name: 'Cal Filter Wallet', type: 'EWALLET', initialBalance: '0' })
    const salary = (await listCategories()).data.find((c) => c.name === 'Salary')
    try {
      await createTransaction({
        description: 'Filter salary',
        amount: '100000',
        type: 'INCOME',
        categoryId: salary.id,
        accountId: bank.data.id,
        date: isoDate(2026, 10, 5),
      })
      await createTransaction({
        description: 'Filter move',
        amount: '20000',
        type: 'TRANSFER',
        accountId: bank.data.id,
        transferAccountId: wallet.data.id,
        date: isoDate(2026, 10, 5),
      })

      const bankRes = await listTransactions({
        startDate: isoDate(2026, 10, 1),
        endDate: isoDate(2026, 10, 31),
        accountId: bank.data.id,
        limit: 100,
      })
      assert.equal(bankRes.data.length, 2)
      assert.ok(bankRes.data.some((tx) => tx.description === 'Filter salary'))
      assert.ok(bankRes.data.some((tx) => tx.description === 'Filter move'))

      const walletRes = await listTransactions({
        startDate: isoDate(2026, 10, 1),
        endDate: isoDate(2026, 10, 31),
        accountId: wallet.data.id,
        limit: 100,
      })
      assert.deepEqual(walletRes.data.map((tx) => tx.description), ['Filter move'])

      await deleteAccount(wallet.data.id)
      const accountsAfter = await listAccounts()
      assert.equal(accountsAfter.data.some((a) => a.id === wallet.data.id), false)

      const allRes = await listTransactions({
        startDate: isoDate(2026, 10, 1),
        endDate: isoDate(2026, 10, 31),
        limit: 100,
      })
      assert.equal(allRes.data.length, 2)
      assert.ok(allRes.data.some((tx) => tx.description === 'Filter move'))
    } finally {
      await deleteAccountQuiet(bank.data.id)
      await deleteAccountQuiet(wallet.data.id)
    }
  })
})

describe('Calendar - static wiring', () => {
  it('provides nav.calendar and the cal.* keys in both catalogs', () => {
    const enKeys = Object.keys(messages.en)
    const idKeys = Object.keys(messages.id)
    assert.ok(enKeys.includes('nav.calendar'))
    assert.ok(idKeys.includes('nav.calendar'))
    const calEn = enKeys.filter((k) => k.startsWith('cal.'))
    const calId = idKeys.filter((k) => k.startsWith('cal.'))
    assert.deepEqual([...calEn].sort(), [...calId].sort())
    assert.ok(calEn.length >= 15)
  })

  it('registers the calendar nav item after transactions', () => {
    const nav = read('constants/navigation.jsx')
    const transactionsIndex = nav.indexOf("'nav.transactions'")
    const calendarIndex = nav.indexOf("'nav.calendar'")
    assert.ok(transactionsIndex !== -1)
    assert.ok(calendarIndex > transactionsIndex)
    assert.match(nav, /to: '\/calendar'/)
  })

  it('registers the /calendar route importing CalendarPage', () => {
    const app = read('App.jsx')
    assert.match(app, /import CalendarPage from '\.\/pages\/CalendarPage'/)
    assert.match(app, /<Route path="\/calendar" element={<CalendarPage \/>} \/>/)
  })

  it('wires the page heading, prominent account filter, and transfer indicator copy', () => {
    const page = read('pages/CalendarPage.jsx')
    const monthHeader = read('components/calendar/MonthHeader.jsx')
    const accountSelect = read('components/calendar/CalendarAccountSelect.jsx')
    assert.match(page, /listAccounts/)
    assert.match(page, /title=\{t\('cal\.title'\)\}/)
    assert.match(page, /subtitle=\{t\('cal\.subtitle'\)\}/)
    assert.doesNotMatch(page, /title=\{formatMonthLong/)
    assert.match(accountSelect, /cal\.filterAria/)
    assert.match(accountSelect, /cal\.filterLabel/)
    assert.match(accountSelect, /aria-haspopup="listbox"/)
    assert.match(accountSelect, /accountDisplayName\(account, t\)/)
    assert.match(accountSelect, /FilterIcon/)
    assert.match(monthHeader, /formatMonthLong/)
    assert.match(monthHeader, /text-xl/)
    assert.match(monthHeader, /font-semibold/)
    assert.match(monthHeader, /cal\.prevMonth/)
    assert.match(monthHeader, /cal\.nextMonth/)
    assert.match(monthHeader, /cal\.goToday/)
    assert.match(monthHeader, /cal\.today/)
    const required = [
      'cal.title',
      'cal.subtitle',
      'cal.filterLabel',
      'cal.filterAria',
      'cal.dayCellTransfersAria',
      'cal.transferCount',
      'cal.goToday',
      'cal.today',
    ]
    for (const lang of ['en', 'id']) {
      const keys = Object.keys(messages[lang])
      for (const key of required) {
        assert.ok(keys.includes(key), `${key} missing in ${lang}`)
      }
      assert.equal(messages[lang]['cal.monthSubtitle'], undefined, `${lang} still has cal.monthSubtitle`)
    }
  })
})