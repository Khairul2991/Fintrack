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