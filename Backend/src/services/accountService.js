const { AppError } = require('../utils/appError')
const { getPrisma, getDecimal } = require('../lib/prisma')
const { requireText, amountString } = require('../utils/validate')

const NAME_MAX = 50
const ACCOUNT_TYPES = ['CASH', 'BANK', 'SAVINGS', 'EWALLET', 'OTHER']

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
  if (body.initialBalance !== undefined && body.initialBalance !== null && body.initialBalance !== '') {
    initialBalance = amountString(body.initialBalance, 'Initial balance')
  }
  return { name, type, initialBalance }
}

async function ensureAccountExists(prisma, userId, accountId, status = 404) {
  const found = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  })
  if (!found) {
    throw new AppError('Account not found.', status)
  }
  return found
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
  const balance = new Decimal(account.initialBalance).plus(income).minus(expense)
  return { ...account, income, expense, balance }
}

async function listAccounts(userId) {
  const prisma = await getPrisma()
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  return Promise.all(accounts.map((account) => enrichBalance(prisma, userId, account)))
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
  const account = await prisma.account.create({ data: { ...parseAccountInput(body), userId } })
  return enrichBalance(prisma, userId, account)
}

async function updateAccount(userId, id, body) {
  const prisma = await getPrisma()
  await ensureAccountExists(prisma, userId, id)
  const account = await prisma.account.update({ where: { id }, data: parseAccountInput(body) })
  return enrichBalance(prisma, userId, account)
}

async function deleteAccount(userId, id) {
  const prisma = await getPrisma()
  await ensureAccountExists(prisma, userId, id)
  const usedCount =
    (await prisma.transaction.count({ where: { accountId: id, userId } })) +
    (await prisma.recurringTransaction.count({ where: { accountId: id, userId } })) +
    (await prisma.goal.count({ where: { accountId: id, userId } }))
  if (usedCount > 0) {
    throw new AppError('This account cannot be deleted because it is currently in use.', 409)
  }
  await prisma.account.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  ensureAccountExists,
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
}