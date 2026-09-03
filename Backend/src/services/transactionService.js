const { AppError } = require('../utils/appError')
const { getPrisma } = require('../lib/prisma')
const { requireText, integer, amountString } = require('../utils/validate')
const { parseDateOnly } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists } = require('./accountService')

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
  return { description, amount, type, categoryId, accountId, date, note }
}

async function listTransactions(query) {
  const prisma = await getPrisma()
  const where = {}

  if (query.search && typeof query.search === 'string') {
    const search = query.search.trim()
    if (search) {
      where.description = { contains: search }
    }
  }

  if (query.type) {
    if (!TYPES.includes(query.type)) {
      throw new AppError('Type must be INCOME or EXPENSE.', 400)
    }
    where.type = query.type
  }

  if (query.categoryId) {
    where.categoryId = integer(query.categoryId, 'categoryId')
  }

  if (query.accountId) {
    where.accountId = integer(query.accountId, 'accountId')
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

  const total = await prisma.transaction.count({ where })
  const data = await prisma.transaction.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

async function getTransaction(id) {
  const prisma = await getPrisma()
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  if (!transaction) {
    throw new AppError('Transaction not found.', 404)
  }
  return transaction
}

async function createTransaction(body) {
  const prisma = await getPrisma()
  const input = parseTransactionInput(body)
  await ensureCategoryExists(prisma, input.categoryId, 400)
  if (input.accountId) {
    await ensureAccountExists(prisma, input.accountId, 400)
  }
  return prisma.transaction.create({ data: input })
}

async function updateTransaction(id, body) {
  const prisma = await getPrisma()
  await getTransaction(id)
  const input = parseTransactionInput(body)
  await ensureCategoryExists(prisma, input.categoryId, 400)
  if (input.accountId) {
    await ensureAccountExists(prisma, input.accountId, 400)
  }
  return prisma.transaction.update({ where: { id }, data: input })
}

async function deleteTransaction(id) {
  const prisma = await getPrisma()
  await getTransaction(id)
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