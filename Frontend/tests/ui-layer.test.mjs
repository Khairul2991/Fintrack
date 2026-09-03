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
import { getMonthlyReport, getCategoryReport } from '../src/services/reportsApi.js'

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

  it('lists the 10 seeded categories with display fields', async () => {
    const res = await listCategories()
    assert.equal(res.data.length, 10)
    const food = res.data.find((c) => c.name === 'Food')
    assert.equal(typeof food.id, 'number')
    assert.equal(typeof food.name, 'string')
    assert.equal(typeof food.icon, 'string')
    assert.match(food.color, /^#[0-9a-f]{6}$/)
  })

  it('creates and deletes an unused category', async () => {
    const created = await createCategory({ name: 'Travel', icon: '✈️', color: '#0ea5e9' })
    assert.equal(created.data.name, 'Travel')
    const removed = await deleteCategory(created.data.id)
    assert.equal(removed.data.id, created.data.id)
  })

  it('maps a duplicate category name to ApiError 409', async () => {
    await assert.rejects(createCategory({ name: 'Food', icon: '🍜', color: '#f59e0b' }), (err) => {
      return err instanceof ApiError && err.status === 409 && /already exists/.test(err.message)
    })
  })

  it('maps an in-use category delete to ApiError 409', async () => {
    const category = (await createCategory({ name: 'Bills2', icon: '🧾', color: '#ef4444' })).data
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
})

describe('UI layer - budgets', () => {
  const { curM, curY } = currentKeys()

  before(async () => {
    await resetDb()
  })

  it('creates a budget and reads enriched progress values the UI consumes', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
    await createBudget({ categoryId: transport.id, month: curM, year: curY, amount: '100000' })
    const budgets = await listBudgets({ month: curM, year: curY })
    assert.equal(budgets.data.length, 1)
    const budget = budgets.data[0]
    assert.equal(budget.category.name, 'Transport')
    assert.equal(Number(budget.spent), 0)
    assert.equal(Number(budget.progress), 0)
    assert.equal(Number(budget.remaining), 100000)
    assert.equal(budget.status, 'On Track')
  })

  it('tracks spent, Near Limit, and Over Budget from real expenses', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
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
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
    await assert.rejects(
      createBudget({ categoryId: transport.id, month: curM, year: curY, amount: '100000' }),
      (err) => err instanceof ApiError && err.status === 409,
    )
  })

  it('updates a budget amount and deletes it', async () => {
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
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
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
    await createTransaction({
      description: 'salary',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: isoDate(curY, curM, 1),
    })
    await createTransaction({
      description: 'groceries',
      amount: '500000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 3),
    })
    await createTransaction({
      description: 'bus',
      amount: '200000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 2),
    })

    const res = await getDashboardSummary()
    assert.equal(Number(res.data.summary.income), 8000000)
    assert.equal(Number(res.data.summary.expense), 700000)
    assert.equal(Number(res.data.summary.balance), 7300000)

    const recent = res.data.recentTransactions
    assert.equal(recent.length, 3)
    assert.equal(recent[0].description, 'groceries')
    assert.ok(recent.every((t) => t.category && t.category.name))

    const series = res.data.monthlySeries
    assert.equal(series.length, 6)
    assert.equal(Number(series[series.length - 1].expense), 700000)

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
    const transport = (await listCategories()).data.find((c) => c.name === 'Transport')
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