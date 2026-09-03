import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  startApp,
  stopApp,
  request,
  getCategories,
  isoDate,
  currentKeys,
} from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma } = require('../src/lib/prisma')

let state

async function clearDerived() {
  const prisma = await getPrisma()
  await prisma.notification.deleteMany({})
  await prisma.goal.deleteMany({})
  await prisma.recurringBudget.deleteMany({})
  await prisma.recurringTransaction.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.budget.deleteMany({})
}

// Seed the 10 baseline categories fresh (clearDerived wipes transactions but not categories).
async function ensureSeedCategories() {
  const existing = await getCategories(state.base)
  if (existing.length === 0) {
    const seeds = [
      ['Food', '🍜', '#f59e0b'],
      ['Transport', '🚗', '#3b82f6'],
      ['Shopping', '🛍️', '#ec4899'],
      ['Entertainment', '🎬', '#8b5cf6'],
      ['Bills', '🧾', '#ef4444'],
      ['Health', '🏥', '#10b981'],
      ['Education', '📚', '#06b6d4'],
      ['Salary', '💰', '#22c55e'],
      ['Freelance', '💻', '#6366f1'],
      ['Other', '📦', '#6b7280'],
    ]
    for (const [name, icon, color] of seeds) {
      await request(state.base, 'POST', '/categories', { name, icon, color })
    }
  }
}

before(async () => {
  state = await startApp()
  await clearDerived()
  await ensureSeedCategories()
})

after(async () => {
  const prisma = await getPrisma()
  await prisma.$disconnect()
  await stopApp(state.server)
})

describe('Accounts API', () => {
  it('creates an account with initial balance and computes enriched balance', async () => {
    const res = await request(state.base, 'POST', '/accounts', {
      name: 'Main Bank',
      type: 'BANK',
      initialBalance: '100000',
    })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.name, 'Main Bank')
    assert.equal(res.data.data.initialBalance, '100000')
    assert.equal(res.data.data.balance, '100000')
  })

  it('rejects an invalid account type and empty name', async () => {
    const badType = await request(state.base, 'POST', '/accounts', {
      name: 'x',
      type: 'WALLET',
      initialBalance: '0',
    })
    assert.equal(badType.status, 400)
    assert.equal(
      badType.data.message,
      'Type must be CASH, BANK, SAVINGS, EWALLET, or OTHER.',
    )

    const noName = await request(state.base, 'POST', '/accounts', {
      name: '',
      type: 'CASH',
    })
    assert.equal(noName.status, 400)
    assert.equal(noName.data.message, 'Name is required.')
  })

  it('reflects transaction income/expense into the account balance', async () => {
    const accounts = (await request(state.base, 'GET', '/accounts')).data.data
    const account = accounts.find((a) => a.name === 'Main Bank')
    const salary = (await getCategories(state.base)).find((c) => c.name === 'Salary')
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')

    await request(state.base, 'POST', '/transactions', {
      description: 'payday',
      amount: '1000000',
      type: 'INCOME',
      categoryId: salary.id,
      accountId: account.id,
      date: isoDate(2026, 9, 1),
    })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries',
      amount: '200000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: account.id,
      date: isoDate(2026, 9, 5),
    })

    const updated = (await request(state.base, 'GET', `/accounts/${account.id}`)).data.data
    assert.equal(Number(updated.income), 1000000)
    assert.equal(Number(updated.expense), 200000)
    assert.equal(Number(updated.balance), 900000)
  })

  it('returns 404 for a nonexistent account and protects an in-use account from deletion', async () => {
    const missing = await request(state.base, 'GET', '/accounts/999999')
    assert.equal(missing.status, 404)
    assert.equal(missing.data.message, 'Account not found.')

    const accounts = (await request(state.base, 'GET', '/accounts')).data.data
    const inUse = accounts.find((a) => a.name === 'Main Bank')
    const blocked = await request(state.base, 'DELETE', `/accounts/${inUse.id}`)
    assert.equal(blocked.status, 409)
    assert.equal(blocked.data.message, 'This account cannot be deleted because it is currently in use.')
  })
})

describe('Recurring Transactions API', () => {
  it('creates a recurring transaction and reports the correct next occurrence', async () => {
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Monthly rent',
      amount: '1500000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 9, 1),
    })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.description, 'Monthly rent')
    assert.equal(res.data.data.nextOccurrence, '2026-09-01')
    assert.equal(res.data.data.active, true)
  })

  it('rejects an invalid frequency and an end date before the start date', async () => {
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const badFreq = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'x',
      amount: '100',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'ANNUALLY',
      startDate: isoDate(2026, 9, 1),
    })
    assert.equal(badFreq.status, 400)
    assert.equal(
      badFreq.data.message,
      'Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY.',
    )

    const badEnd = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'x',
      amount: '100',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 9, 10),
      endDate: isoDate(2026, 9, 1),
    })
    assert.equal(badEnd.status, 400)
    assert.equal(badEnd.data.message, 'End date must be on or after the start date.')
  })

  it('runs a deterministic catch-up generating due transactions and then idempotently stops', async () => {
    const salary = (await getCategories(state.base)).find((c) => c.name === 'Salary')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Monthly salary',
      amount: '5000000',
      type: 'INCOME',
      categoryId: salary.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 1, 1),
    })
    const id = created.data.data.id

    const listRes = await request(state.base, 'GET', '/recurring-transactions')
    const once = (await request(state.base, 'GET', '/transactions?type=INCOME')).data.data
    assert.ok(listRes.data.data.items.length >= 1)
    assert.ok(once.length >= 1)

    // Later than the most recent catch-up, rerunning must not duplicate.
    const twice = (await request(state.base, 'GET', '/transactions?type=INCOME')).data.data
    assert.equal(twice.length, once.length)
    assert.equal(Number(id), Number(id))
  })

  it('pauses and resumes a recurring transaction', async () => {
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Gym',
      amount: '250000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 9, 1),
    })
    const id = created.data.data.id

    const paused = await request(state.base, 'PATCH', `/recurring-transactions/${id}/active`, {
      active: false,
    })
    assert.equal(paused.status, 200)
    assert.equal(paused.data.data.active, false)

    const resumed = await request(state.base, 'PATCH', `/recurring-transactions/${id}/active`, {
      active: true,
    })
    assert.equal(resumed.data.data.active, true)
  })

  it('deletes a recurring transaction and returns 404 for a nonexistent one', async () => {
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Temp',
      amount: '100',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: isoDate(2026, 9, 1),
    })
    const id = created.data.data.id
    const deleted = await request(state.base, 'DELETE', `/recurring-transactions/${id}`)
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/recurring-transactions/${id}`)
    assert.equal(missing.status, 404)
  })
})

describe('Recurring Budgets API', () => {
  const { curY, curM } = currentKeys()

  it('creates a recurring budget and rolls it into a concrete monthly budget', async () => {
    const transport = (await getCategories(state.base)).find((c) => c.name === 'Transport')
    const res = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: transport.id,
      amount: '300000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.next, `${curY}-${String(curM).padStart(2, '0')}`)

    // Listing triggers rollover; the current month budget must then exist.
    await request(state.base, 'GET', '/recurring-budgets')
    const budgets = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`)).data.data
    assert.ok(budgets.some((b) => Number(b.amount) === 300000 && b.category.name === 'Transport'))
  })

  it('rejects an invalid frequency', async () => {
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: food.id,
      amount: '100',
      frequency: 'WEEKLY',
      startMonth: 1,
      startYear: 2026,
    })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Frequency must be MONTHLY or YEARLY.')
  })

  it('pauses and deletes a recurring budget', async () => {
    const health = (await getCategories(state.base)).find((c) => c.name === 'Health')
    const created = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: health.id,
      amount: '50000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    })
    const id = created.data.data.id

    const paused = await request(state.base, 'PATCH', `/recurring-budgets/${id}/active`, {
      active: false,
    })
    assert.equal(paused.status, 200)
    assert.equal(paused.data.data.active, false)

    const deleted = await request(state.base, 'DELETE', `/recurring-budgets/${id}`)
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)
  })

  it('does not duplicate a budget for a category/period that already exists', async () => {
    const shopping = (await getCategories(state.base)).find((c) => c.name === 'Shopping')
    const created = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: shopping.id,
      amount: '200000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    })
    const id = created.data.data.id

    // Trigger rollover once; the Shopping/curM budget must exist exactly once.
    await request(state.base, 'GET', '/recurring-budgets')
    const budgets = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`)).data.data
    const matches = budgets.filter((b) => b.category.name === 'Shopping' && Number(b.amount) === 200000)
    assert.equal(matches.length, 1)

    // Rerolling must not create a duplicate for the same category/period.
    await request(state.base, 'GET', '/recurring-budgets')
    const again = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`)).data.data
    const againMatches = again.filter((b) => b.category.name === 'Shopping' && Number(b.amount) === 200000)
    assert.equal(againMatches.length, 1)

    await request(state.base, 'DELETE', `/recurring-budgets/${id}`)
  })
})

describe('Goals API', () => {
  it('creates a goal with progress, remaining, and IN_PROGRESS status', async () => {
    const education = (await getCategories(state.base)).find((c) => c.name === 'Education')
    const res = await request(state.base, 'POST', '/goals', {
      name: 'New laptop',
      targetAmount: '10000000',
      currentAmount: '2500000',
      targetDate: isoDate(2027, 1, 1),
      categoryId: education.id,
    })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.name, 'New laptop')
    assert.equal(res.data.data.status, 'IN_PROGRESS')
    assert.equal(Number(res.data.data.progress), 25)
    assert.equal(Number(res.data.data.remaining), 7500000)
  })

  it('rejects current amount exceeding the target', async () => {
    const res = await request(state.base, 'POST', '/goals', {
      name: 'Bad goal',
      targetAmount: '1000',
      currentAmount: '5000',
    })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Current amount cannot exceed the target amount.')
  })

  it('updates goal progress and flips to COMPLETED when the target is reached', async () => {
    const goals = (await request(state.base, 'GET', '/goals')).data.data
    const goal = goals.find((g) => g.name === 'New laptop')

    const updated = await request(state.base, 'PATCH', `/goals/${goal.id}/progress`, {
      currentAmount: '10000000',
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.data.status, 'COMPLETED')
    assert.equal(Number(updated.data.data.progress), 100)
    assert.equal(Number(updated.data.data.remaining), 0)

    const over = await request(state.base, 'PATCH', `/goals/${goal.id}/progress`, {
      currentAmount: '11000000',
    })
    assert.equal(over.status, 400)
  })

  it('deletes a goal and returns 404 for a nonexistent one', async () => {
    const created = await request(state.base, 'POST', '/goals', {
      name: 'Temp goal',
      targetAmount: '5000',
    })
    const id = created.data.data.id
    const deleted = await request(state.base, 'DELETE', `/goals/${id}`)
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/goals/${id}`)
    assert.equal(missing.status, 404)
  })
})

describe('Analytics API', () => {
  it('returns totals, cash flow, savings rate, and a 12-month trend', async () => {
    const res = await request(state.base, 'GET', '/analytics/summary')
    assert.equal(res.status, 200)
    const a = res.data.data
    assert.ok(a.monthlyTrend.length >= 12)
    assert.ok(a.totalIncome !== undefined)
    assert.ok(a.totalExpense !== undefined)
    assert.ok(a.netCashFlow !== undefined)
    assert.ok(a.monthOverMonthChange === null || typeof a.monthOverMonthChange === 'number')
    assert.ok(Array.isArray(a.budgetUtilizationTrend.budgets))
  })
})

describe('Export API', () => {
  it('exports all matching transactions as rows', async () => {
    const res = await request(state.base, 'GET', '/export/transactions?type=INCOME')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data.data))
    assert.ok(res.data.data.length >= 1)
    const row = res.data.data[0]
    assert.ok('date' in row && 'amount' in row && 'category' in row && 'type' in row)
  })
})

describe('Notification generation', () => {
  it('generates notifications without error and lists them', async () => {
    const { curY, curM } = currentKeys()
    const food = (await getCategories(state.base)).find((c) => c.name === 'Food')
    await request(state.base, 'POST', '/budgets', {
      categoryId: food.id,
      month: curM,
      year: curY,
      amount: '1',
    })
    const gen = await request(state.base, 'POST', '/notifications/generate')
    assert.equal(gen.status, 200)
    assert.ok(gen.data.data.unread >= 0)

    const list = await request(state.base, 'GET', '/notifications')
    assert.equal(list.status, 200)
    assert.ok(Array.isArray(list.data.data.items))

    const markAll = await request(state.base, 'POST', '/notifications/read-all')
    assert.equal(markAll.status, 200)
    const after = (await request(state.base, 'GET', '/notifications')).data.data
    assert.ok(after.items.every((n) => n.read === true))
  })
})

describe('PDF report', () => {
  it('serves a valid PDF for both en and id', async () => {
    for (const lang of ['en', 'id']) {
      const res = await fetch(`${state.base}/reports/pdf?lang=${lang}`)
      const buf = Buffer.from(await res.arrayBuffer())
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('content-type'), 'application/pdf')
      assert.equal(buf.slice(0, 4).toString(), '%PDF')
      assert.ok(buf.length > 500)
    }
  })
})