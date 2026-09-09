const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, integer, amountString } = require('../utils/validate')
const { parseDateOnly } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists, ensureCashAccount } = require('./accountService')

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500
const TYPES = ['INCOME', 'EXPENSE']

function parseTransactionInput(body) {
  const description = requireText(body.description, 'Description')
  if (description.length > DESCRIPTION_MAX) {
    throw new AppError(`Description must be at most ${DESCRIPTION_MAX} characters.`, 400)
  }
  const amount = amountString(body.amount)
  const type = requireText(body.type, 'Type')
  if (!TYPES.includes(type)) {
    throw new AppError('Type must be INCOME or EXPENSE.', 400)
  }
  const categoryId = integer(body.categoryId, 'categoryId')
  let accountId = null
  if (body.accountId !== undefined && body.accountId !== null && body.accountId !== '') {
    accountId = integer(body.accountId, 'accountId')
  }
  let goalId = null
  if (body.goalId !== undefined && body.goalId !== null && body.goalId !== '') {
    goalId = integer(body.goalId, 'goalId')
  }
  const rawDate = requireText(body.date, 'Date')
  const date = parseDateOnly(rawDate)
  if (!date) {
    throw new AppError('Invalid date. Use YYYY-MM-DD.', 400)
  }
  let note = null
  if (body.note !== undefined && body.note !== null) {
    note = String(body.note).trim()
    if (note.length > NOTE_MAX) {
      throw new AppError(`Note must be at most ${NOTE_MAX} characters.`, 400)
    }
    if (note === '') note = null
  }
  return { description, amount, type, categoryId, accountId, goalId, date, note }
}

function activityTypeFor(type) {
  return type === 'INCOME' ? 'CONTRIBUTION' : 'WITHDRAWAL'
}

async function ensureGoalOwnedAndMatching(prisma, userId, goalId, accountId) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true, accountId: true },
  })
  if (!goal) {
    throw new AppError('Goal not found.', 404)
  }
  if (!goal.accountId) {
    throw new AppError('This goal does not have an account. Edit the goal to set an account first.', 400)
  }
  if (goal.accountId !== accountId) {
    throw new AppError('Goal account must match the transaction account.', 400)
  }
  return goal.id
}

async function syncGoalProgress(tx, goalId) {
  const Decimal = await getDecimal()
  const [activities, goal] = await Promise.all([
    tx.goalActivity.findMany({
      where: { goalId },
      select: { type: true, amount: true },
    }),
    tx.goal.findUnique({
      where: { id: goalId },
      select: { targetAmount: true },
    }),
  ])
  if (!goal) return
  let current = new Decimal(0)
  for (const activity of activities) {
    current = activity.type === 'CONTRIBUTION'
      ? current.plus(activity.amount)
      : current.minus(activity.amount)
  }
  if (current.isNegative()) current = new Decimal(0)
  const status = Number(current) >= Number(goal.targetAmount) ? 'COMPLETED' : 'IN_PROGRESS'
  await tx.goal.update({
    where: { id: goalId },
    data: { currentAmount: String(current), status },
  })
}

function activityDataFor(input) {
  return {
    accountId: input.accountId,
    type: activityTypeFor(input.type),
    amount: input.amount,
    date: input.date,
    note: input.note,
  }
}

async function listTransactions(userId, query) {
  const prisma = await getPrisma()
  const where = { userId }

  if (query.search && typeof query.search === 'string') {
    const search = query.search.trim()
    if (search) {
      where.description = { contains: search, mode: 'insensitive' }
    }
  }

  if (query.type) {
    if (!TYPES.includes(query.type)) {
      throw new AppError('Type must be INCOME or EXPENSE.', 400)
    }
    where.type = query.type
  }

  if (query.categoryId) {
    const categoryId = integer(query.categoryId, 'categoryId')
    await ensureCategoryOwnedBy(prisma, userId, categoryId)
    where.categoryId = categoryId
  }

  if (query.accountId) {
    const accountId = integer(query.accountId, 'accountId')
    await ensureAccountOwnedBy(prisma, userId, accountId)
    where.accountId = accountId
  }

  if (query.startDate) {
    const from = parseDateOnly(query.startDate)
    if (!from) throw new AppError('Invalid startDate. Use YYYY-MM-DD.', 400)
    where.date = where.date || {}
    where.date.gte = from
  }

  if (query.endDate) {
    const to = parseDateOnly(query.endDate)
    if (!to) throw new AppError('Invalid endDate. Use YYYY-MM-DD.', 400)
    where.date = where.date || {}
    where.date.lte = new Date(to.getTime() + 86399999)
  }

  const SORTABLE = { date: 'date', amount: 'amount' }
  const sortBy = query.sortBy ? SORTABLE[query.sortBy] : 'date'
  if (query.sortBy && !sortBy) {
    throw new AppError('sortBy must be date or amount.', 400)
  }
  let sortOrder = 'desc'
  if (query.sortOrder) {
    if (query.sortOrder !== 'asc' && query.sortOrder !== 'desc') {
      throw new AppError('sortOrder must be asc or desc.', 400)
    }
    sortOrder = query.sortOrder
  }

  const page = query.page ? integer(query.page, 'page', { min: 1 }) : 1
  const limit = query.limit ? integer(query.limit, 'limit', { min: 1, max: 100 }) : 10

  const [total, data] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { id: true, name: true, type: true } },
        goal: { select: { id: true, name: true } },
      },
    }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

async function getTransaction(userId, id) {
  const prisma = await getPrisma()
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
      goal: { select: { id: true, name: true } },
    },
  })
  if (!transaction) {
    throw new AppError('Transaction not found.', 404)
  }
  return transaction
}

async function ensureCategoryOwnedBy(prisma, userId, categoryId) {
  await ensureCategoryExists(prisma, userId, categoryId, 400)
}

async function ensureCategoryTypeMatches(prisma, categoryId, type) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, type: true },
  })
  if (category && category.type !== type) {
    throw new AppError('Category type must match the transaction type.', 400)
  }
}

async function ensureAccountOwnedBy(prisma, userId, accountId) {
  await ensureAccountExists(prisma, userId, accountId, 400)
}

async function resolveAccountId(prisma, userId, accountId) {
  let resolved = accountId
  if (!resolved) {
    const cash = await ensureCashAccount(prisma, userId)
    resolved = cash.id
  }
  await ensureAccountExists(prisma, userId, resolved, 400)
  return resolved
}

async function createTransaction(userId, body) {
  const prisma = await getPrisma()
  const input = parseTransactionInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  await ensureCategoryTypeMatches(prisma, input.categoryId, input.type)
  input.accountId = await resolveAccountId(prisma, userId, input.accountId)
  if (input.goalId) {
    await ensureGoalOwnedAndMatching(prisma, userId, input.goalId, input.accountId)
  }
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({ data: { ...input, userId } })
    if (input.goalId) {
      await tx.goalActivity.create({
        data: {
          goalId: input.goalId,
          transactionId: transaction.id,
          ...activityDataFor(input),
        },
      })
      await syncGoalProgress(tx, input.goalId)
    }
    return transaction
  })
}

async function updateTransaction(userId, id, body) {
  const prisma = await getPrisma()
  await getTransaction(userId, id)
  const input = parseTransactionInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  await ensureCategoryTypeMatches(prisma, input.categoryId, input.type)
  input.accountId = await resolveAccountId(prisma, userId, input.accountId)
  if (input.goalId) {
    await ensureGoalOwnedAndMatching(prisma, userId, input.goalId, input.accountId)
  }
  const nextGoalId = input.goalId
  return prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({ where: { id }, data: input })
    const linked = await tx.goalActivity.findFirst({
      where: { transactionId: id },
      select: { id: true, goalId: true },
    })
    if (!linked) {
      if (nextGoalId) {
        await tx.goalActivity.create({
          data: {
            goalId: nextGoalId,
            transactionId: id,
            ...activityDataFor(input),
          },
        })
        await syncGoalProgress(tx, nextGoalId)
      }
      return updated
    }
    if (linked.goalId === nextGoalId) {
      await tx.goalActivity.update({
        where: { id: linked.id },
        data: activityDataFor(input),
      })
      await syncGoalProgress(tx, nextGoalId)
      return updated
    }
    await tx.goalActivity.delete({ where: { id: linked.id } })
    await syncGoalProgress(tx, linked.goalId)
    if (nextGoalId) {
      await tx.goalActivity.create({
        data: {
          goalId: nextGoalId,
          transactionId: id,
          ...activityDataFor(input),
        },
      })
      await syncGoalProgress(tx, nextGoalId)
    }
    return updated
  })
}

async function deleteTransaction(userId, id) {
  const prisma = await getPrisma()
  await getTransaction(userId, id)
  await prisma.transaction.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
}