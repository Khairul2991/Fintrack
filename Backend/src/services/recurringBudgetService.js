const { AppError } = require('../utils/appError')
const { getPrisma } = require('../lib/prisma')
const { integer, amountString } = require('../utils/validate')
const { MIN_YEAR, MAX_YEAR } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')

const FREQUENCIES = ['MONTHLY', 'YEARLY']
const MAX_ROLL_PER_RUN = 24

function periodKey(month, year) {
  return year * 100 + month
}

function advancePeriod(month, year, frequency) {
  if (frequency === 'YEARLY') {
    return { month, year: year + 1 }
  }
  if (month === 12) {
    return { month: 1, year: year + 1 }
  }
  return { month: month + 1, year }
}

function currentPeriod() {
  const now = new Date()
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
}

function parseRecurringBudgetInput(body) {
  const categoryId = integer(body.categoryId, 'categoryId')
  const amount = amountString(body.amount)
  const frequency = requireFrequency(body.frequency)
  const startMonth = integer(body.startMonth, 'startMonth', { min: 1, max: 12 })
  const startYear = integer(body.startYear, 'startYear', { min: MIN_YEAR, max: MAX_YEAR })
  return { categoryId, amount, frequency, startMonth, startYear }
}

function requireFrequency(value) {
  if (typeof value !== 'string' || !FREQUENCIES.includes(value)) {
    throw new AppError('Frequency must be MONTHLY or YEARLY.', 400)
  }
  return value
}

async function ensureBudgetMissing(prisma, userId, categoryId, month, year) {
  const existing = await prisma.budget.findUnique({
    where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
    select: { id: true },
  })
  return !existing
}

async function rollPeriods(prisma, userId, item) {
  const today = currentPeriod()
  let month = item.nextMonth
  let year = item.nextYear
  let rolled = 0

  while (periodKey(month, year) <= periodKey(today.month, today.year) && rolled < MAX_ROLL_PER_RUN) {
    const missing = await ensureBudgetMissing(prisma, userId, item.categoryId, month, year)
    if (missing) {
      await prisma.budget.create({
        data: { userId, categoryId: item.categoryId, month, year, amount: item.amount },
      })
    }
    const advanced = advancePeriod(month, year, item.frequency)
    month = advanced.month
    year = advanced.year
    rolled += 1
  }
  await prisma.recurringBudget.update({
    where: { id: item.id },
    data: { nextMonth: month, nextYear: year },
  })
  return rolled
}

async function runBudgetRollover(userId) {
  const prisma = await getPrisma()
  const items = await prisma.recurringBudget.findMany({
    where: { active: true, userId },
    select: { id: true, categoryId: true, amount: true, frequency: true, startMonth: true, nextMonth: true, nextYear: true },
  })
  const results = await Promise.all(items.map((item) => rollPeriods(prisma, userId, item)))
  const rolled = results.reduce((sum, count) => sum + count, 0)
  return { rolled, processed: items.length }
}

function serialize(item) {
  return {
    ...item,
    next: `${item.nextYear}-${String(item.nextMonth).padStart(2, '0')}`,
  }
}

async function listRecurringBudgets(userId) {
  const prisma = await getPrisma()
  await runBudgetRollover(userId)
  const items = await prisma.recurringBudget.findMany({
    where: { userId },
    orderBy: [{ nextYear: 'asc' }, { nextMonth: 'asc' }],
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  return items.map(serialize)
}

async function getRecurringBudget(userId, id) {
  const prisma = await getPrisma()
  const item = await prisma.recurringBudget.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  if (!item) {
    throw new AppError('Recurring budget not found.', 404)
  }
  return serialize(item)
}

async function createRecurringBudget(userId, body) {
  const prisma = await getPrisma()
  const input = parseRecurringBudgetInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  const { frequency, startMonth, startYear } = input
  const item = await prisma.recurringBudget.create({
    data: {
      userId,
      categoryId: input.categoryId,
      amount: input.amount,
      frequency,
      startMonth,
      startYear,
      nextMonth: frequency === 'YEARLY' ? 1 : startMonth,
      nextYear: startYear,
    },
  })
  return getRecurringBudget(userId, item.id)
}

async function updateRecurringBudget(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringBudget.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring budget not found.', 404)
  }
  const input = parseRecurringBudgetInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  const item = await prisma.recurringBudget.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      amount: input.amount,
      frequency: input.frequency,
      startMonth: input.startMonth,
      startYear: input.startYear,
      nextMonth: input.frequency === 'YEARLY' ? 1 : input.startMonth,
      nextYear: input.startYear,
    },
  })
  return getRecurringBudget(userId, item.id)
}

async function setActive(userId, id, active) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringBudget.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring budget not found.', 404)
  }
  const item = await prisma.recurringBudget.update({
    where: { id },
    data: { active: Boolean(active) },
  })
  return getRecurringBudget(userId, item.id)
}

async function deleteRecurringBudget(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringBudget.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring budget not found.', 404)
  }
  await prisma.recurringBudget.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  runBudgetRollover,
  listRecurringBudgets,
  getRecurringBudget,
  createRecurringBudget,
  updateRecurringBudget,
  setActive,
  deleteRecurringBudget,
}