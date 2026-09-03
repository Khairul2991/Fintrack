const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { currentMonthYear, monthRange } = require('../utils/date')
const { runCatchUp } = require('./recurringTransactionService')
const { runBudgetRollover } = require('./recurringBudgetService')

async function hasUnreadOf(prisma, type, message) {
  const existing = await prisma.notification.findFirst({
    where: { type, message, read: false },
    select: { id: true },
  })
  return Boolean(existing)
}

async function createNotification(prisma, type, title, message) {
  if (await hasUnreadOf(prisma, type, message)) {
    return 0
  }
  await prisma.notification.create({ data: { type, title, message } })
  return 1
}

async function generateNotifications() {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()
  const stats = await Promise.all([
    runCatchUp().catch(() => ({ generated: 0, processed: 0 })),
    runBudgetRollover().catch(() => ({ rolled: 0, processed: 0 })),
  ])
  const catchUp = stats[0]
  const rollover = stats[1]

  let created = 0
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const recurrences = await prisma.recurringTransaction.findMany({
    where: { active: true },
    include: { category: { select: { name: true } } },
  })
  for (const item of recurrences) {
    const next = new Date(item.nextOccurrence)
    const isDue = next.getTime() <= today.getTime()
    if (isDue && item.endDate && next.getTime() > item.endDate.getTime()) continue
    if (isDue) {
      created += await createNotification(
        prisma,
        'RECURRING_DUE',
        'Recurring transaction due',
        `"${item.description}" is due in your ${item.category.name} category.`,
      )
    }
  }

  const { month, year } = currentMonthYear()
  const budgets = await prisma.budget.findMany({
    where: { month, year },
    include: { category: { select: { name: true } } },
  })
  for (const budget of budgets) {
    const range = monthRange(month, year)
    const agg = await prisma.transaction.aggregate({
      where: { type: 'EXPENSE', categoryId: budget.categoryId, date: { gte: range.gte, lt: range.lt } },
      _sum: { amount: true },
    })
    const spent = agg._sum.amount ?? new Decimal(0)
    if (spent.gt(budget.amount)) {
      created += await createNotification(
        prisma,
        'BUDGET_LIMIT',
        'Budget exceeded',
        `You have exceeded your ${budget.category.name} budget this month.`,
      )
    } else if (Number(budget.amount) > 0 && Number(spent) / Number(budget.amount) >= 0.8) {
      created += await createNotification(
        prisma,
        'BUDGET_LIMIT',
        'Approaching budget limit',
        `Your ${budget.category.name} budget is nearing its limit.`,
      )
    }
  }

  const goals = await prisma.goal.findMany({
    where: { status: 'IN_PROGRESS', targetDate: { not: null } },
  })
  for (const goal of goals) {
    const target = new Date(goal.targetDate)
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (daysLeft <= 30 && daysLeft > 0) {
      created += await createNotification(
        prisma,
        'GOAL_DEADLINE',
        'Goal deadline approaching',
        `Your financial goal "${goal.name}" is due in ${daysLeft} day(s).`,
      )
    }
  }

  const total = await prisma.notification.count({ where: { read: false } })
  return { created, unread: total, catchUp, rollover }
}

async function listNotifications() {
  const prisma = await getPrisma()
  const items = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  const unread = await prisma.notification.count({ where: { read: false } })
  return { items, unread }
}

async function markRead(id) {
  const prisma = await getPrisma()
  const existing = await prisma.notification.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Notification not found.', 404)
  }
  await prisma.notification.update({ where: { id }, data: { read: true } })
  return { id: Number(id) }
}

async function markAllRead() {
  const prisma = await getPrisma()
  await prisma.notification.updateMany({ data: { read: true } })
  return { marked: true }
}

module.exports = { generateNotifications, listNotifications, markRead, markAllRead }