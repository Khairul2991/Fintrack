const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange } = require('../utils/date')

const MONTH_COUNT = 12

async function getMonthlySeries(prisma, userId, count) {
  const Decimal = await getDecimal()
  const starts = lastNMonthStarts(count)
  const rows = []
  for (const start of starts) {
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    const grouped = await prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const incomeRow = grouped.find((row) => row.type === 'INCOME')
    const expenseRow = grouped.find((row) => row.type === 'EXPENSE')
    rows.push({
      month: monthKey(start),
      income: incomeRow ? incomeRow._sum.amount : new Decimal(0),
      expense: expenseRow ? expenseRow._sum.amount : new Decimal(0),
    })
  }
  return rows
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
    where: { id: { in: grouped.map((row) => row.categoryId) }, userId },
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