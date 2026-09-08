const { getPrisma, getDecimal } = require('../lib/prisma')
const { currentMonthYear, monthRange, lastNMonthStarts, monthKey } = require('../utils/date')
const { runCatchUp } = require('./recurringTransactionService')

function buildInsights({ series, topThisMonth, budgetMessages }) {
  const insights = []
  const current = series[series.length - 1]
  const previous = series.length > 1 ? series[series.length - 2] : null
  if (current && previous) {
    if (current.expense.gt(previous.expense)) {
      insights.push('Your expenses increased compared to last month.')
    } else if (current.expense.lt(previous.expense)) {
      insights.push('Your expenses decreased compared to last month.')
    }
  }

  if (topThisMonth && topThisMonth.total.gt(0)) {
    insights.push(`${topThisMonth.name} is your highest spending category this month.`)
  }

  return insights.concat(budgetMessages)
}

async function getSummary(userId) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()

  await runCatchUp(userId)

  const { month: curMonth, year: curYear } = currentMonthYear()
  const currentRange = monthRange(curMonth, curYear)

  const [transactions, budgets, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      select: { id: true, description: true, date: true, type: true, amount: true, categoryId: true, accountId: true },
    }),
    prisma.budget.findMany({
      where: { month: curMonth, year: curYear, userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.account.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])

  let income = new Decimal(0)
  let expense = new Decimal(0)
  const byMonth = new Map()
  const spentByCategory = new Map()
  const accountTotals = new Map()
  const spentByCategoryForMonth = new Map()

  for (const transaction of transactions) {
    if (transaction.type === 'INCOME') {
      income = income.plus(transaction.amount)
    } else {
      expense = expense.plus(transaction.amount)
      const currentTotal = spentByCategory.get(transaction.categoryId)
      spentByCategory.set(transaction.categoryId, currentTotal ? currentTotal.plus(transaction.amount) : new Decimal(transaction.amount))
      if (transaction.date >= currentRange.gte && transaction.date < currentRange.lt) {
        const monthTotal = spentByCategoryForMonth.get(transaction.categoryId)
        spentByCategoryForMonth.set(transaction.categoryId, monthTotal ? monthTotal.plus(transaction.amount) : new Decimal(transaction.amount))
      }
    }

    const key = monthKey(transaction.date)
    const bucket = byMonth.get(key) || { income: new Decimal(0), expense: new Decimal(0) }
    if (transaction.type === 'INCOME') {
      bucket.income = bucket.income.plus(transaction.amount)
    } else {
      bucket.expense = bucket.expense.plus(transaction.amount)
    }
    byMonth.set(key, bucket)

    if (transaction.accountId !== null) {
      const accountEntry = accountTotals.get(transaction.accountId) || { income: new Decimal(0), expense: new Decimal(0) }
      if (transaction.type === 'INCOME') {
        accountEntry.income = accountEntry.income.plus(transaction.amount)
      } else {
        accountEntry.expense = accountEntry.expense.plus(transaction.amount)
      }
      accountTotals.set(transaction.accountId, accountEntry)
    }
  }

  const starts = lastNMonthStarts(6)
  const monthlySeries = starts.map((start) => {
    const bucket = byMonth.get(monthKey(start))
    return {
      month: monthKey(start),
      income: bucket ? bucket.income : new Decimal(0),
      expense: bucket ? bucket.expense : new Decimal(0),
    }
  })

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5)

  const expenseByCategory = [...spentByCategory.entries()]
    .sort((a, b) => b[1].cmp(a[1]))
    .slice(0, 5)
    .map(([categoryId, total]) => ({ categoryId, total }))

  const categoryIds = [
    ...new Set([
      ...recentTransactions.map((transaction) => transaction.categoryId),
      ...expenseByCategory.map((entry) => entry.categoryId),
    ].filter((id) => id !== null)),
  ]
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: categoryIds }, OR: [{ isSystem: true }, { userId }] } })
    : []
  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  const recentWithCategory = recentTransactions.map((transaction) => ({
    ...transaction,
    category: transaction.categoryId !== null ? categoriesById.get(transaction.categoryId) || null : null,
  }))

  const expenseByCategoryResult = expenseByCategory.map((entry) => {
    const category = categoriesById.get(entry.categoryId)
    return {
      categoryId: entry.categoryId,
      name: category ? category.name : '',
      icon: category ? category.icon : '',
      color: category ? category.color : '',
      total: entry.total,
    }
  })

  const topThisMonth = [...spentByCategoryForMonth.entries()]
    .map(([categoryId, total]) => ({
      name: categoriesById.get(categoryId)?.name ?? '',
      total,
    }))
    .sort((a, b) => b.total.cmp(a.total))[0] || null

  const budgetMessages = []
  for (const budget of budgets) {
    const spent = spentByCategoryForMonth.get(budget.categoryId) ?? new Decimal(0)
    if (spent.gt(budget.amount)) {
      budgetMessages.push(`You have exceeded your ${budget.category.name} budget.`)
    }
  }

  const insights = buildInsights({
    series: monthlySeries,
    topThisMonth,
    budgetMessages,
  })

  const accountList = accounts.map((account) => {
    const totals = accountTotals.get(account.id) || { income: new Decimal(0), expense: new Decimal(0) }
    const balance = new Decimal(account.initialBalance).plus(totals.income).minus(totals.expense)
    return { ...account, income: totals.income, expense: totals.expense, balance }
  })

  const balance = accountList.reduce((sum, account) => sum.plus(account.balance), new Decimal(0))

  return {
    summary: { balance, income, expense },
    accounts: accountList,
    recentTransactions: recentWithCategory,
    monthlySeries,
    expenseByCategory: expenseByCategoryResult,
    insights,
  }
}

module.exports = { getSummary }