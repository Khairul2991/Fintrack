import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  startApp,
  stopApp,
  request,
  resetDb,
  getCategories,
  disconnectPrisma,
  isoDate,
  currentKeys,
} from './helpers.mjs'

const require = createRequire(import.meta.url)
const transactionService = require('../src/services/transactionService')
const categoryService = require('../src/services/categoryService')
const budgetService = require('../src/services/budgetService')
const dashboardService = require('../src/services/dashboardService')
const reportService = require('../src/services/reportService')
const { getPrisma } = require('../src/lib/prisma')
const { AppError } = require('../src/utils/appError')

let state

before(async () => {
  state = await startApp()
})

after(async () => {
  await disconnectPrisma()
  await stopApp(state.server)
})

describe('Service input validation (business logic)', () => {
  before(async () => {
    await resetDb(state.base)
  })

  it('rejects a missing description', async () => {
    await assert.rejects(transactionService.createTransaction({}), (err) => {
      return err instanceof AppError && err.status === 400 && err.message === 'Description is required.'
    })
  })

  it('rejects non-positive amounts', async () => {
    const cat = (await getCategories(state.base))[0]
    await assert.rejects(
      transactionService.createTransaction({
        description: 'x',
        amount: '0',
        type: 'EXPENSE',
        categoryId: cat.id,
        date: '2026-08-01',
      }),
      (err) => err instanceof AppError && err.message === 'Amount must be greater than 0.',
    )
    for (const amount of ['-5', 'abc']) {
      await assert.rejects(
        transactionService.createTransaction({
          description: 'x',
          amount,
          type: 'EXPENSE',
          categoryId: cat.id,
          date: '2026-08-01',
        }),
        (err) => err instanceof AppError && err.message === 'Amount must be a positive number.',
      )
    }
  })

  it('rejects invalid type and invalid calendar dates', async () => {
    const cat = (await getCategories(state.base))[0]
    await assert.rejects(
      transactionService.createTransaction({
        description: 'x',
        amount: '10',
        type: 'TRANSFER',
        categoryId: cat.id,
        date: '2026-08-01',
      }),
      (err) => err instanceof AppError && err.message === 'Type must be INCOME or EXPENSE.',
    )
    for (const date of ['2026-13-40', '2026-02-30', 'not-a-date']) {
      await assert.rejects(
        transactionService.createTransaction({
          description: 'x',
          amount: '10',
          type: 'EXPENSE',
          categoryId: cat.id,
          date,
        }),
        (err) => err instanceof AppError && err.message === 'Invalid date. Use YYYY-MM-DD.',
      )
    }
  })

  it('rejects an invalid category color', async () => {
    await assert.rejects(
      categoryService.createCategory({ name: 'Travel', icon: '✈️', color: 'red' }),
      (err) => err instanceof AppError && err.message === 'Color must be a hex value like #f59e0b.',
    )
  })

  it('rejects an out-of-range budget month', async () => {
    const cat = (await getCategories(state.base))[0]
    await assert.rejects(
      budgetService.createBudget({ categoryId: cat.id, month: 13, year: 2026, amount: '100' }),
      (err) => err instanceof AppError && err.message === 'month must be at most 12.',
    )
  })

  it('returns AppError 404 for a nonexistent transaction', async () => {
    await assert.rejects(transactionService.getTransaction(999999), (err) => {
      return err instanceof AppError && err.status === 404 && err.message === 'Transaction not found.'
    })
  })

  it('protects categories currently used by transactions', async () => {
    const category = await categoryService.createCategory({
      name: 'TravelBus',
      icon: '✈️',
      color: '#0ea5e9',
    })
    await transactionService.createTransaction({
      description: 'flight',
      amount: '750000',
      type: 'EXPENSE',
      categoryId: category.id,
      date: '2026-08-10',
    })
    await assert.rejects(categoryService.deleteCategory(category.id), (err) => {
      return (
        err instanceof AppError &&
        err.status === 409 &&
        err.message === 'This category cannot be deleted because it is currently in use.'
      )
    })
  })
})

describe('Budget status classification (business logic)', () => {
  const { curM, curY } = currentKeys()

  before(async () => {
    await resetDb(state.base)
  })

  it('classifies On Track, Near Limit, and Over Budget from cumulative spending', async () => {
    const category = await categoryService.createCategory({
      name: 'Travel',
      icon: '✈️',
      color: '#0ea5e9',
    })
    const budget = await budgetService.createBudget({
      categoryId: category.id,
      month: curM,
      year: curY,
      amount: '100000',
    })
    const prisma = await getPrisma()

    const fresh = await budgetService.getBudget(budget.id)
    assert.equal(Number(fresh.spent), 0)
    assert.equal(Number(fresh.progress), 0)
    assert.equal(Number(fresh.remaining), 100000)
    assert.equal(fresh.status, 'On Track')

    await prisma.transaction.create({
      data: {
        description: 'plane',
        amount: '80000',
        type: 'EXPENSE',
        categoryId: category.id,
        date: new Date(Date.UTC(curY, curM - 1, 5)),
      },
    })
    const near = await budgetService.getBudget(budget.id)
    assert.equal(Number(near.spent), 80000)
    assert.equal(Number(near.progress), 80)
    assert.equal(near.status, 'Near Limit')

    await prisma.transaction.create({
      data: {
        description: 'hotel',
        amount: '40000',
        type: 'EXPENSE',
        categoryId: category.id,
        date: new Date(Date.UTC(curY, curM - 1, 20)),
      },
    })
    const over = await budgetService.getBudget(budget.id)
    assert.equal(Number(over.spent), 120000)
    assert.equal(Number(over.progress), 120)
    assert.equal(over.status, 'Over Budget')
    assert.equal(Number(over.remaining), -20000)
  })
})

describe('Dashboard and report aggregation (business logic)', () => {
  const { curY, curM, prevY, prevM, ppY, ppM } = currentKeys()

  before(async () => {
    await resetDb(state.base)
    const salary = (await getCategories(state.base)).find((c) => c.name === 'Salary')
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const transport = (await getCategories(state.base)).find((c) => c.name === 'Transport')

    await request(state.base, 'POST', '/transactions', {
      description: 'salary',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: isoDate(ppY, ppM, 5),
    })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries prev',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(prevY, prevM, 10),
    })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries current',
      amount: '230000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 10),
    })
    await request(state.base, 'POST', '/transactions', {
      description: 'transport current',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 12),
    })
  })

  it('builds the dashboard summary from stored transactions', async () => {
    const summary = await dashboardService.getSummary()
    assert.equal(Number(summary.summary.income), 8000000)
    assert.equal(Number(summary.summary.expense), 530000)
    assert.equal(Number(summary.summary.balance), 7470000)
    assert.equal(summary.recentTransactions.length, 4)

    const series = summary.monthlySeries
    assert.equal(series.length, 6)
    assert.equal(Number(series[series.length - 1].income), 0)
    assert.equal(Number(series[series.length - 1].expense), 380000)

    const byCategory = summary.expenseByCategory
    assert.equal(byCategory.length, 2)
    assert.equal(byCategory[0].name, 'Food')
    assert.equal(Number(byCategory[0].total), 380000)
  })

  it('computes monthly report deltas', async () => {
    const report = await reportService.getMonthlyReport()
    const months = report.months
    assert.equal(months.length, 12)
    assert.equal(months[0].incomeDelta, null)
    assert.equal(months[0].expenseDelta, null)

    const last = months[11]
    const prev = months[10]
    const prevPrev = months[9]
    assert.equal(Number(last.expense), 380000)
    assert.equal(Number(prev.expense), 150000)
    assert.equal(Number(last.expenseDelta), 230000)
    assert.equal(Number(prevPrev.income), 8000000)
    assert.equal(Number(prev.incomeDelta), -8000000)
  })

  it('returns the highest spending category', async () => {
    const report = await reportService.getCategoryReport()
    assert.equal(report.categories.length, 2)
    assert.equal(report.highest.name, 'Food')
    assert.equal(Number(report.highest.total), 380000)
  })
})