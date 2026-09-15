import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { startApp, stopApp, request, disconnectPrisma } from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma } = require('../src/lib/prisma')

let state
let foodId
let salaryId
const today = new Date().toISOString().slice(0, 10)

async function counts(userId) {
  const prisma = await getPrisma()
  const [user, transactions, accounts, budgets, recurringTx, recurringBudgets, goals, activities, categories, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.budget.count({ where: { userId } }),
    prisma.recurringTransaction.count({ where: { userId } }),
    prisma.recurringBudget.count({ where: { userId } }),
    prisma.goal.count({ where: { userId } }),
    prisma.goalActivity.count({ where: { goal: { userId } } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.notification.count({ where: { userId } }),
  ])
  return { user, transactions, accounts, budgets, recurringTx, recurringBudgets, goals, activities, categories, notifications }
}

async function seedRichData(userId) {
  const prisma = await getPrisma()
  const bank = (await request(state.base, 'POST', '/accounts', {
    name: 'Reset Bank', type: 'BANK', initialBalance: '5000',
  }, { userId })).data.data
  const wallet = (await request(state.base, 'POST', '/accounts', {
    name: 'Reset Wallet', type: 'EWALLET', initialBalance: '0',
  }, { userId })).data.data
  const customCat = (await request(state.base, 'POST', '/categories', {
    name: 'Reset Hobby', icon: '🎯', color: '#0ea5e9', type: 'EXPENSE',
  }, { userId })).data.data
  await request(state.base, 'POST', '/transactions', {
    description: 'Reset salary', amount: '3000000', type: 'INCOME',
    categoryId: salaryId, accountId: bank.id, date: today,
  }, { userId })
  await request(state.base, 'POST', '/transactions', {
    description: 'Reset hobby', amount: '150000', type: 'EXPENSE',
    categoryId: customCat.id, accountId: bank.id, date: today,
  }, { userId })
  await request(state.base, 'POST', '/transactions', {
    description: 'Reset transfer', amount: '500', type: 'TRANSFER',
    accountId: bank.id, transferAccountId: wallet.id, date: today,
  }, { userId })
  const goal = (await request(state.base, 'POST', '/goals', {
    name: 'Reset Goal', targetAmount: '1000000', accountId: bank.id,
  }, { userId })).data.data
  await request(state.base, 'POST', '/transactions', {
    description: 'Reset contribution', amount: '200000', type: 'EXPENSE',
    categoryId: foodId, accountId: bank.id, goalId: goal.id, date: today,
  }, { userId })
  await request(state.base, 'POST', '/budgets', {
    categoryId: foodId, month: new Date().getUTCMonth() + 1, year: new Date().getUTCFullYear(), amount: '500000',
  }, { userId })
  await request(state.base, 'POST', '/recurring-transactions', {
    description: 'Reset recurring', amount: '75000', type: 'EXPENSE',
    categoryId: foodId, accountId: bank.id, frequency: 'MONTHLY', startDate: '2030-01-01',
  }, { userId })
  await request(state.base, 'POST', '/recurring-budgets', {
    categoryId: foodId, amount: '400000', frequency: 'MONTHLY', startMonth: 1, startYear: 2030,
  }, { userId })
  await prisma.notification.create({
    data: { userId, type: 'BUDGET_LIMIT', title: 'Reset note', message: 'Reset note' },
  })
  await request(state.base, 'DELETE', `/accounts/${wallet.id}`, undefined, { userId })
  return { bank, wallet, goal }
}

before(async () => {
  state = await startApp()
  const cats = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data
  foodId = cats.find((c) => c.name === 'Food').id
  salaryId = cats.find((c) => c.name === 'Salary').id
})

after(async () => {
  await disconnectPrisma()
  await stopApp(state.server)
})

describe('User data reset', () => {
  it('deletes all user financial data and recreates the default cash account', async () => {
    await seedRichData(state.testUserId)
    const before = await counts(state.testUserId)
    assert.ok(before.transactions >= 4)
    assert.ok(before.accounts.length >= 2)
    assert.ok(before.activities >= 1)
    assert.ok(before.categories.some((c) => !c.isSystem))

    const res = await request(state.base, 'DELETE', '/users/me/data', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.reset, true)

    const after = await counts(state.testUserId)
    assert.ok(after.user)
    assert.equal(after.transactions, 0)
    assert.equal(after.budgets, 0)
    assert.equal(after.recurringTx, 0)
    assert.equal(after.recurringBudgets, 0)
    assert.equal(after.goals, 0)
    assert.equal(after.activities, 0)
    assert.equal(after.notifications, 0)
    assert.equal(after.accounts.length, 1)
    assert.equal(after.accounts[0].isDefault, true)
    assert.equal(after.accounts[0].deletedAt, null)

    const prisma = await getPrisma()
    assert.equal(await prisma.category.count({ where: { userId: state.testUserId } }), 0)
    assert.ok((await prisma.category.count({ where: { isSystem: true } })) > 0)
  })

  it('rejects unauthenticated reset requests', async () => {
    const res = await fetch(`${state.base}/users/me/data`, { method: 'DELETE' })
    assert.equal(res.status, 401)
  })

  it('cannot delete another user\'s data', async () => {
    const prisma = await getPrisma()
    const other = await prisma.user.create({
      data: { authUserId: 'test-user-reset-other', email: 'resetother@fintrack.local' },
    })
    await seedRichData(other.id)
    const res = await request(state.base, 'DELETE', '/users/me/data', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    const otherAfter = await counts(other.id)
    assert.ok(otherAfter.transactions >= 4)
    assert.ok(otherAfter.accounts.length >= 2)
    const mineAfter = await counts(state.testUserId)
    assert.equal(mineAfter.transactions, 0)
    assert.equal(mineAfter.accounts.length, 1)
  })

  it('is idempotent and never duplicates the default cash account', async () => {
    const first = await request(state.base, 'DELETE', '/users/me/data', undefined, { userId: state.testUserId })
    assert.equal(first.status, 200)
    const second = await request(state.base, 'DELETE', '/users/me/data', undefined, { userId: state.testUserId })
    assert.equal(second.status, 200)
    const prisma = await getPrisma()
    const cash = await prisma.account.findMany({ where: { userId: state.testUserId, isDefault: true } })
    assert.equal(cash.length, 1)
  })

  it('rolls back everything when a mid-reset deletion fails', async () => {
    await seedRichData(state.testUserId)
    const before = await counts(state.testUserId)
    const prisma = await getPrisma()
    const original = prisma.$transaction.bind(prisma)
    prisma.$transaction = (fn) => original(async (tx) => {
      const originalDeleteMany = tx.budget.deleteMany.bind(tx.budget)
      tx.budget.deleteMany = async () => {
        throw new Error('simulated mid-reset failure')
      }
      try {
        return await fn(tx)
      } finally {
        tx.budget.deleteMany = originalDeleteMany
      }
    })
    let res
    try {
      res = await request(state.base, 'DELETE', '/users/me/data', undefined, { userId: state.testUserId })
    } finally {
      prisma.$transaction = original
    }
    assert.equal(res.status, 500)
    const after = await counts(state.testUserId)
    assert.equal(after.transactions, before.transactions)
    assert.equal(after.accounts.length, before.accounts.length)
    assert.equal(after.goals, before.goals)
    assert.equal(after.budgets, before.budgets)
  })
})
