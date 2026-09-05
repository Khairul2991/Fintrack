const { getPrisma, getDecimal } = require('../lib/prisma')
const { currentMonthYear } = require('../utils/date')
const { getMonthlySeries, getExpenseByCategory } = require('./reportService')
const { getBudgetSpent } = require('./budgetService')
const { runCatchUp } = require('./recurringTransactionService')
const { listAccounts } = require('./accountService')

async function buildInsights(prisma, userId) {
  const insights = []
  const { month, year } = currentMonthYear()

  const series = await getMonthlySeries(prisma, userId, 2)
  const current = series[series.length - 1]
  const previous = series.length > 1 ? series[series.length - 2] : null
  if (current && previous) {
    if (current.expense.gt(previous.expense)) {
      insights.push('Your expenses increased compared to last month.')
    } else if (current.expense.lt(previous.expense)) {
      insights.push('Your expenses decreased compared to last month.')
    }
  }

  const topThisMonth = await getExpenseByCategory(prisma, userId, { take: 1, month, year })
  if (topThisMonth.length > 0 && topThisMonth[0].total.gt(0)) {
    insights.push(`${topThisMonth[0].name} is your highest spending category this month.`)
  }

  const budgets = await prisma.budget.findMany({
    where: { month, year, userId },
    include: { category: { select: { name: true } } },
  })
  for (const budget of budgets) {
    const spent = await getBudgetSpent(prisma, userId, budget.categoryId, budget.month, budget.year)
    if (spent.gt(budget.amount)) {
      insights.push(`You have exceeded your ${budget.category.name} budget.`)
    }
  }

  return insights
}

async function getSummary(userId) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  await runCatchUp(userId)

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: 'INCOME', userId },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'EXPENSE', userId },
      _sum: { amount: true },
    }),
  ])
  const income = incomeAgg._sum.amount ?? new Decimal(0)
  const expense = expenseAgg._sum.amount ?? new Decimal(0)
  const balance = income.minus(expense)

  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 5,
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  })

  const [monthlySeries, expenseByCategory, insights, accounts] = await Promise.all([
    getMonthlySeries(prisma, userId, 6),
    getExpenseByCategory(prisma, userId, { take: 5 }),
    buildInsights(prisma, userId),
    listAccounts(userId),
  ])

  return {
    summary: { balance, income, expense },
    accounts,
    recentTransactions,
    monthlySeries,
    expenseByCategory,
    insights,
  }
}

module.exports = { getSummary }