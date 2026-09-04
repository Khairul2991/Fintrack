import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { startApp, stopApp, request, getCategories, isoDate, currentKeys } from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma } = require('../src/lib/prisma')
const aiInsightService = require('../src/services/aiInsightService')

let state
let accountId

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

async function seedAccountIfNeeded() {
  const accounts = (await request(state.base, 'GET', '/accounts')).data.data
  if (accounts.length === 0) {
    const res = await request(state.base, 'POST', '/accounts', {
      name: 'AI Test Bank',
      type: 'BANK',
      initialBalance: '100000',
    })
    accountId = res.data.data.id
  } else {
    accountId = accounts[0].id
  }
}

async function categoryIdByName(name) {
  const categories = await getCategories(state.base)
  return categories.find((c) => c.name === name).id
}

async function addTransaction(description, amount, type, category, year, month, day) {
  return request(state.base, 'POST', '/transactions', {
    description,
    amount,
    type,
    categoryId: await categoryIdByName(category),
    accountId,
    date: isoDate(year, month, day),
  })
}

async function reset() {
  await clearDerived()
  await seedAccountIfNeeded()
}

async function getAi({ month, year, lang }) {
  const langQuery = lang ? `&lang=${lang}` : ''
  return request(state.base, 'GET', `/ai-insights?month=${month}&year=${year}${langQuery}`)
}

function hasInsight(result, { type, severity }) {
  return result.data.data.insights.some(
    (insight) => insight.type === type && insight.severity === severity,
  )
}

function hasType(result, type) {
  return result.data.data.insights.some((insight) => insight.type === type)
}

function fakeFetch(content) {
  return async () => {
    if (typeof content === 'function') return content()
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content } }] }
      },
    }
  }
}

function validAiPayload() {
  return JSON.stringify({
    summary: 'A balanced month with steady income.',
    insights: [
      {
        type: 'spending',
        severity: 'warning',
        title: 'Watch spending',
        explanation: 'Your spending rose this month.',
        recommendation: 'Review your purchases.',
        metrics: { current: 500, previous: 400, changePercent: 25 },
      },
      {
        type: 'cashflow',
        severity: 'positive',
        title: 'Good buffer',
        explanation: 'You saved a healthy share.',
        recommendation: 'Keep it up.',
        metrics: { current: 30, previous: null, changePercent: null },
      },
      {
        type: 'recommendation',
        severity: 'info',
        title: 'Consider a budget',
        explanation: 'Setting a category budget may help.',
        recommendation: 'Add a budget next month.',
        metrics: { current: null, previous: null, changePercent: null },
      },
    ],
  })
}

before(async () => {
  state = await startApp()
  await clearDerived()
  await seedAccountIfNeeded()
  delete process.env.AI_PROVIDER
  delete process.env.AI_API_KEY
  delete process.env.AI_MODEL
})

after(async () => {
  const prisma = await getPrisma()
  await prisma.$disconnect()
  await stopApp(state.server)
})

describe('AI Insights API - validation', () => {
  it('rejects a request without month or year', async () => {
    const missing = await request(state.base, 'GET', '/ai-insights')
    assert.equal(missing.status, 400)
    assert.equal(missing.data.message, 'month and year are required.')
  })

  it('rejects an out-of-range month or year', async () => {
    const badMonth = await request(state.base, 'GET', '/ai-insights?month=13&year=2026')
    assert.equal(badMonth.status, 400)
    const badYear = await request(state.base, 'GET', '/ai-insights?month=6&year=1999')
    assert.equal(badYear.status, 400)
  })
})

describe('AI Insights API - deterministic fallback', () => {
  it('reports an informational empty state when there is no data', async () => {
    const { curY, curM } = currentKeys()
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.source, 'rule')
    assert.equal(res.data.data.aiConfigured, false)
    assert.ok(res.data.data.insights.length >= 1)
    assert.ok(hasInsight(res, { type: 'cashflow', severity: 'info' }))
  })

  it('treats income-only months as having income but no expenses', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '2000000', 'INCOME', 'Salary', curY, curM, 2)
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.metrics.income, 2000000)
    assert.equal(res.data.data.metrics.expense, 0)
    assert.ok(res.data.data.insights.some((i) => i.source === 'rule'))
  })

  it('flags sharply increased spending as a warning', async () => {
    const { curY, curM, prevY, prevM } = currentKeys()
    await reset()
    await addTransaction('rent', '1000000', 'EXPENSE', 'Bills', prevY, prevM, 5)
    await addTransaction('rent high', '1500000', 'EXPENSE', 'Bills', curY, curM, 5)
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.source, 'rule')
    assert.ok(hasInsight(res, { type: 'spending', severity: 'warning' }))
    assert.equal(res.data.data.metrics.prevMonthExpense, 1000000)
    assert.equal(res.data.data.metrics.expense, 1500000)
  })

  it('flags sharply decreased spending as positive', async () => {
    const { curY, curM, prevY, prevM } = currentKeys()
    await reset()
    await addTransaction('big', '1000000', 'EXPENSE', 'Food', prevY, prevM, 6)
    await addTransaction('small', '100000', 'EXPENSE', 'Food', curY, curM, 6)
    const res = await getAi({ month: curM, year: curY })
    assert.ok(hasInsight(res, { type: 'spending', severity: 'positive' }))
  })

  it('warns about a low savings rate', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('income', '5000000', 'INCOME', 'Salary', curY, curM, 3)
    await addTransaction('spend', '4800000', 'EXPENSE', 'Shopping', curY, curM, 4)
    const res = await getAi({ month: curM, year: curY })
    assert.ok(hasInsight(res, { type: 'cashflow', severity: 'warning' }))
    assert.equal(res.data.data.metrics.savingsRate, 4)
  })

  it('celebrates a healthy savings rate', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('income', '5000000', 'INCOME', 'Salary', curY, curM, 3)
    await addTransaction('small', '1000000', 'EXPENSE', 'Food', curY, curM, 4)
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.metrics.savingsRate, 80)
    assert.ok(hasInsight(res, { type: 'cashflow', severity: 'positive' }))
  })

  it('flags spending concentration above 30% and marks it as a percentage', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('big category', '700000', 'EXPENSE', 'Food', curY, curM, 7)
    await addTransaction('small', '100000', 'EXPENSE', 'Transport', curY, curM, 8)
    const res = await getAi({ month: curM, year: curY })
    const food = res.data.data.metrics.topCategories.find((c) => c.name === 'Food')
    assert.ok(food)
    assert.ok(food.share >= 30)
    assert.ok(hasInsight(res, { type: 'behavior', severity: 'info' }))
    const concentration = res.data.data.insights.find(
      (insight) => insight.type === 'behavior' && insight.severity === 'info',
    )
    assert.equal(concentration.metricFormats.current, 'percentage')
  })

  it('warns when a budget is nearly reached', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    const foodId = await categoryIdByName('Food')
    await request(state.base, 'POST', '/budgets', {
      categoryId: foodId,
      month: curM,
      year: curY,
      amount: '1000000',
    })
    await addTransaction('lunch', '950000', 'EXPENSE', 'Food', curY, curM, 9)
    const res = await getAi({ month: curM, year: curY })
    const budget = res.data.data.metrics.budgetStatus.find((b) => b.category === 'Food')
    assert.equal(budget.utilization, 95)
    assert.ok(hasInsight(res, { type: 'budget', severity: 'warning' }))
  })

  it('flags an exceeded budget as critical', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    const foodId = await categoryIdByName('Food')
    await request(state.base, 'POST', '/budgets', {
      categoryId: foodId,
      month: curM,
      year: curY,
      amount: '500000',
    })
    await addTransaction('lunch', '600000', 'EXPENSE', 'Food', curY, curM, 10)
    const res = await getAi({ month: curM, year: curY })
    const budget = res.data.data.metrics.budgetStatus.find((b) => b.category === 'Food')
    assert.equal(budget.utilization, 120)
    assert.ok(hasInsight(res, { type: 'budget', severity: 'critical' }))
  })

  it('warns when an in-progress goal is progressing slowly', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '3000000', 'INCOME', 'Salary', curY, curM, 20)
    await request(state.base, 'POST', '/goals', {
      name: 'Emergency fund',
      targetAmount: '1000000',
      currentAmount: '50000',
    })
    const res = await getAi({ month: curM, year: curY })
    const goal = res.data.data.metrics.goals.find((g) => g.name === 'Emergency fund')
    assert.equal(goal.progress, 5)
    assert.ok(hasInsight(res, { type: 'goal', severity: 'warning' }))
  })

  it('does not emit a goal insight when a normal in-progress goal exists', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await request(state.base, 'POST', '/goals', {
      name: 'Vacation',
      targetAmount: '1000000',
      currentAmount: '500000',
    })
    const res = await getAi({ month: curM, year: curY })
    assert.ok(!hasType(res, 'goal'))
  })

  it('emits no goal insight when there are no goals', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '3000000', 'INCOME', 'Salary', curY, curM, 11)
    await addTransaction('lunch', '500000', 'EXPENSE', 'Food', curY, curM, 12)
    const res = await getAi({ month: curM, year: curY })
    assert.ok(!hasType(res, 'goal'))
  })

  it('computes net cash flow as income minus expense', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '5000000', 'INCOME', 'Salary', curY, curM, 2)
    await addTransaction('groceries', '2009000', 'EXPENSE', 'Food', curY, curM, 3)
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.metrics.income, 5000000)
    assert.equal(res.data.data.metrics.expense, 2009000)
    assert.equal(res.data.data.metrics.net, 2991000)
  })

  it('computes the savings rate and net cash flow for the reference example', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '5000000', 'INCOME', 'Salary', curY, curM, 2)
    await addTransaction('groceries', '2009000', 'EXPENSE', 'Food', curY, curM, 3)
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.metrics.net, 2991000)
    const rate = res.data.data.metrics.savingsRate
    assert.ok(Math.abs(rate - 59.82) < 0.01, `expected savingsRate ~59.82 but got ${rate}`)
  })

  it('produces a safe savings rate when income is zero', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('rent', '1000000', 'EXPENSE', 'Bills', curY, curM, 4)
    const res = await getAi({ month: curM, year: curY })
    const rate = res.data.data.metrics.savingsRate
    assert.ok(rate === null || rate === 0, `expected null or 0 but got ${rate}`)
  })

  it('produces a safe expense change when the previous expense is zero', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '3000000', 'INCOME', 'Salary', curY, curM, 5)
    await addTransaction('food', '500000', 'EXPENSE', 'Food', curY, curM, 6)
    const res = await getAi({ month: curM, year: curY })
    const change = res.data.data.metrics.expenseChangePercent
    assert.equal(change, null)
  })

  it('produces a safe goal progress for a defined target', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '3000000', 'INCOME', 'Salary', curY, curM, 7)
    await request(state.base, 'POST', '/goals', {
      name: 'Slow fund',
      targetAmount: '1000000',
      currentAmount: '100000',
    })
    const res = await getAi({ month: curM, year: curY })
    const goal = res.data.data.metrics.goals.find((g) => g.name === 'Slow fund')
    assert.equal(goal.progress, 10)
  })

  it('labels warning insight text in Indonesian when lang=id', async () => {
    const { curY, curM, prevY, prevM } = currentKeys()
    await reset()
    await addTransaction('rent', '1000000', 'EXPENSE', 'Bills', prevY, prevM, 15)
    await addTransaction('rent high', '1500000', 'EXPENSE', 'Bills', curY, curM, 15)
    const res = await getAi({ month: curM, year: curY, lang: 'id' })
    const increased = res.data.data.insights.find(
      (insight) => insight.type === 'spending' && insight.severity === 'warning',
    )
    assert.ok(increased)
    const isIndonesian = /[^\x00-\x7f]/.test(increased.title) || /penghasilan|pengeluaran|meningkat/i.test(increased.title)
    assert.ok(isIndonesian, `expected Indonesian text but got: ${increased.title}`)
  })
})

describe('AI Insights API - provider handling', () => {
  it('falls back to rules when an AI provider is not configured', async () => {
    const { curY, curM } = currentKeys()
    const res = await getAi({ month: curM, year: curY })
    assert.equal(res.data.data.aiConfigured, false)
    assert.equal(res.data.data.source, 'rule')
  })

  it('falls back to rules when the AI provider request fails', async () => {
    const { curY, curM } = currentKeys()
    process.env.AI_PROVIDER = 'https://fake-provider.example'
    process.env.AI_API_KEY = 'test-key'
    process.env.AI_MODEL = 'test-model'
    const result = await aiInsightService.getAiInsights(
      { month: curM, year: curY },
      'en',
      async () => {
        throw new Error('network down')
      },
    )
    delete process.env.AI_PROVIDER
    delete process.env.AI_API_KEY
    delete process.env.AI_MODEL
    assert.equal(result.aiConfigured, true)
    assert.equal(result.source, 'rule')
  })

  it('falls back to rules when the AI provider returns invalid JSON', async () => {
    const { curY, curM } = currentKeys()
    process.env.AI_PROVIDER = 'https://fake-provider.example'
    process.env.AI_API_KEY = 'test-key'
    const result = await aiInsightService.getAiInsights(
      { month: curM, year: curY },
      'en',
      fakeFetch('this is not json at all'),
    )
    delete process.env.AI_PROVIDER
    delete process.env.AI_API_KEY
    assert.equal(result.source, 'rule')
  })

  it('uses AI insights when the provider returns valid structured JSON', async () => {
    const { curY, curM } = currentKeys()
    process.env.AI_PROVIDER = 'https://fake-provider.example'
    process.env.AI_API_KEY = 'test-key'
    const result = await aiInsightService.getAiInsights(
      { month: curM, year: curY },
      'en',
      fakeFetch(validAiPayload()),
    )
    delete process.env.AI_PROVIDER
    delete process.env.AI_API_KEY
    assert.equal(result.source, 'ai')
    assert.ok(result.insights.length >= 3)
    assert.ok(result.insights.every((insight) => insight.source === 'ai'))
  })

  it('does not let the AI override the deterministic headline metrics', async () => {
    const { curY, curM } = currentKeys()
    await clearDerived()
    await seedAccountIfNeeded()
    await addTransaction('salary', '4000000', 'INCOME', 'Salary', curY, curM, 16)
    await addTransaction('lunch', '800000', 'EXPENSE', 'Food', curY, curM, 17)
    process.env.AI_PROVIDER = 'https://fake-provider.example'
    process.env.AI_API_KEY = 'test-key'
    const result = await aiInsightService.getAiInsights(
      { month: curM, year: curY },
      'en',
      fakeFetch(validAiPayload()),
    )
    delete process.env.AI_PROVIDER
    delete process.env.AI_API_KEY
    assert.equal(result.source, 'ai')
    assert.equal(result.metrics.income, 4000000)
    assert.equal(result.metrics.expense, 800000)
    assert.equal(result.metrics.savingsRate, 80)
  })

  it('keeps backend-computed net cash flow even when an AI payload suggests otherwise', async () => {
    const { curY, curM } = currentKeys()
    await reset()
    await addTransaction('salary', '5000000', 'INCOME', 'Salary', curY, curM, 18)
    await addTransaction('food', '2009000', 'EXPENSE', 'Food', curY, curM, 19)
    process.env.AI_PROVIDER = 'https://fake-provider.example'
    process.env.AI_API_KEY = 'test-key'
    const aiPayload = JSON.stringify({
      summary: 'A balanced month.',
      insights: [
        {
          type: 'cashflow',
          severity: 'positive',
          title: 'Healthy buffer',
          explanation: 'Your cash flow is positive.',
          recommendation: 'Keep saving.',
          metrics: { current: 7009000, previous: null, changePercent: null },
          metricFormats: { current: 'currency' },
        },
        {
          type: 'spending',
          severity: 'info',
          title: 'Steady spending',
          explanation: 'Your spending level looks stable.',
          recommendation: 'Keep tracking.',
          metrics: { current: null, previous: null, changePercent: null },
        },
        {
          type: 'recommendation',
          severity: 'info',
          title: 'Keep a budget',
          explanation: 'Budgets help stay on track.',
          recommendation: 'Maintain your budget.',
          metrics: { current: null, previous: null, changePercent: null },
        },
      ],
    })
    const result = await aiInsightService.getAiInsights(
      { month: curM, year: curY },
      'en',
      fakeFetch(aiPayload),
    )
    delete process.env.AI_PROVIDER
    delete process.env.AI_API_KEY
    assert.equal(result.source, 'ai')
    // Deterministic backend headline metrics are authoritative.
    assert.equal(result.metrics.income, 5000000)
    assert.equal(result.metrics.expense, 2009000)
    assert.equal(result.metrics.net, 2991000)
  })
})