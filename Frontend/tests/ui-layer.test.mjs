import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  startBackend,
  stopBackend,
  resetDb,
  isoDate,
  currentKeys,
} from './helpers.mjs'
import { ApiError } from '../src/services/api.js'
import { listCategories, createCategory, deleteCategory } from '../src/services/categoryApi.js'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../src/services/transactionApi.js'
import {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../src/services/budgetApi.js'
import { getDashboardSummary } from '../src/services/dashboardApi.js'
import { createAccount, deleteAccount, listAccounts } from '../src/services/accountApi.js'
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  listRecurringTransactions,
} from '../src/services/recurringTransactionApi.js'
import { getMonthlyReport, getCategoryReport, getReportOverview } from '../src/services/reportsApi.js'
import { getGoalsOverview } from '../src/services/goalApi.js'

before(async () => {
  await startBackend()
})

after(() => {
  stopBackend()
})

describe('UI layer - categories', () => {
  before(async () => {
    await resetDb()
  })

  it('lists the 19 system categories with display fields', async () => {
    const res = await listCategories()
    assert.equal(res.data.length, 19)
    const food = res.data.find((c) => c.name === 'Food')
    assert.equal(typeof food.id, 'number')
    assert.equal(typeof food.name, 'string')
    assert.equal(typeof food.icon, 'string')
    assert.match(food.color, /^#[0-9a-f]{6}$/)
  })

  it('creates and deletes an unused category', async () => {
    const created = await createCategory({ name: 'Travel', icon: '✈️', color: '#0ea5e9', type: 'EXPENSE' })
    assert.equal(created.data.name, 'Travel')
    const removed = await deleteCategory(created.data.id)
    assert.equal(removed.data.id, created.data.id)
  })

  it('maps a duplicate category name to ApiError 409', async () => {
    await createCategory({ name: 'Food', icon: '🍜', color: '#f59e0b', type: 'EXPENSE' })
    await assert.rejects(createCategory({ name: 'Food', icon: '🍜', color: '#f59e0b', type: 'EXPENSE' }), (err) => {
      return err instanceof ApiError && err.status === 409 && /already exists/.test(err.message)
    })
  })

  it('maps an in-use category delete to ApiError 409', async () => {
    const category = (await createCategory({ name: 'Bills2', icon: '🧾', color: '#ef4444', type: 'EXPENSE' })).data
    await createTransaction({
      description: 'electricity',
      amount: '100000',
      type: 'EXPENSE',
      categoryId: category.id,
      date: '2026-01-15',
    })
    await assert.rejects(deleteCategory(category.id), (err) => {
      return err instanceof ApiError && err.status === 409 && err.message.includes('currently in use')
    })
  })
})

describe('UI layer - transactions', () => {
  before(async () => {
    await resetDb()
  })

  it('creates a transaction and lists it with category included', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const created = await createTransaction({
      description: 'Groceries',
      amount: '25000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-10',
    })
    assert.equal(typeof created.data.id, 'number')
    assert.equal(created.data.amount, '25000')

    const res = await listTransactions({ page: 1, limit: 5 })
    assert.equal(res.meta.total, 1)
    assert.equal(res.data[0].category.name, 'Food')
  })

  it('filters by type and searches by description', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const salary = (await listCategories()).data.find((c) => c.name === 'Salary')
    await createTransaction({
      description: 'Market run',
      amount: '40000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-15',
    })
    await createTransaction({
      description: 'Salary deposit',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: '2026-08-20',
    })

const income = await listTransactions({ type: 'INCOME' })
    assert.equal(income.meta.total, 1)

    const search = await listTransactions({ search: 'market' })
    assert.equal(search.data.length, 1)
    assert.equal(search.data[0].description, 'Market run')
  })

  it('maps validation failures to ApiError with status and message', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await assert.rejects(
      createTransaction({
        description: 'x',
        amount: '-5',
        type: 'EXPENSE',
        categoryId: food.id,
        date: '2026-08-01',
      }),
      (err) => {
        return (
          err instanceof ApiError &&
          err.status === 400 &&
          err.message === 'Amount must be a positive number.'
        )
      },
    )
    await assert.rejects(createTransaction({}), (err) => {
      return err instanceof ApiError && err.status === 400 && err.message === 'Description is required.'
    })
  })

  it('updates and deletes a transaction', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const created = await createTransaction({
      description: 'Coffee',
      amount: '12000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-25',
    })
    const updated = await updateTransaction(created.data.id, {
      description: 'Coffee beans',
      amount: '20000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-26',
    })
    assert.equal(updated.data.amount, '20000')

    const removed = await deleteTransaction(created.data.id)
    assert.equal(removed.data.id, created.data.id)

    await assert.rejects(deleteTransaction(created.data.id), (err) => {
      return err instanceof ApiError && err.status === 404
    })
  })

  it('deletes a transfer and reverts the account balances', async () => {
    const src = await createAccount({ name: 'Del Src', type: 'BANK', initialBalance: '20000' })
    const dst = await createAccount({ name: 'Del Dst', type: 'BANK', initialBalance: '0' })
    try {
      const transfer = await createTransaction({
        description: 'Pindah',
        amount: '8000',
        type: 'TRANSFER',
        accountId: src.data.id,
        transferAccountId: dst.data.id,
        date: '2026-08-18',
      })
      assert.equal(transfer.data.type, 'TRANSFER')

      const removed = await deleteTransaction(transfer.data.id)
      assert.equal(removed.data.id, transfer.data.id)

      const accounts = await listAccounts()
      assert.equal(Number(accounts.data.find((a) => a.id === src.data.id).balance), 20000)
      assert.equal(Number(accounts.data.find((a) => a.id === dst.data.id).balance), 0)
    } finally {
      for (const account of [src, dst]) {
        try {
          await deleteAccount(account.data.id)
        } catch {
          // already gone; no-op
        }
      }
    }
  })
})

describe('UI layer - accounts', () => {
  before(async () => {
    await resetDb()
  })

  const createdIds = []

  after(async () => {
    for (const id of createdIds) {
      try {
        await deleteAccount(id)
      } catch {
        // already gone; no-op
      }
    }
  })

  it('creates an account and lists it with a zero balance', async () => {
    const created = await createAccount({ name: 'Dana Darurat', type: 'SAVINGS', initialBalance: '0' })
    createdIds.push(created.data.id)
    assert.equal(typeof created.data.id, 'number')
    assert.equal(Number(created.data.balance), 0)
    const res = await listAccounts()
    assert.ok(res.data.some((account) => account.id === created.data.id))
  })

  it('reports inUse on accounts that have history', async () => {
    const used = await createAccount({ name: 'Used Flag', type: 'BANK', initialBalance: '0' })
    const fresh = await createAccount({ name: 'Fresh Flag', type: 'BANK', initialBalance: '0' })
    createdIds.push(used.data.id, fresh.data.id)
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await createTransaction({
      description: 'Snack',
      amount: '3000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: used.data.id,
      date: '2026-08-06',
    })
    const res = await listAccounts()
    assert.equal(res.data.find((a) => a.id === used.data.id).inUse, true)
    assert.equal(res.data.find((a) => a.id === fresh.data.id).inUse, false)
  })

  it('archives an account with history and hides it from the list', async () => {
    const bank = await createAccount({ name: 'Past Expenses', type: 'BANK', initialBalance: '0' })
    createdIds.push(bank.data.id)
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await createTransaction({
      description: 'Groceries old',
      amount: '5000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: bank.data.id,
      date: '2026-08-05',
    })
    const removed = await deleteAccount(bank.data.id)
    assert.equal(removed.data.archived, true)
    const res = await listAccounts()
    assert.ok(!res.data.some((account) => account.id === bank.data.id))
  })

  it('hard-deletes an unused account', async () => {
    const fresh = await createAccount({ name: 'To Be Removed', type: 'BANK', initialBalance: '0' })
    createdIds.push(fresh.data.id)
    const removed = await deleteAccount(fresh.data.id)
    assert.equal(removed.data.archived, false)
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await assert.rejects(
      createTransaction({
        description: 'x',
        amount: '1000',
        type: 'EXPENSE',
        categoryId: food.id,
        accountId: fresh.data.id,
        date: '2026-08-07',
      }),
      (err) => err instanceof ApiError && err.status === 400 && err.message === 'Account not found.',
    )
  })

  it('rejects new transactions to an archived account', async () => {
    const bank = await createAccount({ name: 'Archived Reject', type: 'BANK', initialBalance: '0' })
    createdIds.push(bank.data.id)
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await createTransaction({
      description: 'Seed',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: bank.data.id,
      date: '2026-08-05',
    })
    await deleteAccount(bank.data.id)
    await assert.rejects(
      createTransaction({
        description: 'Rejected',
        amount: '500',
        type: 'EXPENSE',
        categoryId: food.id,
        accountId: bank.data.id,
        date: '2026-08-08',
      }),
      (err) => err instanceof ApiError && err.status === 400 && err.message === 'This account has been deleted.',
    )
  })
})

describe('UI layer - budgets', () => {
  const { curM, curY } = currentKeys()

  before(async () => {
    await resetDb()
  })

  it('creates a budget and reads enriched progress values the UI consumes', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')
    await createBudget({ categoryId: transport.id, month: curM, year: curY, amount: '100000' })
    const budgets = await listBudgets({ month: curM, year: curY })
    assert.equal(budgets.data.length, 1)
    const budget = budgets.data[0]
    assert.equal(budget.category.name, 'Transportation')
    assert.equal(Number(budget.spent), 0)
    assert.equal(Number(budget.progress), 0)
    assert.equal(Number(budget.remaining), 100000)
    assert.equal(budget.status, 'On Track')
  })

  it('tracks spent, Near Limit, and Over Budget from real expenses', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')
    await createTransaction({
      description: 'fuel',
      amount: '90000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 5),
    })
    let budgets = await listBudgets({ month: curM, year: curY })
    assert.equal(Number(budgets.data[0].spent), 90000)
    assert.equal(budgets.data[0].status, 'Near Limit')

    await createTransaction({
      description: 'insurance',
      amount: '20000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 10),
    })
    budgets = await listBudgets({ month: curM, year: curY })
    assert.equal(Number(budgets.data[0].spent), 110000)
    assert.equal(budgets.data[0].status, 'Over Budget')
    assert.equal(Number(budgets.data[0].remaining), -10000)
  })

  it('maps a duplicate budget to ApiError 409', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')
    await assert.rejects(
      createBudget({ categoryId: transport.id, month: curM, year: curY, amount: '100000' }),
      (err) => err instanceof ApiError && err.status === 409,
    )
  })

  it('updates a budget amount and deletes it', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')
    const budgets = await listBudgets({ month: curM, year: curY })
    const id = budgets.data[0].id
    const updated = await updateBudget(id, {
      categoryId: transport.id,
      month: curM,
      year: curY,
      amount: '250000',
    })
    assert.equal(updated.data.amount, '250000')

    const removed = await deleteBudget(id)
    assert.equal(removed.data.id, id)
    const after = await listBudgets({ month: curM, year: curY })
    assert.equal(after.data.length, 0)
  })
})

describe('UI layer - dashboard', () => {
  const { curM, curY } = currentKeys()

  before(async () => {
    await resetDb()
  })

  it('returns zeroed summary for an empty database', async () => {
    const res = await getDashboardSummary()
    assert.equal(Number(res.data.summary.income), 0)
    assert.equal(Number(res.data.summary.expense), 0)
    assert.equal(Number(res.data.summary.balance), 0)
    assert.equal(res.data.recentTransactions.length, 0)
  })

  it('returns the summary, recent list, series, and insights the UI renders', async () => {
    const salary = (await listCategories()).data.find((c) => c.name === 'Salary')
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')

    await createAccount({ name: 'BCA', type: 'BANK', initialBalance: '2000000' })
    await createAccount({ name: 'BSI', type: 'BANK', initialBalance: '6000000' })
    await createAccount({ name: 'BNI', type: 'BANK', initialBalance: '4000000' })
    await createAccount({ name: 'DANA', type: 'EWALLET', initialBalance: '500000' })
    await createAccount({ name: 'Test Bank', type: 'BANK', initialBalance: '100000' })

    await createTransaction({
      description: 'salary',
      amount: '5000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: isoDate(curY, curM, 1),
    })
    await createTransaction({
      description: 'groceries',
      amount: '2000000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 3),
    })
    await createTransaction({
      description: 'bus',
      amount: '60000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 2),
    })

    const res = await getDashboardSummary()
    assert.equal(Number(res.data.summary.income), 5000000)
    assert.equal(Number(res.data.summary.expense), 2060000)
    assert.equal(Number(res.data.summary.balance), 15540000)

    const accounts = res.data.accounts
    assert.equal(accounts.length, 6)
    assert.equal(accounts.reduce((sum, account) => sum + Number(account.balance), 0), 15540000)

    const recent = res.data.recentTransactions
    assert.equal(recent.length, 3)
    assert.equal(recent[0].description, 'groceries')
    assert.ok(recent.every((t) => t.category && t.category.name))

    const series = res.data.monthlySeries
    assert.equal(series.length, 6)
    assert.equal(Number(series[series.length - 1].expense), 2060000)

    assert.equal(res.data.expenseByCategory.length, 2)
    assert.equal(res.data.expenseByCategory[0].name, 'Food')
    assert.ok(Array.isArray(res.data.insights))
  })
})

describe('UI layer - reports', () => {
  const { curM, curY } = currentKeys()

  before(async () => {
    await resetDb()
  })

  it('maps the monthly report rows to the chart shape', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    await createTransaction({
      description: 'groceries',
      amount: '380000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 10),
    })
    const res = await getMonthlyReport()
    assert.equal(res.data.months.length, 12)
    const months = res.data.months
    assert.equal(months[0].incomeDelta, null)
    months.forEach((month) => {
      assert.match(month.month, /^\d{4}-\d{2}$/)
      assert.equal(typeof month.income, 'string')
      assert.equal(typeof month.expense, 'string')
    })
    const last = months[months.length - 1]
    assert.equal(Number(last.expense), 380000)
    assert.equal(typeof last.expenseDelta, 'string')
  })

  it('ranks categories and reports the highest', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transportation')
    await createTransaction({
      description: 'fuel',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 20),
    })
    const res = await getCategoryReport()
    assert.equal(res.data.categories.length, 2)
    assert.equal(res.data.categories[0].name, 'Food')
    assert.equal(res.data.highest.name, 'Food')
    assert.equal(Number(res.data.highest.total), 380000)
  })

  it('batches monthly report, category report, and categories into one overview call', async () => {
    const overview = await getReportOverview()
    assert.equal(overview.data.monthly.months.length, 12)
    assert.equal(overview.data.monthly.months[11].month, isoDate(currentKeys().curY, currentKeys().curM).slice(0, 7))
    assert.equal(overview.data.categoryReport.categories.length, 2)
    assert.equal(overview.data.categoryReport.highest.name, 'Food')
    assert.equal(overview.data.categories.length, 19)
  })
})

describe('UI layer - goals overview', () => {
  before(async () => {
    await resetDb()
  })

  it('batches goals, categories, and accounts into one call', async () => {
    const overview = await getGoalsOverview()
    assert.ok(Array.isArray(overview.data.goals))
    assert.equal(overview.data.categories.length, 19)
    assert.ok(Array.isArray(overview.data.accounts))
  })
})

describe('UI layer - recurring transactions', () => {
  before(async () => {
    await resetDb()
  })

  const ids = []

  after(async () => {
    for (const id of ids) {
      try {
        await deleteRecurringTransaction(id)
      } catch {
        // already gone; no-op
      }
    }
  })

  it('creates a recurring transaction and preserves a start time', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const res = await createRecurringTransaction({
      description: 'Evening training',
      amount: '220000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: '2031-03-05T02:15:00',
    })
    ids.push(res.data.id)
    assert.equal(res.data.startDate, '2031-03-05T02:15:00.000Z')
    assert.equal(res.data.nextOccurrence, '2031-03-05T02:15:00.000Z')
  })

  it('lists a recurring transaction with its time intact after catch-up', async () => {
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const created = await createRecurringTransaction({
      description: 'Office snacks',
      amount: '120000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: '2026-01-01T05:30:00',
    })
    const id = created.data.id
    ids.push(id)

    const list = await listRecurringTransactions()
    const item = list.data.items.find((entry) => entry.id === id)
    assert.ok(item)
    assert.match(item.nextOccurrence, /^\d{4}-\d{2}-\d{2}T05:30:00\.000Z$/)
    assert.equal(new Date(item.nextOccurrence).getUTCDay(), 4)

    const txs = (await listTransactions()).data
    const recurringTx = txs.find((tx) => tx.recurringTransactionId === id)
    assert.ok(recurringTx, 'generated transactions must carry recurringTransactionId')
    assert.match(recurringTx.date, /T05:30:00\.000Z$/)
    assert.equal(new Date(recurringTx.date).getUTCDay(), 4)
  })
})

describe('UI layer - network failures', () => {
  it('maps an unreachable backend to ApiError with status 0', async () => {
    const current = globalThis.fetch
    globalThis.fetch = () => {
      throw new Error('connection refused')
    }
    try {
      await assert.rejects(listCategories(), (err) => {
        return err instanceof ApiError && err.status === 0 && err.message.includes('Unable to reach the server')
      })
    } finally {
      globalThis.fetch = current
    }
  })
})