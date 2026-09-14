function pad2(value) {
  return String(value).padStart(2, '0')
}

export function dayKeyOf(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return null
}

export function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

export function viewKey(view) {
  return `${view.year}-${pad2(view.month)}`
}

export function viewForDateKey(dayKey) {
  const key = dayKeyOf(dayKey)
  if (!key) return null
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) }
}

export function startDateOfMonth(view) {
  return `${view.year}-${pad2(view.month)}-01`
}

export function endDateOfMonth(view) {
  const lastDay = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate()
  return `${view.year}-${pad2(view.month)}-${pad2(lastDay)}`
}

export function shiftMonth(view, delta) {
  const date = new Date(Date.UTC(view.year, view.month - 1 + delta, 1))
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() }
}

export function sameMonth(a, b) {
  return Boolean(a) && Boolean(b) && a.month === b.month && a.year === b.year
}

export function isToday(dayKey) {
  return dayKey === todayKey()
}

function mondayIndex(dayOfWeek) {
  return (dayOfWeek + 6) % 7
}

export function buildGridCells(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const lead = mondayIndex(first.getUTCDay())
  const start = new Date(Date.UTC(year, month - 1, 1 - lead))
  const total = 42
  const cells = []
  for (let i = 0; i < total; i += 1) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
    cells.push({
      key: dayKeyOf(date),
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    })
  }
  let keptRows = 0
  for (let row = 0; row < total / 7; row += 1) {
    if (cells.slice(row * 7, row * 7 + 7).some((cell) => cell.inMonth)) keptRows += 1
  }
  return cells.slice(0, keptRows * 7)
}

export function weekdayLabels(lang = 'en') {
  const locale = lang === 'id' ? 'id-ID' : 'en-GB'
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 5 + index))
    return formatter.format(date)
  })
}

export function formatMonthLong(ym, lang = 'en') {
  const date = new Date(`${ym}-01T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ym
  const locale = lang === 'id' ? 'id-ID' : 'en-GB'
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function groupTransactionsByDay(transactions) {
  const byDay = new Map()
  for (const tx of transactions) {
    const key = dayKeyOf(tx.date)
    if (!key) continue
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(tx)
  }
  return byDay
}

export function summarizeTransactionList(transactions) {
  const summary = { count: 0, income: 0, expense: 0, transfers: 0, net: 0 }
  for (const tx of transactions) {
    summary.count += 1
    const amount = Number(tx.amount) || 0
    if (tx.type === 'TRANSFER') {
      summary.transfers += 1
    } else if (tx.type === 'INCOME') {
      summary.income += amount
    } else if (tx.type === 'EXPENSE') {
      summary.expense += amount
    }
  }
  summary.net = summary.income - summary.expense
  return summary
}

export function summarizeDay(transactions) {
  return summarizeTransactionList(transactions)
}

export function summarizeMonth(transactions, view) {
  const prefix = viewKey(view)
  const monthTransactions = transactions.filter((tx) => {
    const key = dayKeyOf(tx.date)
    return key && key.startsWith(prefix)
  })
  const summary = summarizeTransactionList(monthTransactions)
  const byDay = groupTransactionsByDay(monthTransactions)
  let incomeDays = 0
  let expenseDays = 0
  let activeDays = 0
  for (const [, txs] of byDay) {
    const daySummary = summarizeTransactionList(txs)
    if (daySummary.income > 0) incomeDays += 1
    if (daySummary.expense > 0) expenseDays += 1
    activeDays += 1
  }
  return { ...summary, incomeDays, expenseDays, activeDays }
}

export function notableDayKeys(byDay) {
  return Array.from(byDay.keys())
}