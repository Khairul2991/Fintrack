const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange } = require('../utils/date')

const MONTH_COUNT = 12

async function getMonthlySeries(prisma, userId, count) {
  const Decimal = await getDecimal()
  const starts = lastNMonthStarts(count)
  const rangeEnd = new Date(Date.UTC(
    starts[starts.length - 1].getUTCFullYear(),
    starts[starts.length - 1].getUTCMonth() + 1,
    1,
  ))
  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: starts[0], lt: rangeEnd } },
    select: { date: true, type: true, amount: true },
  })
  const buckets = new Map()
  for (const row of transactions) {
    const key = `${row.date.getUTCFullYear()}-${String(row.date.getUTCMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key) || { income: new Decimal(0), expense: new Decimal(0) }
    if (row.type === 'INCOME') {
      bucket.income = bucket.income.plus(row.amount)
    } else {
      bucket.expense = bucket.expense.plus(row.amount)
    }
    buckets.set(key, bucket)
  }
  return starts.map((start) => {
    const bucket = buckets.get(monthKey(start))
    return {
      month: monthKey(start),
      income: bucket ? bucket.income : new Decimal(0),
      expense: bucket ? bucket.expense : new Decimal(0),
    }
  })
}

async function getExpenseByCategory(prisma, userId, { take = null, month = null, year = null } = {}) {
  const where = { type: 'EXPENSE', userId }
  if (month && year) {
    const range = monthRange(month, year)
    where.date = { gte: range.gte, lt: range.lt }
  }
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    ...(take ? { take } : {}),
  })
  if (grouped.length === 0) {
    return []
  }
  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((row) => row.categoryId) }, OR: [{ isSystem: true }, { userId }] },
  })
  const byId = new Map(categories.map((category) => [category.id, category]))
  return grouped.map((row) => {
    const category = byId.get(row.categoryId)
    return {
      categoryId: row.categoryId,
      name: category ? category.name : '',
      icon: category ? category.icon : '',
      color: category ? category.color : '',
      total: row._sum.amount,
    }
  })
}

async function getMonthlyReport(userId) {
  const prisma = await getPrisma()
  const months = await getMonthlySeries(prisma, userId, MONTH_COUNT)
  const result = months.map((month, index) => {
    const previous = months[index - 1]
    return {
      ...month,
      incomeDelta: previous ? month.income.minus(previous.income) : null,
      expenseDelta: previous ? month.expense.minus(previous.expense) : null,
    }
  })
  return { months: result }
}

async function getCategoryReport(userId) {
  const prisma = await getPrisma()
  const categories = await getExpenseByCategory(prisma, userId)
  const highest = categories.length > 0 ? categories[0] : null
  return { categories, highest }
}

module.exports = {
  getMonthlySeries,
  getExpenseByCategory,
  getMonthlyReport,
  getCategoryReport,
}