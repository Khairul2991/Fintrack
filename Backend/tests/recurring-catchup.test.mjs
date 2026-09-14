import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { startApp, stopApp, request, disconnectPrisma } from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma } = require('../src/lib/prisma')
const { runCatchUp } = require('../src/services/recurringTransactionService')

let state
let foodId

const D = (iso) => new Date(iso)

async function seedRule(overrides = {}) {
  const prisma = await getPrisma()
  return prisma.recurringTransaction.create({
    data: {
      userId: state.testUserId,
      description: 'Catch-up probe',
      amount: '75000',
      type: 'EXPENSE',
      categoryId: foodId,
      accountId: null,
      frequency: 'DAILY',
      startDate: D('2026-09-14T06:00:00Z'),
      nextOccurrence: D('2026-09-14T06:00:00Z'),
      active: true,
      ...overrides,
    },
  })
}

async function generatedFor(ruleId) {
  const prisma = await getPrisma()
  return prisma.transaction.findMany({
    where: { userId: state.testUserId, recurringTransactionId: ruleId },
    orderBy: { date: 'asc' },
  })
}

async function nextOf(ruleId) {
  const prisma = await getPrisma()
  const rule = await prisma.recurringTransaction.findUnique({ where: { id: ruleId } })
  return rule.nextOccurrence.toISOString()
}

async function deactivate(ruleId) {
  await request(state.base, 'PATCH', `/recurring-transactions/${ruleId}/active`, { active: false }, { userId: state.testUserId })
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

describe('Recurring transaction catch-up', () => {
  it('generates the due 14 Sep 06:00 occurrence and stops before the future one', async () => {
    const rule = await seedRule()
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-14T10:00:00Z') })
    assert.equal(result.generated, 1)

    const txs = await generatedFor(rule.id)
    assert.equal(txs.length, 1)
    assert.equal(txs[0].date.toISOString(), '2026-09-14T06:00:00.000Z')

    const missing = await generatedFor(rule.id)
    assert.ok(!missing.some((tx) => tx.date.toISOString() === '2026-09-15T06:00:00.000Z'))
    assert.equal(await nextOf(rule.id), '2026-09-15T06:00:00.000Z')
  })

  it('is idempotent when processing the same moment again', async () => {
    const prisma = await getPrisma()
    const rule = await prisma.recurringTransaction.findFirst({
      where: { userId: state.testUserId, description: 'Catch-up probe', active: true },
      orderBy: { id: 'asc' },
    })
    const before = await generatedFor(rule.id)
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-14T10:00:00Z') })
    assert.equal(result.generated, 0)
    const after = await generatedFor(rule.id)
    assert.equal(after.length, before.length)
    assert.equal(await nextOf(rule.id), '2026-09-15T06:00:00.000Z')
  })

  it('generates the next occurrence once its time arrives', async () => {
    const prisma = await getPrisma()
    const rule = await prisma.recurringTransaction.findFirst({
      where: { userId: state.testUserId, description: 'Catch-up probe', active: true },
      orderBy: { id: 'asc' },
    })
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-15T07:00:00Z') })
    assert.equal(result.generated, 1)
    const txs = await generatedFor(rule.id)
    assert.equal(txs.length, 2)
    assert.equal(txs[1].date.toISOString(), '2026-09-15T06:00:00.000Z')
    assert.equal(await nextOf(rule.id), '2026-09-16T06:00:00.000Z')
    await deactivate(rule.id)
  })

  it('does not generate an occurrence whose time has not arrived yet', async () => {
    const rule = await seedRule({ description: 'Catch-up early probe', nextOccurrence: D('2026-09-15T06:00:00Z') })
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-15T05:59:00Z') })
    assert.equal(result.generated, 0)
    assert.equal((await generatedFor(rule.id)).length, 0)
    assert.equal(await nextOf(rule.id), '2026-09-15T06:00:00.000Z')
    await deactivate(rule.id)
  })

  it('catches up multiple missed occurrences without creating the future one', async () => {
    const rule = await seedRule({ description: 'Catch-up multi probe', nextOccurrence: D('2026-09-15T06:00:00Z') })
    const result = await runCatchUp(state.testUserId, { now: D('2026-09-18T10:00:00Z') })
    assert.equal(result.generated, 4)
    const txs = await generatedFor(rule.id)
    assert.deepEqual(
      txs.map((tx) => tx.date.toISOString()),
      [
        '2026-09-15T06:00:00.000Z',
        '2026-09-16T06:00:00.000Z',
        '2026-09-17T06:00:00.000Z',
        '2026-09-18T06:00:00.000Z',
      ],
    )
    assert.equal(await nextOf(rule.id), '2026-09-19T06:00:00.000Z')

    const rerun = await runCatchUp(state.testUserId, { now: D('2026-09-18T10:00:00Z') })
    assert.equal(rerun.generated, 0)
    assert.equal((await generatedFor(rule.id)).length, 4)
    await deactivate(rule.id)
  })

  it('does not advance past an occurrence when creation fails', async () => {
    const prisma = await getPrisma()
    const rule = await seedRule({ description: 'Catch-up failure probe' })
    const original = prisma.$transaction.bind(prisma)
    prisma.$transaction = (fn) => original(async (tx) => {
      const originalCreateMany = tx.transaction.createMany.bind(tx.transaction)
      tx.transaction.createMany = async () => {
        throw new Error('simulated storage failure')
      }
      try {
        return await fn(tx)
      } finally {
        tx.transaction.createMany = originalCreateMany
      }
    })
    try {
      await assert.rejects(runCatchUp(state.testUserId, { now: D('2026-09-14T10:00:00Z') }), /simulated storage failure/)
    } finally {
      prisma.$transaction = original
    }
    assert.equal((await generatedFor(rule.id)).length, 0)
    assert.equal(await nextOf(rule.id), '2026-09-14T06:00:00.000Z')

    const recovered = await runCatchUp(state.testUserId, { now: D('2026-09-14T10:00:00Z') })
    assert.equal(recovered.generated, 1)
    assert.equal((await generatedFor(rule.id)).length, 1)
    await deactivate(rule.id)
  })

  it('propagates an amount edit to already generated transactions', async () => {
    const rule = await seedRule({ description: 'Catch-up edit probe' })
    await runCatchUp(state.testUserId, { now: D('2026-09-14T10:00:00Z') })
    const updated = await request(state.base, 'PUT', `/recurring-transactions/${rule.id}`, {
      description: 'Catch-up edit probe',
      amount: '90000',
      type: 'EXPENSE',
      categoryId: foodId,
      frequency: 'DAILY',
      startDate: '2026-09-14T06:00:00',
    }, { userId: state.testUserId })
    assert.equal(updated.status, 200)
    const txs = await generatedFor(rule.id)
    assert.equal(txs.length, 1)
    assert.equal(Number(txs[0].amount), 90000)
    await deactivate(rule.id)
  })

  it('generates the due same-day occurrence for a new rule on the default cash account', async () => {
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Cash same-day probe',
      amount: '12000',
      type: 'EXPENSE',
      categoryId: foodId,
      frequency: 'DAILY',
      startDate: '2026-09-14T08:00:00',
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const id = created.data.data.id
    assert.equal(created.data.data.nextOccurrence, '2026-09-14T08:00:00.000Z')

    const result = await runCatchUp(state.testUserId, { now: D('2026-09-14T21:53:00Z') })
    assert.equal(result.generated, 1)
    const txs = await generatedFor(id)
    assert.equal(txs.length, 1)
    assert.equal(txs[0].date.toISOString(), '2026-09-14T08:00:00.000Z')
    assert.equal(Number(txs[0].accountId), Number(created.data.data.accountId))
    assert.equal(await nextOf(id), '2026-09-15T08:00:00.000Z')

    const rerun = await runCatchUp(state.testUserId, { now: D('2026-09-14T21:53:00Z') })
    assert.equal(rerun.generated, 0)
    assert.equal((await generatedFor(id)).length, 1)
    await deactivate(id)
  })

  it('behaves identically for the same schedule on a non-default account', async () => {
    const prisma = await getPrisma()
    const cash = await prisma.account.findFirst({ where: { userId: state.testUserId, isDefault: true } })
    const other = await request(state.base, 'POST', '/accounts', {
      name: 'Parity Bank',
      type: 'BANK',
      initialBalance: '0',
    }, { userId: state.testUserId })
    const created = await request(state.base, 'POST', '/recurring-transactions', {
      description: 'Bank same-day probe',
      amount: '12000',
      type: 'EXPENSE',
      categoryId: foodId,
      accountId: other.data.data.id,
      frequency: 'DAILY',
      startDate: '2026-09-14T08:00:00',
    }, { userId: state.testUserId })
    assert.equal(created.status, 201)
    const id = created.data.data.id
    assert.equal(created.data.data.nextOccurrence, '2026-09-14T08:00:00.000Z')
    assert.notEqual(Number(created.data.data.accountId), Number(cash.id))

    const result = await runCatchUp(state.testUserId, { now: D('2026-09-14T21:53:00Z') })
    assert.equal(result.generated, 1)
    const txs = await generatedFor(id)
    assert.equal(txs.length, 1)
    assert.equal(txs[0].date.toISOString(), '2026-09-14T08:00:00.000Z')
    assert.equal(Number(txs[0].accountId), Number(other.data.data.id))
    assert.equal(await nextOf(id), '2026-09-15T08:00:00.000Z')
    await deactivate(id)
  })
})
