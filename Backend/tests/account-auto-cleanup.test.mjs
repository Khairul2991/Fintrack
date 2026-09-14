import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { startApp, stopApp, request, disconnectPrisma } from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma } = require('../src/lib/prisma')

let state
let foodId
const today = new Date().toISOString().slice(0, 10)

async function createAccount(name, initialBalance = '0') {
  const res = await request(state.base, 'POST', '/accounts', {
    name,
    type: 'BANK',
    initialBalance,
  }, { userId: state.testUserId })
  assert.equal(res.status, 201)
  return res.data.data
}

async function createTx(accountId, overrides = {}) {
  const res = await request(state.base, 'POST', '/transactions', {
    description: 'Seed tx',
    amount: '1000',
    type: 'EXPENSE',
    categoryId: foodId,
    accountId,
    date: today,
    ...overrides,
  }, { userId: state.testUserId })
  assert.equal(res.status, 201)
  return res.data.data
}

async function accountRow(id) {
  const prisma = await getPrisma()
  return prisma.account.findUnique({ where: { id } })
}

before(async () => {
  state = await startApp()
  const cats = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data
  foodId = cats.find((c) => c.name === 'Food').id
})

after(async () => {
  await disconnectPrisma()
  await stopApp(state.server)
})

describe('Account automatic cleanup', () => {
  it('hard-deletes a never-used active account', async () => {
    const account = await createAccount('Auto Unused')
    const res = await request(state.base, 'DELETE', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.archived, false)
    assert.equal(await accountRow(account.id), null)
  })

  it('archives a used account and auto-deletes it when the last transaction is removed', async () => {
    const account = await createAccount('Bank ABC')
    const tx = await createTx(account.id, { description: 'Rp100.000', amount: '100000' })
    const archived = await request(state.base, 'DELETE', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(archived.status, 200)
    assert.equal(archived.data.data.archived, true)

    const row = await accountRow(account.id)
    assert.ok(row)
    assert.ok(row.deletedAt !== null)

    await request(state.base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId: state.testUserId })
    const gone = await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(gone.status, 404)
    assert.equal(await accountRow(account.id), null)
  })

  it('keeps the archived account while a goal remains, then cleans up after the goal is gone', async () => {
    const account = await createAccount('Auto Goal')
    const tx = await createTx(account.id)
    const goal = await request(state.base, 'POST', '/goals', {
      name: 'Auto Goal',
      targetAmount: '10000',
      accountId: account.id,
    }, { userId: state.testUserId })
    assert.equal(goal.status, 201)
    await request(state.base, 'DELETE', `/accounts/${account.id}`, undefined, { userId: state.testUserId })

    await request(state.base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId: state.testUserId })
    const stays = await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(stays.status, 200)

    await request(state.base, 'DELETE', `/goals/${goal.data.data.id}`, undefined, { userId: state.testUserId })
    const gone = await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(gone.status, 404)
    assert.equal(await accountRow(account.id), null)
  })

  it('cleans up both archived sides once a transfer is deleted', async () => {
    const src = await createAccount('Auto Transfer Src', '5000')
    const dst = await createAccount('Auto Transfer Dst')
    const transfer = await request(state.base, 'POST', '/transactions', {
      description: 'Seed transfer',
      amount: '500',
      type: 'TRANSFER',
      accountId: src.id,
      transferAccountId: dst.id,
      date: today,
    }, { userId: state.testUserId })
    assert.equal(transfer.status, 201)
    await request(state.base, 'DELETE', `/accounts/${src.id}`, undefined, { userId: state.testUserId })
    await request(state.base, 'DELETE', `/accounts/${dst.id}`, undefined, { userId: state.testUserId })

    await request(state.base, 'DELETE', `/transactions/${transfer.data.data.id}`, undefined, { userId: state.testUserId })
    assert.equal(await accountRow(src.id), null)
    assert.equal(await accountRow(dst.id), null)
  })

  it('waits for generated transactions too after the recurring template is deleted', async () => {
    const account = await createAccount('Auto Recurring')
    const rec = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Auto probe',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: foodId,
      accountId: account.id,
      frequency: 'MONTHLY',
      startDate: '2026-09-01',
    }, { userId: state.testUserId })
    assert.equal(rec.status, 201)
    await request(state.base, 'GET', '/recurring-transactions', undefined, { userId: state.testUserId })
    await request(state.base, 'DELETE', `/accounts/${account.id}`, undefined, { userId: state.testUserId })

    await request(state.base, 'DELETE', `/recurring-transactions/${rec.data.data.id}`, undefined, { userId: state.testUserId })
    const stays = await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(stays.status, 200)

    const txs = (await request(state.base, 'GET', '/transactions?limit=100', undefined, { userId: state.testUserId })).data.data
    for (const tx of txs.filter((entry) => entry.accountId === account.id)) {
      await request(state.base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId: state.testUserId })
    }
    assert.equal(await accountRow(account.id), null)
  })

  it('never automatically deletes the default cash account', async () => {
    const rec = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Cash guard probe',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: foodId,
      frequency: 'MONTHLY',
      startDate: '2030-01-01',
    }, { userId: state.testUserId })
    assert.equal(rec.status, 201)
    const prisma = await getPrisma()
    const cash = await prisma.account.findFirst({ where: { userId: state.testUserId, isDefault: true } })
    assert.ok(cash)
    const tx = await createTx(cash.id)
    await prisma.account.update({ where: { id: cash.id }, data: { deletedAt: new Date() } })

    await request(state.base, 'DELETE', `/recurring-transactions/${rec.data.data.id}`, undefined, { userId: state.testUserId })
    await request(state.base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId: state.testUserId })

    const row = await accountRow(cash.id)
    assert.ok(row)
    assert.ok(row.deletedAt !== null)
    const viaApi = await request(state.base, 'GET', `/accounts/${cash.id}`, undefined, { userId: state.testUserId })
    assert.equal(viaApi.status, 200)
  })

  it('never automatically deletes an active account', async () => {
    const account = await createAccount('Auto Active')
    const tx = await createTx(account.id)
    await request(state.base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId: state.testUserId })
    const stays = await request(state.base, 'GET', `/accounts/${account.id}`, undefined, { userId: state.testUserId })
    assert.equal(stays.status, 200)
    assert.ok(await accountRow(account.id))
  })

  it('cleans up when a transaction is moved away from the archived account', async () => {
    const oldAccount = await createAccount('Auto Move From')
    const newAccount = await createAccount('Auto Move To')
    const tx = await createTx(oldAccount.id)
    await request(state.base, 'DELETE', `/accounts/${oldAccount.id}`, undefined, { userId: state.testUserId })

    const moved = await request(state.base, 'PUT', `/transactions/${tx.id}`, {
      description: 'Seed tx',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: foodId,
      accountId: newAccount.id,
      date: today,
    }, { userId: state.testUserId })
    assert.equal(moved.status, 200)
    assert.equal(await accountRow(oldAccount.id), null)
    const target = await request(state.base, 'GET', `/accounts/${newAccount.id}`, undefined, { userId: state.testUserId })
    assert.equal(target.status, 200)
  })

  it('leaves other users and their accounts untouched', async () => {
    const prisma = await getPrisma()
    const other = await prisma.user.create({
      data: { authUserId: 'test-user-auto-cleanup', email: 'autocleanup@fintrack.local' },
    })
    const account = await request(state.base, 'POST', '/accounts', {
      name: 'Other User Bank',
      type: 'BANK',
      initialBalance: '0',
    }, { userId: other.id })
    const tx = await request(state.base, 'POST', '/transactions', {
      description: 'Other tx',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: foodId,
      accountId: account.data.data.id,
      date: today,
    }, { userId: other.id })
    await request(state.base, 'DELETE', `/accounts/${account.data.data.id}`, undefined, { userId: other.id })
    await request(state.base, 'DELETE', `/transactions/${tx.data.data.id}`, undefined, { userId: other.id })

    assert.equal(await accountRow(account.data.data.id), null)
    const mine = (await request(state.base, 'GET', '/accounts', undefined, { userId: state.testUserId })).data.data
    assert.ok(Array.isArray(mine))
  })
})
