const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { currentMonthYear, monthRange } = require('../utils/date')
const { createNotification } = require('./notificationStore')
const { runCatchUp } = require('./recurringTransactionService')
const { runBudgetRollover } = require('./recurringBudgetService')

// Per-user single-flight: the automatic scheduler, the manual "Check
// reminders" button, and retries must never run the same user's generation
// concurrently. Concurrent calls for one user join the in-flight run.
const inFlight = new Map()

async function generateNotifications(userId, options = {}) {
  const current = inFlight.get(userId)
  if (current) return current
  const run = performGeneration(userId, options).finally(() => inFlight.delete(userId))
  inFlight.set(userId, run)
  return run
}

async function performGeneration(userId, options = {}) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()
  const now = options.now instanceof Date ? options.now : new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let created = 0

  // Reminders for due recurring transactions are created by runCatchUp at the
  // moment it advances nextOccurrence (see generateDueTransactions). Running
  // the due check inside the catch-up transaction guarantees the reminder
  // cannot be skipped by any code path that advances nextOccurrence first
  // (e.g. a Dashboard or recurring-list visit that calls runCatchUp directly).
  const stats = await Promise.all([
    runCatchUp(userId, { now }).catch(() => ({ generated: 0, processed: 0, notified: 0 })),
    runBudgetRollover(userId).catch(() => ({ rolled: 0, processed: 0 })),
  ])
  const catchUp = stats[0]
  created += catchUp.notified || 0
  const rollover = stats[1]

  const { month, year } = currentMonthYear()
  const budgets = await prisma.budget.findMany({
    where: { month, year, userId },
    include: { category: { select: { name: true } } },
  })
  for (const budget of budgets) {
    const range = monthRange(month, year)
    const agg = await prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', categoryId: budget.categoryId, date: { gte: range.gte, lt: range.lt } },
      _sum: { amount: true },
    })
    const spent = agg._sum.amount ?? new Decimal(0)
    if (spent.gt(budget.amount)) {
      created += await createNotification(
        prisma,
        userId,
        'BUDGET_LIMIT',
        'Budget exceeded',
        `You have exceeded your ${budget.category.name} budget this month.`,
      )
    } else if (Number(budget.amount) > 0 && Number(spent) / Number(budget.amount) >= 0.8) {
      created += await createNotification(
        prisma,
        userId,
        'BUDGET_LIMIT',
        'Approaching budget limit',
        `Your ${budget.category.name} budget is nearing its limit.`,
      )
    }
  }

  const goals = await prisma.goal.findMany({
    where: { status: 'IN_PROGRESS', targetDate: { not: null }, userId },
  })
  for (const goal of goals) {
    const target = new Date(goal.targetDate)
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (daysLeft <= 30 && daysLeft > 0) {
      created += await createNotification(
        prisma,
        userId,
        'GOAL_DEADLINE',
        'Goal deadline approaching',
        `Your financial goal "${goal.name}" is due in ${daysLeft} day(s).`,
      )
    }
  }

  const total = await prisma.notification.count({ where: { read: false, userId } })
  return { created, unread: total, catchUp, rollover }
}

async function listNotifications(userId) {
  const prisma = await getPrisma()
  const items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
  const unread = await prisma.notification.count({ where: { read: false, userId } })
  return { items, unread }
}

async function markRead(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Notification not found.', 404)
  }
  await prisma.notification.update({ where: { id }, data: { read: true } })
  return { id: Number(id) }
}

async function markAllRead(userId) {
  const prisma = await getPrisma()
  await prisma.notification.updateMany({ where: { userId }, data: { read: true } })
  return { marked: true }
}

async function deleteNotification(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Notification not found.', 404)
  }
  await prisma.notification.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = { generateNotifications, listNotifications, markRead, markAllRead, deleteNotification }