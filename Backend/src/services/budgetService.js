const { getPrisma, getDecimal } = require('../lib/prisma')
const { integer, amountString } = require('../utils/validate')
const { AppError } = require('../utils/appError')
const { monthRange, MIN_YEAR, MAX_YEAR } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')

async function getBudgetSpent(prisma, categoryId, month, year) {
  const Decimal = await getDecimal()
  const range = monthRange(month, year)
  const agg = await prisma.transaction.aggregate({
    where: { type: 'EXPENSE', categoryId, date: { gte: range.gte, lt: range.lt } },
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

async function enrichBudget(prisma, budget) {
  const Decimal = await getDecimal()
  const spent = await getBudgetSpent(prisma, budget.categoryId, budget.month, budget.year)
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

async function listBudgets(query) {
  const prisma = await getPrisma()
  const where = {}
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
  return Promise.all(budgets.map((budget) => enrichBudget(prisma, budget)))
}

async function getBudget(id) {
  const prisma = await getPrisma()
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  if (!budget) {
    throw new AppError('Budget not found.', 404)
  }
  return enrichBudget(prisma, budget)
}

async function createBudget(body) {
  const prisma = await getPrisma()
  const input = parseBudgetInput(body)
  await ensureCategoryExists(prisma, input.categoryId, 400)
  return prisma.budget.create({ data: input })
}

async function updateBudget(id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.budget.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new AppError('Budget not found.', 404)
  }
  const input = parseBudgetInput(body)
  await ensureCategoryExists(prisma, input.categoryId, 400)
  return prisma.budget.update({ where: { id }, data: input })
}

async function deleteBudget(id) {
  const prisma = await getPrisma()
  const existing = await prisma.budget.findUnique({ where: { id }, select: { id: true } })
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