const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, integer, amountString } = require('../utils/validate')
const { parseDateOnly } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists } = require('./accountService')

const NAME_MAX = 100
const DESC_MAX = 500

const GOAL_INCLUDE = {
  category: { select: { id: true, name: true, icon: true, color: true } },
  account: { select: { id: true, name: true, type: true } },
  activities: {
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      transaction: { select: { id: true, description: true, type: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  },
}

function parseGoalInput(body) {
  const name = requireText(body.name, 'Name')
  if (name.length > NAME_MAX) {
    throw new AppError(`Name must be at most ${NAME_MAX} characters.`, 400)
  }
  const targetAmount = amountString(body.targetAmount, 'Target amount')
  if (body.accountId === undefined || body.accountId === null || body.accountId === '') {
    throw new AppError('Account is required.', 400)
  }
  const accountId = integer(body.accountId, 'accountId')
  let categoryId = null
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    categoryId = integer(body.categoryId, 'categoryId')
  }
  let targetDate = null
  if (body.targetDate !== undefined && body.targetDate !== null && body.targetDate !== '') {
    targetDate = parseDateOnly(String(body.targetDate))
    if (!targetDate) {
      throw new AppError('Invalid target date. Use YYYY-MM-DD.', 400)
    }
  }
  let description = null
  if (body.description !== undefined && body.description !== null) {
    description = String(body.description).trim()
    if (description.length > DESC_MAX) {
      throw new AppError(`Description must be at most ${DESC_MAX} characters.`, 400)
    }
    if (description === '') description = null
  }
  return { name, description, targetAmount, categoryId, accountId, targetDate }
}

function computeCurrent(activities, Decimal) {
  let current = new Decimal(0)
  for (const activity of activities) {
    if (activity.type === 'CONTRIBUTION') {
      current = current.plus(activity.amount)
    } else {
      current = current.minus(activity.amount)
    }
  }
  return current.isNegative() ? new Decimal(0) : current
}

function deriveStatus(currentAmount, targetAmount) {
  return Number(currentAmount) >= Number(targetAmount) ? 'COMPLETED' : 'IN_PROGRESS'
}

function serialize(goal, Decimal) {
  const activities = goal.activities || []
  const current = computeCurrent(activities, Decimal)
  const status = deriveStatus(current, goal.targetAmount)
  const progress = new Decimal(goal.targetAmount).gt(0)
    ? current.div(goal.targetAmount).mul(100)
    : new Decimal(0)
  const remaining = new Decimal(goal.targetAmount).minus(current)
  return {
    ...goal,
    currentAmount: current,
    progress,
    remaining: remaining.isNegative() ? new Decimal(0) : remaining,
    status,
  }
}

async function listGoals(userId) {
  const prisma = await getPrisma()
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: GOAL_INCLUDE,
  })
  const Decimal = await getDecimal()
  return goals.map((goal) => serialize(goal, Decimal))
}

async function getGoal(userId, id) {
  const prisma = await getPrisma()
  const goal = await prisma.goal.findFirst({
    where: { id, userId },
    include: GOAL_INCLUDE,
  })
  if (!goal) {
    throw new AppError('Goal not found.', 404)
  }
  const Decimal = await getDecimal()
  return serialize(goal, Decimal)
}

async function createGoal(userId, body) {
  const prisma = await getPrisma()
  const input = parseGoalInput(body)
  if (input.categoryId) {
    await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  }
  await ensureAccountExists(prisma, userId, input.accountId, 400)
  const goal = await prisma.goal.create({
    data: {
      ...input,
      userId,
      currentAmount: '0',
      status: deriveStatus('0', input.targetAmount),
    },
  })
  return getGoal(userId, goal.id)
}

async function updateGoal(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.goal.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Goal not found.', 404)
  }
  const input = parseGoalInput(body)
  if (input.categoryId) {
    await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  }
  await ensureAccountExists(prisma, userId, input.accountId, 400)
  await prisma.goal.update({
    where: { id },
    data: { ...input },
  })
  return getGoal(userId, id)
}

async function deleteGoal(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.goal.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Goal not found.', 404)
  }
  await prisma.goal.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
}