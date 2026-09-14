const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, integer, amountString } = require('../utils/validate')
const { parseDateOnly, parseTransactionDate } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists, ensureActiveAccount, ensureCashAccount } = require('./accountService')
const { getTransferFlow } = require('./transferBalance')

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500
const TYPES = ['INCOME', 'EXPENSE', 'TRANSFER']

function parseTransactionInput(body) {
  const description = requireText(body.description, 'Description')
  if (description.length > DESCRIPTION_MAX) {
    throw new AppError(`Description must be at most ${DESCRIPTION_MAX} characters.`, 400)
  }
  const amount = amountString(body.amount)
  const type = requireText(body.type, 'Type')
  if (!TYPES.includes(type)) {
    throw new AppError('Type must be INCOME, EXPENSE, or TRANSFER.', 400)
  }
  let categoryId = null
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    categoryId = integer(body.categoryId, 'categoryId')
  }
  let accountId = null
  if (body.accountId !== undefined && body.accountId !== null && body.accountId !== '') {
    accountId = integer(body.accountId, 'accountId')
  }
  let transferAccountId = null
  if (body.transferAccountId !== undefined && body.transferAccountId !== null && body.transferAccountId !== '') {
    transferAccountId = integer(body.transferAccountId, 'transferAccountId')
  }
  let goalId = null
  if (body.goalId !== undefined && body.goalId !== null && body.goalId !== '') {
    goalId = integer(body.goalId, 'goalId')
  }
  let sourceGoalId = null
  if (body.sourceGoalId !== undefined && body.sourceGoalId !== null && body.sourceGoalId !== '') {
    sourceGoalId = integer(body.sourceGoalId, 'sourceGoalId')
  }
  if (type === 'TRANSFER') {
    if (categoryId !== null) {
      throw new AppError('Transfer cannot have a category.', 400)
    }
    if (transferAccountId === null) {
      throw new AppError('Transfer destination account is required.', 400)
    }
    if (accountId !== null && transferAccountId === accountId) {
      throw new AppError('Transfer source and destination must be different.', 400)
    }
    if (sourceGoalId !== null && sourceGoalId === goalId) {
      throw new AppError('Source goal and destination goal must be different.', 400)
    }
  } else if (transferAccountId !== null) {
    throw new AppError('Transfer destination is only allowed for TRANSFER transactions.', 400)
  } else if (sourceGoalId !== null) {
    throw new AppError('Source goal is only allowed for TRANSFER transactions.', 400)
  } else if (categoryId === null) {
    throw new AppError('categoryId must be an integer.', 400)
  }
  const rawDate = requireText(body.date, 'Date')
  const date = parseTransactionDate(rawDate)
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
  return { description, amount, type, categoryId, accountId, transferAccountId, goalId, sourceGoalId, date, note }
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

async function currentGoalAmount(prisma, goalId) {
  const Decimal = await getDecimal()
  const activities = await prisma.goalActivity.findMany({
    where: { goalId },
    select: { type: true, amount: true },
  })
  let current = new Decimal(0)
  for (const activity of activities) {
    current = activity.type === 'CONTRIBUTION'
      ? current.plus(activity.amount)
      : current.minus(activity.amount)
  }
  return current.isNegative() ? new Decimal(0) : current
}

async function resolveExplicitSourceGoal(prisma, userId, sourceGoalId, accountId, amount) {
  await ensureGoalOwnedAndMatching(prisma, userId, sourceGoalId, accountId)
  const allocation = await currentGoalAmount(prisma, sourceGoalId)
  const Decimal = await getDecimal()
  if (new Decimal(amount).gt(allocation)) {
    throw new AppError('The transfer amount exceeds the selected source goal balance.', 400)
  }
  return { id: sourceGoalId, withdrawal: amount }
}

async function autoResolveSourceGoal(prisma, userId, accountId, amount, available) {
  const Decimal = await getDecimal()
  const funded = await prisma.goal.findMany({
    where: { userId, accountId, currentAmount: { gt: 0 } },
    select: { id: true, currentAmount: true },
  })
  if (funded.length === 0) return null
  const allocation = funded.reduce(
    (sum, goal) => sum.plus(new Decimal(goal.currentAmount)),
    new Decimal(0),
  )
  const unallocated = new Decimal(available).minus(allocation)
  const shortfall = new Decimal(amount).minus(unallocated)
  if (shortfall.lte(new Decimal(0))) return null
  if (funded.length !== 1) {
    throw new AppError(
      'Multiple source goals are funded on this account. Please select the source goal for this transfer.',
      400,
    )
  }
  const goal = funded[0]
  const goalBalance = new Decimal(goal.currentAmount)
  const withdrawal = shortfall.gt(goalBalance) ? goalBalance : shortfall
  return { id: goal.id, withdrawal: String(withdrawal) }
}

async function ledgerBalances(prisma, userId, accountIds) {
  const Decimal = await getDecimal()
  const ids = [...new Set(accountIds.filter((accountId) => accountId != null).map((accountId) => Number(accountId)))]
  const balances = new Map()
  if (ids.length === 0) return balances
  const accounts = await prisma.account.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, initialBalance: true },
  })
  for (const account of accounts) {
    balances.set(Number(account.id), new Decimal(account.initialBalance))
  }
  const totals = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: { userId, accountId: { in: ids }, type: { in: ['INCOME', 'EXPENSE'] } },
    _sum: { amount: true },
  })
  for (const row of totals) {
    const key = Number(row.accountId)
    if (!balances.has(key)) continue
    const amount = row._sum.amount ?? new Decimal(0)
    if (row.type === 'INCOME') {
      balances.set(key, balances.get(key).plus(amount))
    } else {
      balances.set(key, balances.get(key).minus(amount))
    }
  }
  const { transferOut, transferIn } = await getTransferFlow(prisma, userId, ids)
  for (const id of ids) {
    if (!balances.has(id)) continue
    const out = transferOut.get(id) ?? new Decimal(0)
    const into = transferIn.get(id) ?? new Decimal(0)
    balances.set(id, balances.get(id).minus(out).plus(into))
  }
  return balances
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
      throw new AppError('Type must be INCOME, EXPENSE, or TRANSFER.', 400)
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
    where.OR = [{ accountId }, { transferAccountId: accountId }]
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
        account: { select: { id: true, name: true, type: true, deletedAt: true } },
        transferAccount: { select: { id: true, name: true, type: true, isDefault: true, deletedAt: true } },
        goal: { select: { id: true, name: true } },
        sourceGoal: { select: { id: true, name: true } },
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
      account: { select: { id: true, name: true, type: true, deletedAt: true } },
      transferAccount: { select: { id: true, name: true, type: true, isDefault: true, deletedAt: true } },
      goal: { select: { id: true, name: true } },
      sourceGoal: { select: { id: true, name: true } },
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

async function ensureTransferDestination(prisma, userId, accountId) {
  const found = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, deletedAt: true },
  })
  if (!found) {
    throw new AppError('Destination account not found.', 400)
  }
  if (found.deletedAt) {
    throw new AppError('This account has been deleted.', 400)
  }
  return found
}

async function resolveAccountId(prisma, userId, accountId) {
  let resolved = accountId
  if (!resolved) {
    const cash = await ensureCashAccount(prisma, userId)
    resolved = cash.id
  }
  await ensureActiveAccount(prisma, userId, resolved, 400)
  return resolved
}

async function createTransaction(userId, body) {
  const prisma = await getPrisma()
  const input = parseTransactionInput(body)
  let sourceWithdrawal = input.amount
  if (input.type === 'TRANSFER') {
    if (input.accountId === null) {
      throw new AppError('Account is required.', 400)
    }
    await ensureActiveAccount(prisma, userId, input.accountId, 400)
    await ensureTransferDestination(prisma, userId, input.transferAccountId)
    if (input.goalId) {
      await ensureGoalOwnedAndMatching(prisma, userId, input.goalId, input.transferAccountId)
    }
    const Decimal = await getDecimal()
    const balances = await ledgerBalances(prisma, userId, [input.accountId])
    const available = balances.get(Number(input.accountId)) ?? new Decimal(0)
    if (new Decimal(input.amount).gt(available)) {
      throw new AppError("Transfer amount must not exceed the source account's current balance.", 400)
    }
    if (input.sourceGoalId) {
      const resolved = await resolveExplicitSourceGoal(
        prisma,
        userId,
        input.sourceGoalId,
        input.accountId,
        input.amount,
      )
      sourceWithdrawal = resolved.withdrawal
    } else {
      const resolved = await autoResolveSourceGoal(
        prisma,
        userId,
        input.accountId,
        input.amount,
        available,
      )
      if (resolved) {
        input.sourceGoalId = resolved.id
        sourceWithdrawal = resolved.withdrawal
      }
    }
  } else {
    await ensureCategoryExists(prisma, userId, input.categoryId, 400)
    await ensureCategoryTypeMatches(prisma, input.categoryId, input.type)
    input.accountId = await resolveAccountId(prisma, userId, input.accountId)
    if (input.goalId) {
      await ensureGoalOwnedAndMatching(prisma, userId, input.goalId, input.accountId)
    }
  }
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({ data: { ...input, userId } })
    if (input.sourceGoalId) {
      await tx.goalActivity.create({
        data: {
          goalId: input.sourceGoalId,
          transactionId: transaction.id,
          accountId: input.accountId,
          type: 'WITHDRAWAL',
          amount: sourceWithdrawal,
          date: input.date,
          note: input.note,
        },
      })
      await syncGoalProgress(tx, input.sourceGoalId)
    }
    if (input.goalId) {
      await tx.goalActivity.create({
        data: {
          goalId: input.goalId,
          transactionId: transaction.id,
          ...(input.type === 'TRANSFER'
            ? {
                accountId: input.transferAccountId,
                type: 'CONTRIBUTION',
                amount: input.amount,
                date: input.date,
                note: input.note,
              }
            : activityDataFor(input)),
        },
      })
      await syncGoalProgress(tx, input.goalId)
    }
    return transaction
  })
}

async function updateTransaction(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await getTransaction(userId, id)
  if (existing.type === 'TRANSFER') {
    throw new AppError('Transfer transactions cannot be edited.', 400)
  }
  const input = parseTransactionInput(body)
  if (input.type === 'TRANSFER') {
    throw new AppError('A transaction cannot be changed to a transfer.', 400)
  }
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  await ensureCategoryTypeMatches(prisma, input.categoryId, input.type)
  input.accountId = await resolveAccountId(prisma, userId, input.accountId)
  if (input.goalId) {
    await ensureGoalOwnedAndMatching(prisma, userId, input.goalId, input.accountId)
  }
  if (existing.type === 'INCOME') {
    const oldAccount = existing.accountId != null ? Number(existing.accountId) : null
    const newAccount = input.accountId != null ? Number(input.accountId) : null
    const affected = [...new Set([oldAccount, newAccount])].filter((accountId) => accountId != null)
    const balances = await ledgerBalances(prisma, userId, affected)
    if (oldAccount != null && balances.has(oldAccount)) {
      const withoutOld = balances.get(oldAccount).minus(existing.amount)
      if (withoutOld.isNegative()) {
        throw new AppError('Transaction cannot be changed because it would make an account balance negative.', 400)
      }
    }
    if (newAccount !== oldAccount && newAccount != null && balances.has(newAccount)) {
      const withNew = balances.get(newAccount).plus(input.amount)
      if (withNew.isNegative()) {
        throw new AppError('Transaction cannot be changed because it would make an account balance negative.', 400)
      }
    }
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
  const existing = await getTransaction(userId, id)
  const affected = [existing.accountId, existing.transferAccountId].filter((accountId) => accountId != null)
  const balances = await ledgerBalances(prisma, userId, affected)
  if (existing.type === 'INCOME' && existing.accountId != null) {
    const key = Number(existing.accountId)
    if (balances.has(key) && balances.get(key).minus(existing.amount).isNegative()) {
      throw new AppError('Transaction cannot be deleted because it would make an account balance negative.', 400)
    }
  }
  const linkedGoals = await prisma.goalActivity.findMany({
    where: { transactionId: id },
    select: { goalId: true },
  })
  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } })
    for (const linked of linkedGoals) {
      await syncGoalProgress(tx, linked.goalId)
    }
  })
  return { id: Number(id) }
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
}