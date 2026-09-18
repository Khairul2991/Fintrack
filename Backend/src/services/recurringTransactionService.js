const { AppError } = require('../utils/appError')
const { getPrisma } = require('../lib/prisma')
const { requireText, amountString, integer } = require('../utils/validate')
const { parseDateOnly, parseTransactionDate } = require('../utils/date')
const { createNotification } = require('./notificationStore')
const { ensureCategoryExists } = require('./categoryService')
const { ensureActiveAccount, ensureCashAccount, cleanupArchivedAccountIfOrphaned } = require('./accountService')

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500
const TYPES = ['INCOME', 'EXPENSE']
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
const MAX_GENERATE_PER_RUN = 400

function utcDateKey(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addFrequency(date, frequency) {
  const result = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ))
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
  return new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    startDate.getUTCHours(),
    startDate.getUTCMinutes(),
    startDate.getUTCSeconds(),
  ))
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
  const startDate = parseTransactionDate(rawStart)
  if (!startDate) {
    throw new AppError('Invalid start date. Use YYYY-MM-DD or YYYY-MM-DDTHH:mm.', 400)
  }
  let endDate = null
  if (body.endDate !== undefined && body.endDate !== null && body.endDate !== '') {
    endDate = parseDateOnly(String(body.endDate))
    if (!endDate) {
      throw new AppError('Invalid end date. Use YYYY-MM-DD.', 400)
    }
    if (utcDateKey(endDate) < utcDateKey(startDate)) {
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

async function generateDueTransactions(prisma, userId, item, now) {
  let next = new Date(item.nextOccurrence)
  let accountId = item.accountId
  if (!accountId) {
    const cash = await ensureCashAccount(prisma, userId)
    accountId = cash.id
  }
  if (item.endDate && utcDateKey(next) > utcDateKey(item.endDate)) {
    await prisma.recurringTransaction.update({
      where: { id: item.id },
      data: { lastRunAt: new Date() },
    })
    return { created: 0, notified: 0 }
  }
  const due = []
  while (next.getTime() <= now.getTime() && due.length < MAX_GENERATE_PER_RUN) {
    if (item.endDate && utcDateKey(next) > utcDateKey(item.endDate)) break
    due.push(new Date(next))
    next = addFrequency(next, item.frequency)
  }
  if (due.length === 0) {
    await prisma.recurringTransaction.update({
      where: { id: item.id },
      data: { lastRunAt: new Date() },
    })
    return { created: 0, notified: 0 }
  }
  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findMany({
      where: { userId, recurringTransactionId: item.id, date: { gte: due[0], lte: now } },
      select: { date: true },
    })
    const seen = new Set(existing.map((row) => new Date(row.date).getTime()))
    const owned = []
    for (const at of due) {
      if (seen.has(at.getTime())) continue
      seen.add(at.getTime())
      owned.push({
        userId,
        description: item.description,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        accountId,
        date: at,
        note: item.note,
        recurringTransactionId: item.id,
      })
    }
    if (owned.length > 0) {
      await tx.transaction.createMany({ data: owned })
    }
    let notified = 0
    if (item.category && item.category.name) {
      notified = await createNotification(
        tx,
        userId,
        'RECURRING_DUE',
        'Recurring transaction due',
        `"${item.description}" is due in your ${item.category.name} category.`,
      )
    }
    await tx.recurringTransaction.update({
      where: { id: item.id },
      data: { nextOccurrence: next, lastRunAt: new Date() },
    })
    return { created: owned.length, notified }
  })
  return created
}

async function runCatchUp(userId, options = {}) {
  const prisma = await getPrisma()
  const items = await prisma.recurringTransaction.findMany({
    where: { active: true, userId },
    include: { category: { select: { name: true } } },
  })
  const now = options.now instanceof Date ? options.now : new Date()
  const results = await Promise.all(items.map((item) => generateDueTransactions(prisma, userId, item, now)))
  const generated = results.reduce((sum, result) => sum + result.created, 0)
  const notified = results.reduce((sum, result) => sum + result.notified, 0)
  return { generated, processed: items.length, notified }
}

function serializeDateTime(value) {
  return value.toISOString()
}

function serialize(item) {
  return {
    ...item,
    nextOccurrence: item.nextOccurrence ? serializeDateTime(item.nextOccurrence) : null,
    startDate: item.startDate instanceof Date ? serializeDateTime(item.startDate) : item.startDate,
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
  if (!input.accountId) {
    const cash = await ensureCashAccount(prisma, userId)
    input.accountId = cash.id
  }
  await ensureActiveAccount(prisma, userId, input.accountId, 400)
  const next = firstOccurrenceOnOrAfter(input.startDate)
  if (input.endDate && utcDateKey(next) > utcDateKey(input.endDate)) {
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
  if (!input.accountId) {
    const cash = await ensureCashAccount(prisma, userId)
    input.accountId = cash.id
  }
  await ensureActiveAccount(prisma, userId, input.accountId, 400)
  const merge = { ...existing, ...input }
  const candidate = firstOccurrenceOnOrAfter(input.startDate)
  if (merge.endDate && utcDateKey(candidate) > utcDateKey(merge.endDate)) {
    throw new AppError('Start date must be before the end date.', 400)
  }
  const currentNext = new Date(existing.nextOccurrence)
  let next = candidate.getTime() > currentNext.getTime() ? candidate : currentNext
  if (next === currentNext) {
    const timeChanged =
      input.startDate.getUTCHours() !== existing.startDate.getUTCHours() ||
      input.startDate.getUTCMinutes() !== existing.startDate.getUTCMinutes() ||
      input.startDate.getUTCSeconds() !== existing.startDate.getUTCSeconds()
    if (timeChanged) {
      next = new Date(Date.UTC(
        currentNext.getUTCFullYear(),
        currentNext.getUTCMonth(),
        currentNext.getUTCDate(),
        input.startDate.getUTCHours(),
        input.startDate.getUTCMinutes(),
        input.startDate.getUTCSeconds(),
      ))
    }
  }
  const previousAccountId = existing.accountId
  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.recurringTransaction.update({
      where: { id },
      data: { ...input, nextOccurrence: next },
    })
    if (String(existing.amount) !== input.amount) {
      await tx.transaction.updateMany({
        where: { userId, recurringTransactionId: id },
        data: { amount: input.amount },
      })
    }
    if (previousAccountId != null && Number(previousAccountId) !== Number(input.accountId)) {
      await cleanupArchivedAccountIfOrphaned(tx, userId, previousAccountId)
    }
    return updated
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
  await prisma.$transaction(async (tx) => {
    await tx.recurringTransaction.delete({ where: { id } })
    await cleanupArchivedAccountIfOrphaned(tx, userId, existing.accountId)
  })
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