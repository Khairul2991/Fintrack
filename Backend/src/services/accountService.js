const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, amountString } = require('../utils/validate')
const { getTransferFlow } = require('./transferBalance')

const NAME_MAX = 50
const ACCOUNT_TYPES = ['CASH', 'BANK', 'SAVINGS', 'EWALLET', 'OTHER']
const CASH_ACCOUNT_NAME = 'Cash'

function parseAccountInput(body) {
  const name = requireText(body.name, 'Name')
  if (name.length > NAME_MAX) {
    throw new AppError(`Name must be at most ${NAME_MAX} characters.`, 400)
  }
  const type = requireText(body.type, 'Type')
  if (!ACCOUNT_TYPES.includes(type)) {
    throw new AppError('Type must be CASH, BANK, SAVINGS, EWALLET, or OTHER.', 400)
  }
  let initialBalance = '0'
  if (body.initialBalance !== undefined && body.initialBalance !== null && String(body.initialBalance).trim() !== '') {
    const raw = String(body.initialBalance).trim()
    if (/^0+(\.0+)?$/.test(raw)) {
      initialBalance = '0'
    } else {
      initialBalance = amountString(raw, 'Initial balance')
    }
  }
  return { name, type, initialBalance }
}

async function ensureCashAccount(prisma, userId) {
  const found = await prisma.account.findFirst({ where: { userId, type: 'CASH', isDefault: true } })
  if (found) {
    return found
  }
  try {
    return await prisma.account.create({
      data: { userId, name: CASH_ACCOUNT_NAME, type: 'CASH', isDefault: true },
    })
  } catch (error) {
    const existing = await prisma.account.findFirst({ where: { userId, type: 'CASH', isDefault: true } })
    if (existing) {
      return existing
    }
    throw error
  }
}

async function ensureAccountExists(prisma, userId, accountId, status = 404) {
  const found = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, isDefault: true, deletedAt: true },
  })
  if (!found) {
    throw new AppError('Account not found.', status)
  }
  return found
}

async function ensureActiveAccount(prisma, userId, accountId, status = 400) {
  const found = await ensureAccountExists(prisma, userId, accountId, status)
  if (found.deletedAt) {
    throw new AppError('This account has been deleted.', 400)
  }
  return found
}

async function ensureUniqueAccountName(prisma, userId, name, excludeId) {
  const found = await prisma.account.findFirst({
    where: { userId, name, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  })
  if (found) {
    throw new AppError('An account with this name already exists.', 409)
  }
}

async function enrichBalance(prisma, userId, account) {
  const Decimal = await getDecimal()
  const totals = await prisma.transaction.groupBy({
    by: ['type'],
    where: { accountId: account.id, userId },
    _sum: { amount: true },
  })
  let income = new Decimal(0)
  let expense = new Decimal(0)
  for (const row of totals) {
    if (row.type === 'INCOME') income = row._sum.amount ?? new Decimal(0)
    if (row.type === 'EXPENSE') expense = row._sum.amount ?? new Decimal(0)
  }
  const { transferOut, transferIn } = await getTransferFlow(prisma, userId, [account.id])
  const balance = new Decimal(account.initialBalance)
    .plus(income)
    .minus(expense)
    .minus(transferOut.get(account.id) ?? new Decimal(0))
    .plus(transferIn.get(account.id) ?? new Decimal(0))
  return { ...account, income, expense, balance }
}

async function listAccounts(userId) {
  const prisma = await getPrisma()
  const accounts = await prisma.account.findMany({ where: { userId, deletedAt: null }, orderBy: { name: 'asc' } })
  if (accounts.length === 0) {
    return []
  }
  const Decimal = await getDecimal()
  const accountIds = accounts.map((account) => account.id)
  const [totals, recurringByAccount, goalsByAccount, activitiesByAccount, transfers] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { userId, accountId: { in: accountIds } },
      _sum: { amount: true },
    }),
    prisma.recurringTransaction.groupBy({
      by: ['accountId'],
      where: { userId, accountId: { in: accountIds } },
      _count: true,
    }),
    prisma.goal.groupBy({
      by: ['accountId'],
      where: { userId, accountId: { in: accountIds } },
      _count: true,
    }),
    prisma.goalActivity.groupBy({
      by: ['accountId'],
      where: { accountId: { in: accountIds } },
      _count: true,
    }),
    getTransferFlow(prisma, userId, accountIds),
  ])
  const byAccount = new Map()
  for (const row of totals) {
    const entry = byAccount.get(row.accountId) || { income: new Decimal(0), expense: new Decimal(0) }
    if (row.type === 'INCOME') {
      entry.income = row._sum.amount ?? new Decimal(0)
    } else if (row.type === 'EXPENSE') {
      entry.expense = row._sum.amount ?? new Decimal(0)
    }
    byAccount.set(row.accountId, entry)
  }
  const recurringById = new Map(recurringByAccount.map((row) => [row.accountId, row._count]))
  const goalsById = new Map(goalsByAccount.map((row) => [row.accountId, row._count]))
  const activitiesById = new Map(activitiesByAccount.map((row) => [row.accountId, row._count]))
  const { transferOut, transferIn } = transfers
  return accounts.map((account) => {
    const totalsFor = byAccount.get(account.id) || { income: new Decimal(0), expense: new Decimal(0) }
    const balance = new Decimal(account.initialBalance)
      .plus(totalsFor.income)
      .minus(totalsFor.expense)
      .minus(transferOut.get(account.id) ?? new Decimal(0))
      .plus(transferIn.get(account.id) ?? new Decimal(0))
    const incomeExpenseInUse = totalsFor.income.gt(0) || totalsFor.expense.gt(0)
    const transferInUse =
      (transferOut.get(account.id) ?? new Decimal(0)).gt(0) ||
      (transferIn.get(account.id) ?? new Decimal(0)).gt(0)
    const inUse =
      incomeExpenseInUse ||
      transferInUse ||
      (recurringById.get(account.id) ?? 0) > 0 ||
      (goalsById.get(account.id) ?? 0) > 0 ||
      (activitiesById.get(account.id) ?? 0) > 0
    return { ...account, income: totalsFor.income, expense: totalsFor.expense, balance, inUse }
  })
}

async function getAccount(userId, id) {
  const prisma = await getPrisma()
  const account = await prisma.account.findFirst({ where: { id, userId } })
  if (!account) {
    throw new AppError('Account not found.', 404)
  }
  return enrichBalance(prisma, userId, account)
}

async function createAccount(userId, body) {
  const prisma = await getPrisma()
  const input = parseAccountInput(body)
  await ensureUniqueAccountName(prisma, userId, input.name)
  const account = await prisma.account.create({ data: { ...input, isDefault: false, userId } })
  return enrichBalance(prisma, userId, account)
}

async function updateAccount(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await ensureAccountExists(prisma, userId, id)
  if (existing.deletedAt) {
    throw new AppError('This account has been deleted.', 400)
  }
  const input = parseAccountInput(body)
  if (existing.isDefault && input.type !== 'CASH') {
    throw new AppError('The default cash account cannot be changed to another type.', 409)
  }
  await ensureUniqueAccountName(prisma, userId, input.name, Number(id))
  const account = await prisma.account.update({ where: { id }, data: input })
  return enrichBalance(prisma, userId, account)
}

async function deleteAccount(userId, id) {
  const prisma = await getPrisma()
  const existing = await ensureAccountExists(prisma, userId, id)
  if (existing.isDefault) {
    throw new AppError('The default cash account cannot be deleted.', 409)
  }
  if (existing.deletedAt) {
    return { id: Number(id), archived: true }
  }
  const [transactions, transfers, recurring, goals, goalActivities] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id, userId } }),
    prisma.transaction.count({ where: { transferAccountId: id, userId } }),
    prisma.recurringTransaction.count({ where: { accountId: id, userId } }),
    prisma.goal.count({ where: { accountId: id, userId } }),
    prisma.goalActivity.count({ where: { accountId: id } }),
  ])
  const total = transactions + transfers + recurring + goals + goalActivities
  if (total > 0) {
    await prisma.$transaction([
      prisma.account.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.recurringTransaction.updateMany({
        where: { userId, accountId: id, active: true },
        data: { active: false },
      }),
    ])
    return { id: Number(id), archived: true }
  }
  await prisma.account.delete({ where: { id } })
  return { id: Number(id), archived: false }
}

module.exports = {
  ensureAccountExists,
  ensureActiveAccount,
  ensureCashAccount,
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
}