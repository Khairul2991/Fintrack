const { AppError } = require('../utils/appError')
const { getPrisma } = require('../lib/prisma')
const { requireText, amountString, integer } = require('../utils/validate')
const { parseDateOnly } = require('../utils/date')
const { ensureCategoryExists } = require('./categoryService')
const { ensureAccountExists } = require('./accountService')

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500
const TYPES = ['INCOME', 'EXPENSE']
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
const MAX_GENERATE_PER_RUN = 400

function addFrequency(date, frequency) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  if (frequency === 'DAILY') {
    result.setUTCDate(result.getUTCDate() + 1)
    return result
  }
  if (frequency === 'WEEKLY') {
    result.setUTCDate(result.getUTCDate() + 7)
    return result
  }
  if (frequency === 'MONTHLY') {
    result.setUTCMonth(result.getUTCMonth() + 1)
    return result
  }
  result.setUTCFullYear(result.getUTCFullYear() + 1)
  return result
}

function firstOccurrenceOnOrAfter(startDate) {
  return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
}

function startOfToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function parseRecurringInput(body) {
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
  const frequency = requireText(body.frequency, 'Frequency')
  if (!FREQUENCIES.includes(frequency)) {
    throw new AppError('Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY.', 400)
  }
  const rawStart = requireText(body.startDate, 'Start date')
  const startDate = parseDateOnly(rawStart)
  if (!startDate) {
    throw new AppError('Invalid start date. Use YYYY-MM-DD.', 400)
  }
  let endDate = null
  if (body.endDate !== undefined && body.endDate !== null && body.endDate !== '') {
    endDate = parseDateOnly(String(body.endDate))
    if (!endDate) {
      throw new AppError('Invalid end date. Use YYYY-MM-DD.', 400)
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new AppError('End date must be on or after the start date.', 400)
    }
  }
  let note = null
  if (body.note !== undefined && body.note !== null) {
    note = String(body.note).trim()
    if (note.length > NOTE_MAX) {
      throw new AppError(`Note must be at most ${NOTE_MAX} characters.`, 400)
    }
    if (note === '') note = null
  }
  return { description, amount, type, categoryId, accountId, frequency, startDate, endDate, note }
}

async function generateDueTransactions(prisma, userId, item, today) {
  let generated = 0
  let next = new Date(item.nextOccurrence)
  const owned = []
  if (item.endDate && next.getTime() > item.endDate.getTime()) {
    await prisma.recurringTransaction.update({
      where: { id: item.id },
      data: { lastRunAt: new Date() },
    })
    return 0
  }
  while (next.getTime() <= today.getTime() && generated < MAX_GENERATE_PER_RUN) {
    if (item.endDate && next.getTime() > item.endDate.getTime()) break
    owned.push({
      userId,
      description: item.description,
      amount: item.amount,
      type: item.type,
      categoryId: item.categoryId,
      accountId: item.accountId,
      date: next,
      note: item.note,
    })
    next = addFrequency(next, item.frequency)
    generated += 1
  }
  if (owned.length > 0) {
    await prisma.transaction.createMany({ data: owned })
  }
  await prisma.recurringTransaction.update({
    where: { id: item.id },
    data: { nextOccurrence: next, lastRunAt: new Date() },
  })
  return generated
}

async function runCatchUp(userId) {
  const prisma = await getPrisma()
  const items = await prisma.recurringTransaction.findMany({
    where: { active: true, userId },
    select: {
      id: true,
      description: true,
      amount: true,
      type: true,
      categoryId: true,
      accountId: true,
      note: true,
      frequency: true,
      endDate: true,
      nextOccurrence: true,
    },
  })
  const today = startOfToday()
  const results = await Promise.all(items.map((item) => generateDueTransactions(prisma, userId, item, today)))
  const generated = results.reduce((sum, count) => sum + count, 0)
  return { generated, processed: items.length }
}

function serialize(item) {
  return {
    ...item,
    nextOccurrence: item.nextOccurrence ? item.nextOccurrence.toISOString().slice(0, 10) : null,
    startDate: item.startDate instanceof Date ? item.startDate.toISOString().slice(0, 10) : item.startDate,
    endDate: item.endDate ? item.endDate.toISOString().slice(0, 10) : null,
    lastRunAt: item.lastRunAt ? item.lastRunAt.toISOString() : null,
  }
}

async function listRecurringTransactions(userId) {
  const prisma = await getPrisma()
  const result = await runCatchUp(userId)
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    orderBy: { nextOccurrence: 'asc' },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  return { data: items.map(serialize), catchUp: result }
}

async function getRecurringTransaction(userId, id) {
  const prisma = await getPrisma()
  const item = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
  })
  if (!item) {
    throw new AppError('Recurring transaction not found.', 404)
  }
  return serialize(item)
}

async function createRecurringTransaction(userId, body, { active } = {}) {
  const prisma = await getPrisma()
  const input = parseRecurringInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  if (input.accountId) {
    await ensureAccountExists(prisma, userId, input.accountId, 400)
  }
  let next = firstOccurrenceOnOrAfter(input.startDate)
  if (input.endDate && next.getTime() > input.endDate.getTime()) {
    throw new AppError('Start date must be before the end date.', 400)
  }
  const data = {
    ...input,
    userId,
    nextOccurrence: next,
    active: active === undefined ? true : Boolean(active),
  }
  const item = await prisma.recurringTransaction.create({ data })
  return getRecurringTransaction(userId, item.id)
}

async function updateRecurringTransaction(userId, id, body) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring transaction not found.', 404)
  }
  const input = parseRecurringInput(body)
  await ensureCategoryExists(prisma, userId, input.categoryId, 400)
  if (input.accountId) {
    await ensureAccountExists(prisma, userId, input.accountId, 400)
  }
  const merge = { ...existing, ...input }
  let next = firstOccurrenceOnOrAfter(input.startDate)
  if (merge.endDate && next.getTime() > merge.endDate.getTime()) {
    throw new AppError('Start date must be before the end date.', 400)
  }
  const item = await prisma.recurringTransaction.update({
    where: { id },
    data: { ...input, nextOccurrence: next },
  })
  return getRecurringTransaction(userId, item.id)
}

async function setActive(userId, id, active) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring transaction not found.', 404)
  }
  const item = await prisma.recurringTransaction.update({
    where: { id },
    data: { active: Boolean(active), lastRunAt: null },
  })
  return getRecurringTransaction(userId, item.id)
}

async function deleteRecurringTransaction(userId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } })
  if (!existing) {
    throw new AppError('Recurring transaction not found.', 404)
  }
  await prisma.recurringTransaction.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  runCatchUp,
  listRecurringTransactions,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  setActive,
  deleteRecurringTransaction,
}