const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 2,
})

const wholeCurrencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount % 1 === 0 ? wholeCurrencyFormatter.format(amount) : currencyFormatter.format(amount)
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonth(ym) {
  const date = new Date(`${ym}-01T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ym
  return monthFormatter.format(date)
}

const compactCurrencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrencyCompact(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return compactCurrencyFormatter.format(amount)
}