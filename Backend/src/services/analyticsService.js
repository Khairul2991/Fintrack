const { getPrisma, getDecimal } = require('../lib/prisma')
const { lastNMonthStarts, monthKey, monthRange, currentMonthYear } = require('../utils/date')

const MONTH_COUNT = 12

function safePct(numerator, denominator) {
  const num = Number(numerator)
  const den = Number(denominator)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0
  return (num / den) * 100
}

async function getAnalytics(userId) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  const starts = lastNMonthStarts(MONTH_COUNT)
  const { month: curMonth, year: curYear } = currentMonthYear()
  const currentRange = monthRange(curMonth, curYear)

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      select: { id: true, description: true, date: true, type: true, amount: true, categoryId: true },
    }),
    prisma.budget.findMany({ where: { month: curMonth, year: curYear, userId } }),
  ])

  const byMonth = new Map()
  const spentByCategory = new Map()
  const spentByCategoryForMonth = new Map()

  let txnTotal = new Decimal(0)
  let largest = null

  for (const transaction of transactions) {
    txnTotal = txnTotal.plus(transaction.amount)

    if (!largest || transaction.amount.gt(largest.amount)) {
      largest = transaction
    }

    const typeKey = transaction.type === 'INCOME' ? 'income' : 'expense'
    const key = monthKey(transaction.date)
    const bucket = byMonth.get(key) || { income: new Decimal(0), expense: new Decimal(0) }
    bucket[typeKey] = bucket[typeKey].plus(transaction.amount)
    byMonth.set(key, bucket)

    if (transaction.type === 'EXPENSE') {
      const currentTotal = spentByCategory.get(transaction.categoryId)
      spentByCategory.set(transaction.categoryId, currentTotal ? currentTotal.plus(transaction.amount) : new Decimal(transaction.amount))
      if (transaction.date >= currentRange.gte && transaction.date < currentRange.lt) {
        const monthTotal = spentByCategoryForMonth.get(transaction.categoryId)
        spentByCategoryForMonth.set(transaction.categoryId, monthTotal ? monthTotal.plus(transaction.amount) : new Decimal(transaction.amount))
      }
    }
  }

  const months = starts.map((start) => {
    const bucket = byMonth.get(monthKey(start))
    return {
      month: monthKey(start),
      income: bucket ? bucket.income : new Decimal(0),
      expense: bucket ? bucket.expense : new Decimal(0),
    }
  })
  const withNet = months.map((month) => ({
    ...month,
    net: month.income.minus(month.expense),
  }))

  const expenseTransactions = transactions.filter((row) => row.type === 'EXPENSE')

  const totalIncome = months.reduce((sum, m) => sum.plus(m.income), new Decimal(0))
  const totalExpense = months.reduce((sum, m) => sum.plus(m.expense), new Decimal(0))
  const netCashFlow = totalIncome.minus(totalExpense)

  const monthsWithData = months.filter((m) => m.income.gt(0) || m.expense.gt(0))
  const avgMonthlyExpense =
    monthsWithData.length > 0
      ? monthsWithData.reduce((sum, m) => sum.plus(m.expense), new Decimal(0)).div(monthsWithData.length)
      : new Decimal(0)

  const txnCount = transactions.length
  const avgTransactionAmount = txnCount > 0 ? txnTotal.div(txnCount) : new Decimal(0)

  const topCategories = [...spentByCategory.entries()]
    .sort((a, b) => b[1].cmp(a[1]))
    .slice(0, 5)
    .map(([categoryId, total]) => ({ categoryId, total }))

  const categoryIds = [
    ...new Set([
      ...topCategories.map((entry) => entry.categoryId),
      ...(largest ? [largest.categoryId] : []),
    ].filter((id) => id !== null)),
  ]
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: categoryIds }, OR: [{ isSystem: true }, { userId }] } })
    : []
  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  const expenseByCategory = topCategories.map((entry) => {
    const category = categoriesById.get(entry.categoryId)
    return {
      categoryId: entry.categoryId,
      name: category ? category.name : '',
      icon: category ? category.icon : '',
      color: category ? category.color : '',
      total: entry.total,
    }
  })
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
  if (largest) {
    const largestCategory = largest.categoryId !== null ? categoriesById.get(largest.categoryId) : null
    largestTransaction = {
      id: largest.id,
      description: largest.description,
      amount: largest.amount,
      type: largest.type,
      date: largest.date.toISOString().slice(0, 10),
      category: largestCategory || null,
    }
  }

  const budgetUtilization = budgets.map((budget) => {
    const spent = spentByCategoryForMonth.get(budget.categoryId) ?? new Decimal(0)
    return {
      categoryId: budget.categoryId,
      amount: budget.amount,
      spent,
      utilization: Number(budget.amount) > 0 ? Number(spent) / Number(budget.amount) : 0,
    }
  })
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