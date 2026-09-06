const { getPrisma, getDecimal } = require('../lib/prisma')
const { integer, amountString } = require('../utils/validate')
const { AppError } = require('../utils/appError')
const { monthRange, MIN_YEAR, MAX_YEAR } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')

async function getBudgetSpent(prisma, userId, categoryId, month, year) {
  const Decimal = await getDecimal()
  const range = monthRange(month, year)
  const agg = await prisma.transaction.aggregate({
    where: { userId, type: 'EXPENSE', categoryId, date: { gte: range.gte, lt: range.lt } },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? new Decimal(0)
}

function parseBudgetInput(body) {
  const categoryId = integer(body.categoryId, 'categoryId')
  const month = integer(body.month, 'month', { min: 1, max: 12 })
  const year = integer(body.year, 'year', { min: MIN_YEAR, max: MAX_YEAR })
  const amount = amountString(body.amount)
  return { categoryId, month, year, amount }
}

async function enrichBudget(prisma, userId, budget) {
  const Decimal = await getDecimal()
  const spent = await getBudgetSpent(prisma, userId, budget.categoryId, budget.month, budget.year)
  const remaining = budget.amount.minus(spent)
  const progress = budget.amount.gt(0) ? spent.div(budget.amount).mul(100) : new Decimal(0)
  let status = 'On Track'
  if (spent.gte(budget.amount)) {
    status = 'Over Budget'
  } else if (progress.gte(80)) {
    status = 'Near Limit'
  }
  return { ...budget, spent, remaining, progress, status }
}

async function enrichBudgetWithSpent(budget, spentRaw) {
  const Decimal = await getDecimal()
  const spent = spentRaw ?? new Decimal(0)
  const remaining = budget.amount.minus(spent)
  const progress = budget.amount.gt(0) ? spent.div(budget.amount).mul(100) : new Decimal(0)
  let status = 'On Track'
  if (spent.gte(budget.amount)) {
    status = 'Over Budget'
  } else if (progress.gte(80)) {
    status = 'Near Limit'
  }
  return { ...budget, spent, remaining, progress, status }
}

async function listBudgets(userId, query) {
  const prisma = await getPrisma()
  const where = { userId }
  if (query.month) {
    where.month = integer(query.month, 'month', { min: 1, max: 12 })
  }
  if (query.year) {
    where.year = integer(query.year, 'year', { min: MIN_YEAR, max: MAX_YEAR })
  }
  const budgets = await prisma.budget.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  if (budgets.length === 0) {
    return []
  }
  const minMonth = Math.min(...budgets.map((budget) => budget.month))
  const minYear = Math.min(...budgets.filter((budget) => budget.month === minMonth).map((budget) => budget.year))
  const maxMonth = Math.max(...budgets.map((budget) => budget.month))
  const maxYear = Math.max(...budgets.filter((budget) => budget.month === maxMonth).map((budget) => budget.year))
  const rangeStart = new Date(Date.UTC(minYear, minMonth - 1, 1))
  const rangeEnd = new Date(Date.UTC(maxYear, maxMonth, 1))
  const spentRows = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      categoryId: { in: [...new Set(budgets.map((budget) => budget.categoryId))] },
      date: { gte: rangeStart, lt: rangeEnd },
    },
    select: { categoryId: true, date: true, amount: true },
  })
  const spentByKey = new Map()
  for (const row of spentRows) {
    const key = `${row.date.getUTCFullYear()}-${row.date.getUTCMonth() + 1}-${row.categoryId}`
    const previous = spentByKey.get(key)
    spentByKey.set(key, previous ? previous.plus(row.amount) : row.amount)
  }
  return Promise.all(
    budgets.map((budget) =>
      enrichBudgetWithSpent(budget, spentByKey.get(`${budget.year}-${budget.month}-${budget.categoryId}`)),
    ),
  )
}

async function getBudget(userId, id) {
  const prisma = await getPrisma()
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  if (!budget) {
    throw new AppError('Budget not found.', 404)
  }
  return enrichBudget(prisma, userId, budget)
}

async function createBudget(userId, body) {
  const prisma = await getPrisma()
  const input = parseBudgetInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  return prisma.budget.create({ data: { ...input, userId } })
}

async function updateBudget(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.budget.findFirst({ where: { id, userId }, select: { id: true } })
  if (!existing) {
    throw new AppError('Budget not found.', 404)
  }
  const input = parseBudgetInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  return prisma.budget.update({ where: { id }, data: input })
}

async function deleteBudget(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.budget.findFirst({ where: { id, userId }, select: { id: true } })
  if (!existing) {
    throw new AppError('Budget not found.', 404)
  }
  await prisma.budget.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  getBudgetSpent,
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
}