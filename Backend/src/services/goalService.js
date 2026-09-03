const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, integer, amountString } = require('../utils/validate')
const { parseDateOnly } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists } = require('./accountService')

const NAME_MAX = 100
const DESC_MAX = 500

function parseGoalInput(body) {
  const name = requireText(body.name, 'Name')
  if (name.length > NAME_MAX) {
    throw new AppError(`Name must be at most ${NAME_MAX} characters.`, 400)
  }
  const targetAmount = amountString(body.targetAmount, 'Target amount')
  const current = body.currentAmount === undefined || body.currentAmount === null || body.currentAmount === ''
    ? '0'
    : amountString(body.currentAmount, 'Current amount')
  let categoryId = null
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    categoryId = integer(body.categoryId, 'categoryId')
  }
  let accountId = null
  if (body.accountId !== undefined && body.accountId !== null && body.accountId !== '') {
    accountId = integer(body.accountId, 'accountId')
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
  return { name, description, targetAmount, currentAmount: current, categoryId, accountId, targetDate }
}

function validateGoalAmounts(input) {
  if (Number(input.currentAmount) > Number(input.targetAmount)) {
    throw new AppError('Current amount cannot exceed the target amount.', 400)
  }
}

function deriveStatus(currentAmount, targetAmount) {
  return Number(currentAmount) >= Number(targetAmount) ? 'COMPLETED' : 'IN_PROGRESS'
}

function serialize(goal, Decimal) {
  const progress = new Decimal(goal.targetAmount).gt(0)
    ? new Decimal(goal.currentAmount).div(goal.targetAmount).mul(100)
    : new Decimal(0)
  const remaining = new Decimal(goal.targetAmount).minus(goal.currentAmount)
  return {
    ...goal,
    progress: progress,
    remaining: remaining,
    status: goal.status,
  }
}

async function enrichGoal(prisma, goal) {
  const Decimal = await getDecimal()
  return serialize(goal, Decimal)
}

async function listGoals() {
  const prisma = await getPrisma()
  const goals = await prisma.goal.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  const Decimal = await getDecimal()
  return Promise.all(goals.map((goal) => serialize(goal, Decimal)))
}

async function getGoal(id) {
  const prisma = await getPrisma()
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  if (!goal) {
    throw new AppError('Goal not found.', 404)
  }
  return enrichGoal(prisma, goal)
}

async function createGoal(body) {
  const prisma = await getPrisma()
  const input = parseGoalInput(body)
  validateGoalAmounts(input)
  if (input.categoryId) {
    await ensureCategoryExists(prisma, input.categoryId, 400)
  }
  if (input.accountId) {
    await ensureAccountExists(prisma, input.accountId, 400)
  }
  const goal = await prisma.goal.create({
    data: {
      ...input,
      status: deriveStatus(input.currentAmount, input.targetAmount),
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  return enrichGoal(prisma, goal)
}

async function updateGoal(id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.goal.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Goal not found.', 404)
  }
  const input = parseGoalInput(body)
  validateGoalAmounts(input)
  if (input.categoryId) {
    await ensureCategoryExists(prisma, input.categoryId, 400)
  }
  if (input.accountId) {
    await ensureAccountExists(prisma, input.accountId, 400)
  }
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...input,
      status: deriveStatus(input.currentAmount, input.targetAmount),
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  return enrichGoal(prisma, goal)
}

async function updateGoalProgress(id, currentAmount) {
  const prisma = await getPrisma()
  const existing = await prisma.goal.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('Goal not found.', 404)
  }
  const amount = amountString(currentAmount, 'Current amount')
  if (Number(amount) > Number(existing.targetAmount)) {
    throw new AppError('Current amount cannot exceed the target amount.', 400)
  }
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      currentAmount: amount,
      status: deriveStatus(amount, existing.targetAmount),
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  return enrichGoal(prisma, goal)
}

async function deleteGoal(id) {
  const prisma = await getPrisma()
  const existing = await prisma.goal.findUnique({ where: { id } })
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
  updateGoalProgress,
  deleteGoal,
}