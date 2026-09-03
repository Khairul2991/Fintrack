const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange, currentMonthYear } = require('../utils/date')
const { getMonthlySeries, getExpenseByCategory } = require('./reportService')

const MONTH_COUNT = 12

function safePct(numerator, denominator) {
  const num = Number(numerator)
  const den = Number(denominator)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0
  return (num / den) * 100
}

async function getAnalytics() {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  const starts = lastNMonthStarts(MONTH_COUNT)
  const months = await getMonthlySeries(prisma, MONTH_COUNT)
  const withNet = months.map((month) => ({
    ...month,
    net: month.income.minus(month.expense),
  }))

  const transactions = await prisma.transaction.findMany({ select: { amount: true } })
  const expenseTransactions = await prisma.transaction.findMany({
    where: { type: 'EXPENSE' },
    select: { amount: true },
  })

  const totalIncome = months.reduce((sum, m) => sum.plus(m.income), new Decimal(0))
  const totalExpense = months.reduce((sum, m) => sum.plus(m.expense), new Decimal(0))
  const netCashFlow = totalIncome.minus(totalExpense)

  const monthsWithData = months.filter((m) => m.income.gt(0) || m.expense.gt(0))
  const avgMonthlyExpense =
    monthsWithData.length > 0
      ? monthsWithData.reduce((sum, m) => sum.plus(m.expense), new Decimal(0)).div(monthsWithData.length)
      : new Decimal(0)

  const txnCount = transactions.length
  const txnTotal = transactions.reduce((sum, t) => sum.plus(t.amount), new Decimal(0))
  const avgTransactionAmount = txnCount > 0 ? txnTotal.div(txnCount) : new Decimal(0)

  const expenseByCategory = await getExpenseByCategory(prisma, { take: 5 })
  const highest = expenseByCategory.length > 0 ? expenseByCategory[0] : null
  const spendingConcentration = highest ? safePct(highest.total, totalExpense) : 0

  const current = months[months.length - 1]
  const previous = months[months.length - 2]
  const monthOverMonthChange =
    current && previous && previous.expense.gt(0)
      ? current.expense.minus(previous.expense).div(previous.expense).mul(100)
      : null

  const savingsRate =
    current && current.income.gt(0)
      ? current.income.minus(current.expense).div(current.income).mul(100)
      : null

  let largestTransaction = null
  const largest = await prisma.transaction.findFirst({
    orderBy: { amount: 'desc' },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  if (largest) {
    largestTransaction = {
      id: largest.id,
      description: largest.description,
      amount: largest.amount,
      type: largest.type,
      date: largest.date.toISOString().slice(0, 10),
      category: largest.category,
    }
  }

  const { month: curMonth, year: curYear } = currentMonthYear()
  const budgets = await prisma.budget.findMany({ where: { month: curMonth, year: curYear } })
  const budgetUtilization = []
  for (const budget of budgets) {
    const range = monthRange(curMonth, curYear)
    const agg = await prisma.transaction.aggregate({
      where: { type: 'EXPENSE', categoryId: budget.categoryId, date: { gte: range.gte, lt: range.lt } },
      _sum: { amount: true },
    })
    const spent = agg._sum.amount ?? new Decimal(0)
    budgetUtilization.push({
      categoryId: budget.categoryId,
      amount: budget.amount,
      spent,
      utilization: Number(budget.amount) > 0 ? Number(spent) / Number(budget.amount) : 0,
    })
  }
  const avgBudgetUtilization =
    budgetUtilization.length > 0
      ? budgetUtilization.reduce((sum, b) => sum + b.utilization, 0) / budgetUtilization.length
      : 0

  return {
    period: {
      start: starts[0].toISOString().slice(0, 7),
      end: starts[starts.length - 1].toISOString().slice(0, 7),
      months: MONTH_COUNT,
    },
    totalIncome,
    totalExpense,
    netCashFlow,
    avgMonthlyExpense,
    avgTransactionAmount,
    averageTransactionsPerMonth: txnCount / MONTH_COUNT,
    transactionCount: txnCount,
    expenseTransactionCount: expenseTransactions.length,
    highestSpendingCategory: highest,
    spendingConcentration,
    monthOverMonthChange,
    savingsRate,
    largestTransaction,
    monthlyTrend: withNet,
    budgetUtilizationTrend: {
      count: budgetUtilization.length,
      averageUtilization: avgBudgetUtilization,
      budgets: budgetUtilization,
    },
  }
}

module.exports = { getAnalytics }