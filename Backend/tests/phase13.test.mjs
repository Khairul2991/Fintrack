import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import zlib from 'node:zlib'
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
const { generateNotifications } = require('../src/services/notificationService')
const { runCatchUp } = require('../src/services/recurringTransactionService')

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

// Seed the baseline categories fresh (clearDerived wipes transactions but not categories).
async function ensureSeedCategories() {
  const existing = await getCategories(state.base, state.testUserId)
  if (existing.length === 0) {
    const seeds = [
      ['Food', 'EXPENSE', '🍜', '#f59e0b'],
      ['Transportation', 'EXPENSE', '🚗', '#3b82f6'],
      ['Shopping', 'EXPENSE', '🛍️', '#ec4899'],
      ['Entertainment', 'EXPENSE', '🎬', '#8b5cf6'],
      ['Bills', 'EXPENSE', '🧾', '#ef4444'],
      ['Health', 'EXPENSE', '🏥', '#10b981'],
      ['Education', 'EXPENSE', '📚', '#06b6d4'],
      ['Salary', 'INCOME', '💰', '#22c55e'],
      ['Freelance', 'INCOME', '💻', '#6366f1'],
      ['Other', 'INCOME', '📦', '#6b7280'],
    ]
    for (const [name, type, icon, color] of seeds) {
      await request(state.base, 'POST', '/categories', { name, type, icon, color }, { userId: state.testUserId })
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
    }, { userId: state.testUserId })
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
    }, { userId: state.testUserId })
    assert.equal(badType.status, 400)
    assert.equal(
      badType.data.message,
      'Type must be CASH, BANK, SAVINGS, EWALLET, or OTHER.',
    )

    const noName = await request(state.base, 'POST', '/accounts', {
      name: '',
      type: 'CASH',
    }, { userId: state.testUserId })
    assert.equal(noName.status, 400)
    assert.equal(noName.data.message, 'Name is required.')
  })

  it('reflects transaction income/expense into the account balance', async () => {
    const accounts = (await request(state.base, 'GET', '/accounts', undefined, { userId: state.testUserId })).data.data
    const account = accounts.find((a) => a.name === 'Main Bank')
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')

    await request(state.base, 'POST', '/transactions', {
      description: 'payday',
      amount: '1000000',
      type: 'INCOME',
      categoryId: salary.id,
      accountId: account.id,
      date: isoDate(2026, 9, 1),
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries',
      amount: '200000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: account.id,
      date: isoDate(2026, 9, 5),
    }, { userId: state.testUserId })

    const updated = (await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(Number(updated.income), 1000000)
    assert.equal(Number(updated.expense), 200000)
    assert.equal(Number(updated.balance), 900000)
  })

  it('returns 404 for a nonexistent account and archives an in-use account instead of hard-deleting it', async () => {
    const missing = await request(state.base, 'GET', '/accounts/999999', undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)
    assert.equal(missing.data.message, 'Account not found.')

    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const tmp = await request(state.base, 'POST', '/accounts', { name: 'Tmp', type: 'BANK', initialBalance: '0' }, { userId: state.testUserId })
    const tmpId = tmp.data.data.id
    await request(state.base, 'POST', '/transactions', {
      description: 'snack',
      amount: '5000',
      type: 'EXPENSE',
      categoryId: food.id,
      accountId: tmpId,
      date: isoDate(2026, 9, 12),
    }, { userId: state.testUserId })

    const res = await request(state.base, 'DELETE', `/accounts/${tmpId}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.archived, true)
  })

  it('keeps account balance consistent across transaction create, edit, and delete', async () => {
    const accounts = (await request(state.base, 'GET', '/accounts', undefined, { userId: state.testUserId })).data.data
    const account = accounts.find((a) => a.name === 'Main Bank')
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')

    const created = await request(state.base, 'POST', '/transactions', {
      description: 'freelance',
      amount: '300000',
      type: 'INCOME',
      categoryId: salary.id,
      accountId: account.id,
      date: isoDate(2026, 9, 10),
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const txId = created.data.data.id

    const afterCreate = (await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(Number(afterCreate.balance), 1200000)

    await request(state.base, 'PUT', `/transactions/${txId}`, {
      description: 'freelance',
      amount: '100000',
      type: 'INCOME',
      categoryId: salary.id,
      accountId: account.id,
      date: isoDate(2026, 9, 10),
    }, { userId: state.testUserId })
    const afterEdit = (await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(Number(afterEdit.balance), 1000000)

    await request(state.base, 'DELETE', `/transactions/${txId}`, undefined, { userId: state.testUserId })
    const afterDelete = (await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(Number(afterDelete.balance), 900000)
  })

  it('creates an account with zero initial balance', async () => {
    const res = await request(state.base, 'POST', '/accounts', {
      name: 'Zero Balance',
      type: 'CASH',
      initialBalance: '0',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.initialBalance, '0')
    assert.equal(res.data.data.balance, '0')
  })

  it('rejects an account with a duplicate name for the same user', async () => {
    const res = await request(state.base, 'POST', '/accounts', {
      name: 'Main Bank',
      type: 'BANK',
      initialBalance: '5000',
    }, { userId: state.testUserId })
    assert.equal(res.status, 409)
    assert.equal(res.data.message, 'An account with this name already exists.')
  })
})

describe('Recurring Transactions API', () => {
  it('creates a recurring transaction and reports the correct next occurrence', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Monthly rent',
      amount: '1500000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 9, 1),
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.description, 'Monthly rent')
    assert.equal(res.data.data.nextOccurrence, '2026-09-01T00:00:00.000Z')
    assert.equal(res.data.data.active, true)
  })

  it('rejects an invalid frequency and an end date before the start date', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const badFreq = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'x',
      amount: '100',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'ANNUALLY',
      startDate: isoDate(2026, 9, 1),
    }, { userId: state.testUserId })
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
    }, { userId: state.testUserId })
    assert.equal(badEnd.status, 400)
    assert.equal(badEnd.data.message, 'End date must be on or after the start date.')
  })

  it('runs a deterministic catch-up generating due transactions and then idempotently stops', async () => {
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Monthly salary',
      amount: '5000000',
      type: 'INCOME',
      categoryId: salary.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 1, 1),
    }, { userId: state.testUserId })
    const id = created.data.data.id

    const listRes = await request(state.base, 'GET', '/recurring-transactions', undefined, { userId: state.testUserId })
    const once = (await request(state.base, 'GET', '/transactions?type=INCOME', undefined, { userId: state.testUserId })).data.data
    assert.ok(listRes.data.data.items.length >= 1)
    assert.ok(once.length >= 1)

    // Later than the most recent catch-up, rerunning must not duplicate.
    const twice = (await request(state.base, 'GET', '/transactions?type=INCOME', undefined, { userId: state.testUserId })).data.data
    assert.equal(twice.length, once.length)
    assert.equal(Number(id), Number(id))
  })

  it('pauses and resumes a recurring transaction', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Gym',
      amount: '250000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: isoDate(2026, 9, 1),
    }, { userId: state.testUserId })
    const id = created.data.data.id

    const paused = await request(state.base, 'PATCH', `/recurring-transactions/${id}/active`, {
      active: false,
    }, { userId: state.testUserId })
    assert.equal(paused.status, 200)
    assert.equal(paused.data.data.active, false)

    const resumed = await request(state.base, 'PATCH', `/recurring-transactions/${id}/active`, {
      active: true,
    }, { userId: state.testUserId })
    assert.equal(resumed.data.data.active, true)
  })

  it('deletes a recurring transaction and returns 404 for a nonexistent one', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Temp',
      amount: '100',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: isoDate(2026, 9, 1),
    }, { userId: state.testUserId })
    const id = created.data.data.id
    const deleted = await request(state.base, 'DELETE', `/recurring-transactions/${id}`, undefined, { userId: state.testUserId })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/recurring-transactions/${id}`, undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)
  })

  it('stores a start time and reports the next occurrence with it', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Evening gym',
      amount: '180000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: '2030-04-05T07:30:00',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.startDate, '2030-04-05T07:30:00.000Z')
    assert.equal(res.data.data.nextOccurrence, '2030-04-05T07:30:00.000Z')
  })

  it('accepts a same-day end date with a start time and rejects invalid constraints', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const sameDay = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Same day series',
      amount: '50000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: '2030-06-15T07:30:00',
      endDate: '2030-06-15',
    }, { userId: state.testUserId })
    assert.equal(sameDay.status, 201)

    const before = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'x',
      amount: '50000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: '2030-06-15T07:30:00',
      endDate: '2030-06-14',
    }, { userId: state.testUserId })
    assert.equal(before.status, 400)
    assert.equal(before.data.message, 'End date must be on or after the start date.')

    const badClock = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'x',
      amount: '50000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'MONTHLY',
      startDate: '2030-06-15T25:00:00',
    }, { userId: state.testUserId })
    assert.equal(badClock.status, 400)
    assert.equal(badClock.data.message, 'Invalid start date. Use YYYY-MM-DD or YYYY-MM-DDTHH:mm.')
  })

  it('keeps the time of day across weekly catch-up and links generated transactions', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Weekly club',
      amount: '90000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: '2026-01-01T05:30:00',
    }, { userId: state.testUserId })
    const id = created.data.data.id

    const listRes = await request(state.base, 'GET', '/recurring-transactions', undefined, { userId: state.testUserId })
    const item = listRes.data.data.items.find((entry) => entry.id === id)
    assert.ok(item, 'catch-up should leave the weekly recurring in the list')
    assert.match(item.nextOccurrence, /^\d{4}-\d{2}-\d{2}T05:30:00\.000Z$/)
    assert.equal(new Date(item.nextOccurrence).getUTCDay(), 4)

    const txs = (await request(state.base, 'GET', '/transactions?type=EXPENSE&limit=100', undefined, { userId: state.testUserId })).data.data
    const recurringTx = txs.find((tx) => tx.recurringTransactionId === id)
    assert.ok(recurringTx, 'generated transactions must carry recurringTransactionId')
    assert.match(recurringTx.date, /T05:30:00\.000Z$/)
    assert.equal(new Date(recurringTx.date).getUTCDay(), 4)
  })
})

describe('Recurring Budgets API', () => {
  const { curY, curM } = currentKeys()

  it('creates a recurring budget and rolls it into a concrete monthly budget', async () => {
    const transport = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Transportation')
    const res = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: transport.id,
      amount: '300000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.next, `${curY}-${String(curM).padStart(2, '0')}`)

    // Listing triggers rollover; the current month budget must then exist.
    await request(state.base, 'GET', '/recurring-budgets', undefined, { userId: state.testUserId })
    const budgets = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`, undefined, { userId: state.testUserId })).data.data
    assert.ok(budgets.some((b) => Number(b.amount) === 300000 && b.category.name === 'Transportation'))
  })

  it('rejects an invalid frequency', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: food.id,
      amount: '100',
      frequency: 'WEEKLY',
      startMonth: 1,
      startYear: 2026,
    }, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Frequency must be MONTHLY or YEARLY.')
  })

  it('pauses and deletes a recurring budget', async () => {
    const health = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Health')
    const created = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: health.id,
      amount: '50000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    }, { userId: state.testUserId })
    const id = created.data.data.id

    const paused = await request(state.base, 'PATCH', `/recurring-budgets/${id}/active`, {
      active: false,
    }, { userId: state.testUserId })
    assert.equal(paused.status, 200)
    assert.equal(paused.data.data.active, false)

    const deleted = await request(state.base, 'DELETE', `/recurring-budgets/${id}`, undefined, { userId: state.testUserId })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)
  })

  it('does not duplicate a budget for a category/period that already exists', async () => {
    const shopping = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Shopping')
    const created = await request(state.base, 'POST', '/recurring-budgets', {
      categoryId: shopping.id,
      amount: '200000',
      frequency: 'MONTHLY',
      startMonth: curM,
      startYear: curY,
    }, { userId: state.testUserId })
    const id = created.data.data.id

    // Trigger rollover once; the Shopping/curM budget must exist exactly once.
    await request(state.base, 'GET', '/recurring-budgets', undefined, { userId: state.testUserId })
    const budgets = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`, undefined, { userId: state.testUserId })).data.data
    const matches = budgets.filter((b) => b.category.name === 'Shopping' && Number(b.amount) === 200000)
    assert.equal(matches.length, 1)

    // Rerolling must not create a duplicate for the same category/period.
    await request(state.base, 'GET', '/recurring-budgets', undefined, { userId: state.testUserId })
    const again = (await request(state.base, 'GET', `/budgets?month=${curM}&year=${curY}`, undefined, { userId: state.testUserId })).data.data
    const againMatches = again.filter((b) => b.category.name === 'Shopping' && Number(b.amount) === 200000)
    assert.equal(againMatches.length, 1)

    await request(state.base, 'DELETE', `/recurring-budgets/${id}`, undefined, { userId: state.testUserId })
  })
})

describe('Goals API', () => {
  let goalAccountId

  async function addContribution(goalId, amount, day) {
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')
    return request(state.base, 'POST', '/transactions', {
      description: 'goal deposit',
      amount: String(amount),
      type: 'INCOME',
      categoryId: salary.id,
      accountId: goalAccountId,
      goalId,
      date: isoDate(2026, 9, day),
    }, { userId: state.testUserId })
  }

  before(async () => {
    const res = await request(state.base, 'POST', '/accounts', {
      name: 'Goal Savings',
      type: 'SAVINGS',
      initialBalance: '0',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    goalAccountId = res.data.data.id
  })

  it('creates a goal with progress, remaining, and IN_PROGRESS status', async () => {
    const education = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Education')
    const created = await request(state.base, 'POST', '/goals', {
      name: 'New laptop',
      targetAmount: '10000000',
      targetDate: isoDate(2027, 1, 1),
      categoryId: education.id,
      accountId: goalAccountId,
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    assert.equal(created.data.data.name, 'New laptop')
    assert.equal(created.data.data.status, 'IN_PROGRESS')
    assert.equal(Number(created.data.data.currentAmount), 0)
    assert.equal(Number(created.data.data.remaining), 10000000)

    const dep = await addContribution(created.data.data.id, 2500000, 5)
    assert.equal(dep.status, 201)
    const res = await request(state.base, 'GET', `/goals/${created.data.data.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.data.data.status, 'IN_PROGRESS')
    assert.equal(Number(res.data.data.progress), 25)
    assert.equal(Number(res.data.data.remaining), 7500000)
  })

  it('completes a goal when contributions exceed the target', async () => {
    const created = await request(state.base, 'POST', '/goals', {
      name: 'Exceed fund',
      targetAmount: '1000',
      accountId: goalAccountId,
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const dep = await addContribution(created.data.data.id, 5000, 6)
    assert.equal(dep.status, 201)
    const res = await request(state.base, 'GET', `/goals/${created.data.data.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.data.data.status, 'COMPLETED')
    assert.equal(Number(res.data.data.remaining), 0)
  })

  it('updates goal progress and flips to COMPLETED when the target is reached', async () => {
    const goals = (await request(state.base, 'GET', '/goals', undefined, { userId: state.testUserId })).data.data
    const goal = goals.find((g) => g.name === 'New laptop')
    assert.ok(goal, 'goal from the creation test is expected to exist')

    await addContribution(goal.id, 7500000, 8)
    const reached = (await request(state.base, 'GET', `/goals/${goal.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(reached.status, 'COMPLETED')
    assert.equal(Number(reached.progress), 100)
    assert.equal(Number(reached.remaining), 0)

    await addContribution(goal.id, 1000000, 9)
    const over = (await request(state.base, 'GET', `/goals/${goal.id}`, undefined, { userId: state.testUserId })).data.data
    assert.equal(over.status, 'COMPLETED')
    assert.equal(Number(over.remaining), 0)
  })

  it('deletes a goal and returns 404 for a nonexistent one', async () => {
    const created = await request(state.base, 'POST', '/goals', {
      name: 'Temp goal',
      targetAmount: '5000',
      accountId: goalAccountId,
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    assert.equal(Number.isInteger(created.data.data.id), true)
    const id = created.data.data.id
    const deleted = await request(state.base, 'DELETE', `/goals/${id}`, undefined, { userId: state.testUserId })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/goals/${id}`, undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)
  })

  it('serves an overview that batches goals, categories, and accounts', async () => {
    const res = await request(state.base, 'GET', '/goals/overview', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data.data.goals))
    assert.ok(res.data.data.goals.length >= 1)
    assert.equal(res.data.data.categories.length, 19)
    assert.ok(Array.isArray(res.data.data.accounts))
  })
})

describe('Analytics API', () => {
  it('returns totals, cash flow, savings rate, and a 12-month trend', async () => {
    const res = await request(state.base, 'GET', '/analytics/summary', undefined, { userId: state.testUserId })
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
    const res = await request(state.base, 'GET', '/export/transactions?type=INCOME', undefined, { userId: state.testUserId })
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
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    await request(state.base, 'POST', '/budgets', {
      categoryId: food.id,
      month: curM,
      year: curY,
      amount: '1',
    }, { userId: state.testUserId })
    const gen = await request(state.base, 'POST', '/notifications/generate', undefined, { userId: state.testUserId })
    assert.equal(gen.status, 200)
    assert.ok(gen.data.data.unread >= 0)

    const list = await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })
    assert.equal(list.status, 200)
    assert.ok(Array.isArray(list.data.data.items))

    const markAll = await request(state.base, 'POST', '/notifications/read-all', undefined, { userId: state.testUserId })
    assert.equal(markAll.status, 200)
    const after = (await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })).data.data
    assert.ok(after.items.every((n) => n.read === true))
  })
})

describe('Recurring due notification', () => {
  it('creates a RECURRING_DUE notification even though catch-up runs during generation', async () => {
    const prisma = await getPrisma()
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const now = new Date()
    const start = isoDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Test rent due',
      amount: '100000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: start,
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const recurringId = created.data.data.id

    const before = await prisma.recurringTransaction.findUnique({ where: { id: recurringId } })
    assert.ok(
      new Date(before.nextOccurrence).getTime() <= now.getTime(),
      'fixture recurring should be due today',
    )

    const gen = await request(state.base, 'POST', '/notifications/generate', undefined, { userId: state.testUserId })
    assert.equal(gen.status, 200)

    const list = await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })
    const note = list.data.data.items.find(
      (n) => n.type === 'RECURRING_DUE' && n.message.includes('Test rent due'),
    )
    assert.ok(note, 'expected a RECURRING_DUE notification for the due recurring transaction')

    const after = await prisma.recurringTransaction.findUnique({ where: { id: recurringId } })
    assert.ok(
      new Date(after.nextOccurrence).getTime() > now.getTime(),
      'catch-up should still advance nextOccurrence',
    )

    await prisma.notification.deleteMany({
      where: { userId: state.testUserId, message: { contains: 'Test rent due' } },
    })
    await prisma.transaction.deleteMany({ where: { recurringTransactionId: recurringId } })
    await prisma.recurringTransaction.delete({ where: { id: recurringId } })
  })
})

describe('Notification delete & concurrency', () => {
  async function createDueRecurring(description, amount) {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const now = new Date()
    const start = isoDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description,
      amount,
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: start,
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    return created.data.data.id
  }

  async function cleanupRecurring(recurringId, description) {
    const prisma = await getPrisma()
    await prisma.notification.deleteMany({
      where: { userId: state.testUserId, message: { contains: description } },
    })
    await prisma.transaction.deleteMany({ where: { recurringTransactionId: recurringId } })
    await prisma.recurringTransaction.delete({ where: { id: recurringId } })
  }

  it('deletes own notification and updates the unread count', async () => {
    const recurringId = await createDueRecurring('Delete me rent', '100000')
    await request(state.base, 'POST', '/notifications/generate', undefined, { userId: state.testUserId })
    const list = await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })
    const note = list.data.data.items.find((n) => n.message.includes('Delete me rent'))
    assert.ok(note, 'expected a notification created for the due recurring')
    const unreadBefore = list.data.data.unread

    const res = await request(state.base, 'DELETE', `/notifications/${note.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.id, note.id)

    const after = (await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })).data.data
    assert.ok(!after.items.some((n) => n.id === note.id), 'deleted notification must not be listed')
    assert.equal(after.unread, Math.max(0, unreadBefore - 1), 'unread count must drop after delete')

    await cleanupRecurring(recurringId, 'Delete me rent')
  })

  it('rejects deleting another user notification and a nonexistent one', async () => {
    const prisma = await getPrisma()
    const userB = await prisma.user.create({
      data: { authUserId: 'test-user-2', email: 'test2@fintrack.local', name: 'Test User 2' },
    })
    const other = await prisma.notification.create({
      data: {
        userId: userB.id,
        type: 'GOAL_DEADLINE',
        title: 'Goal deadline approaching',
        message: 'Your financial goal "Plan B" is due in 5 day(s).',
      },
    })

    const res = await request(state.base, 'DELETE', `/notifications/${other.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 404)
    assert.equal(res.data.message, 'Notification not found.')

    const missing = await request(state.base, 'DELETE', '/notifications/999999', undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)

    const stillThere = await prisma.notification.findUnique({ where: { id: other.id } })
    assert.ok(stillThere, 'other user notification must remain untouched')

    await prisma.notification.delete({ where: { id: other.id } })
    await prisma.user.delete({ where: { id: userB.id } })
  })

  it('does not duplicate notifications when generation is invoked concurrently', async () => {
    const recurringId = await createDueRecurring('Concurrent rent', '111000')
    const [a, b] = await Promise.all([
      request(state.base, 'POST', '/notifications/generate', undefined, { userId: state.testUserId }),
      request(state.base, 'POST', '/notifications/generate', undefined, { userId: state.testUserId }),
    ])
    assert.equal(a.status, 200)
    assert.equal(b.status, 200)

    const list = (await request(state.base, 'GET', '/notifications', undefined, { userId: state.testUserId })).data.data
    const matches = list.items.filter((n) => n.message.includes('Concurrent rent'))
    assert.equal(matches.length, 1, 'concurrent generation must not duplicate notifications')

    await cleanupRecurring(recurringId, 'Concurrent rent')
  })
})

describe('Recurring due notification (fixed time)', () => {
  const D = (iso) => new Date(iso)
  const MSG = { contains: '09:00 rent' }

  before(async () => {
    await clearDerived()
  })

  async function createRule(overrides = {}) {
    const prisma = await getPrisma()
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    return prisma.recurringTransaction.create({
      data: {
        userId: state.testUserId,
        description: '09:00 rent',
        amount: '150000',
        type: 'EXPENSE',
        categoryId: food.id,
        accountId: null,
        frequency: 'WEEKLY',
        startDate: D('2026-09-18T09:00:00Z'),
        nextOccurrence: D('2026-09-18T09:00:00Z'),
        active: true,
        ...overrides,
      },
    })
  }

  async function cleanupRule(ruleId) {
    const prisma = await getPrisma()
    await prisma.notification.deleteMany({ where: { userId: state.testUserId, type: 'RECURRING_DUE', message: MSG } })
    await prisma.transaction.deleteMany({ where: { recurringTransactionId: ruleId } })
    await prisma.recurringTransaction.deleteMany({ where: { id: ruleId } })
  }

  async function dueNotes() {
    const prisma = await getPrisma()
    return prisma.notification.findMany({
      where: { userId: state.testUserId, type: 'RECURRING_DUE', message: MSG },
    })
  }

  it('CASE 1: recurring due today 09:00 produces a RECURRING_DUE at 10:44', async () => {
    const rule = await createRule()
    const result = await generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    assert.ok(result.created >= 1)
    assert.ok((await dueNotes()).length === 1, 'expected exactly one RECURRING_DUE notification')
    await cleanupRule(rule.id)
  })

  it('CASE 2: recurring not yet due produces no notification', async () => {
    const rule = await createRule()
    const result = await generateNotifications(state.testUserId, { now: D('2026-09-18T08:00:00Z') })
    assert.equal(result.created, 0)
    assert.equal((await dueNotes()).length, 0, 'no notification expected before 09:00')
    await cleanupRule(rule.id)
  })

  it('CASE 3: after notifying, nextOccurrence advances to the next occurrence keeping 09:00', async () => {
    const rule = await createRule()
    await generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    const prisma = await getPrisma()
    const fresh = await prisma.recurringTransaction.findUnique({ where: { id: rule.id } })
    assert.equal(fresh.nextOccurrence.toISOString(), '2026-09-25T09:00:00.000Z')
    await cleanupRule(rule.id)
  })

  it('CASE 4: running generation twice keeps a single unread notification', async () => {
    const rule = await createRule()
    await generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    const second = await generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    assert.equal(second.created, 0)
    assert.equal((await dueNotes()).length, 1, 'dedup must keep exactly one unread notification')
    await cleanupRule(rule.id)
  })

  it('CASE 5: manual "Check reminders" concurrent with the scheduler yields a single notification', async () => {
    const rule = await createRule()
    await Promise.all([
      generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') }),
      generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') }),
    ])
    assert.equal((await dueNotes()).length, 1, 'concurrent scheduler + manual runs must not duplicate')
    await cleanupRule(rule.id)
  })

  it('CASE 6: a 09:00 start date is stored on the same UTC day and never shifted by conversion', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: '09:00 rent',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: '2026-09-18T09:00:00',
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const prisma = await getPrisma()
    const rule = await prisma.recurringTransaction.findUnique({ where: { id: created.data.data.id } })
    assert.equal(rule.nextOccurrence.toISOString(), '2026-09-18T09:00:00.000Z')
    assert.equal(rule.startDate.toISOString(), '2026-09-18T09:00:00.000Z')
    await prisma.transaction.deleteMany({ where: { recurringTransactionId: rule.id } })
    await prisma.recurringTransaction.delete({ where: { id: rule.id } })
  })

  it('dashboard-style catch-up (runCatchUp alone) emits the reminder instead of advancing silently', async () => {
    const rule = await createRule()
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    assert.equal(result.generated, 1)
    assert.equal(result.notified, 1)
    assert.equal((await dueNotes()).length, 1, 'catch-up outside generation must still notify')
    const prisma = await getPrisma()
    const fresh = await prisma.recurringTransaction.findUnique({ where: { id: rule.id } })
    assert.equal(fresh.nextOccurrence.toISOString(), '2026-09-25T09:00:00.000Z')

    const after = await generateNotifications(state.testUserId, { now: D('2026-09-18T10:44:00Z') })
    assert.equal(after.created, 0, 'later generation must not re-create the already-notified reminder')
    await cleanupRule(rule.id)
  })
})

describe('PDF report', () => {
  // Concatenate hex fragments inside each TJ array (PDFKit splits words with
  // kerning adjustments) so UI labels can be asserted without new dependencies.
  function pdfText(buf) {
    const raw = buf.toString('latin1')
    const out = []
    const re = /\/Length (\d+)[^>]*?>>\s*stream\r?\n/g
    let m
    while ((m = re.exec(raw)) !== null) {
      const slice = Buffer.from(raw.slice(m.index + m[0].length, m.index + m[0].length + Number(m[1])), 'latin1')
      let ops
      try {
        ops = zlib.inflateSync(slice).toString('latin1')
      } catch {
        ops = slice.toString('latin1')
      }
      for (const tj of ops.matchAll(/\[(?:\s*<[0-9A-Fa-f]+>\s*|-?\d+(?:\.\d+)?\s*)+?\]/g)) {
        out.push([...tj[0].matchAll(/<([0-9A-Fa-f]+)>/g)]
          .map((h) => Buffer.from(h[1], 'hex').toString('latin1')).join(''))
      }
    }
    return out.join(' ')
  }

  async function fetchPdf(lang) {
    const res = await fetch(`${state.base}/reports/pdf?lang=${lang}`, {
      headers: { 'x-test-user-id': String(state.testUserId) },
    })
    assert.equal(res.status, 200)
    return Buffer.from(await res.arrayBuffer())
  }

  it('serves a valid PDF for both en and id', async () => {
    for (const lang of ['en', 'id']) {
      const res = await fetch(`${state.base}/reports/pdf?lang=${lang}`, {
        headers: { 'x-test-user-id': String(state.testUserId) },
      })
      const buf = Buffer.from(await res.arrayBuffer())
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('content-type'), 'application/pdf')
      assert.equal(buf.slice(0, 4).toString(), '%PDF')
      assert.ok(buf.length > 500)
    }
  })

  it('renders every UI label in the requested language', async () => {
    const id = pdfText(await fetchPdf('id'))
    for (const label of ['Laporan Keuangan', 'Periode:', 'Ringkasan', 'Pendapatan', 'Pengeluaran', 'Saldo',
      'Kategori Pengeluaran Teratas', 'Ringkasan Bulanan', 'Bulan', 'Bersih',
      'Ringkasan Transaksi', 'Total transaksi', 'Transaksi pengeluaran', 'Dibuat']) {
      assert.ok(id.includes(label), `id PDF missing "${label}"`)
    }
    for (const leak of ['Financial Report', 'Monthly Summary', 'Top Expense Categories',
      'Transaction Summary', 'Total transactions', 'Expense transactions', 'Generated',
      'No expense data available.']) {
      assert.ok(!id.includes(leak), `id PDF leaks "${leak}"`)
    }

    const en = pdfText(await fetchPdf('en'))
    for (const label of ['Financial Report', 'Period:', 'Summary', 'Total income', 'Total expense', 'Balance',
      'Top Expense Categories', 'Monthly Summary', 'Month', 'Transaction Summary',
      'Total transactions', 'Expense transactions', 'Generated']) {
      assert.ok(en.includes(label), `en PDF missing "${label}"`)
    }
    for (const leak of ['Laporan Keuangan', 'Periode:', 'Ringkasan Bulanan', 'Kategori Pengeluaran Teratas',
      'Ringkasan Transaksi', 'Total transaksi', 'Transaksi pengeluaran', 'Dibuat',
      'Belum ada data pengeluaran.']) {
      assert.ok(!en.includes(leak), `en PDF leaks "${leak}"`)
    }
  })
})