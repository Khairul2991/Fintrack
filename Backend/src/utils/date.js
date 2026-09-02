const MIN_YEAR = 2000
const MAX_YEAR = 2100

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

function monthRange(month, year) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }
}

function currentMonthYear() {
  const now = new Date()
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
}

function monthKey(date) {
  return date.toISOString().slice(0, 7)
}

function lastNMonthStarts(count) {
  const now = new Date()
  const starts = []
  for (let i = count - 1; i >= 0; i--) {
    starts.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)))
  }
  return starts
}

module.exports = {
  MIN_YEAR,
  MAX_YEAR,
  parseDateOnly,
  monthRange,
  currentMonthYear,
  monthKey,
  lastNMonthStarts,
}