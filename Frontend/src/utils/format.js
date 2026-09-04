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

function localeFor(lang) {
  return lang === 'id' ? 'id-ID' : 'en-GB'
}

function currentLang() {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang
  }
  return 'en'
}

export function formatDate(iso, lang = currentLang()) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatMonth(ym, lang = currentLang()) {
  const date = new Date(`${ym}-01T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ym
  return new Intl.DateTimeFormat(localeFor(lang), {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
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

const numberFormatterCache = new Map()

function numberFormatterFor(lang) {
  if (!numberFormatterCache.has(lang)) {
    numberFormatterCache.set(
      lang,
      new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 2 }),
    )
  }
  return numberFormatterCache.get(lang)
}

export function formatNumber(value, lang = currentLang()) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return numberFormatterFor(lang).format(amount)
}

export function formatCount(value, lang = currentLang()) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 }).format(Math.trunc(amount))
}

export function formatPercent(value, lang = currentLang()) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `${formatNumber(amount, lang)}%`
}

export function formatInsightMetric(value, format, lang = currentLang()) {
  if (value === null || value === undefined) return '—'
  if (format === 'currency') return formatCurrency(value)
  if (format === 'percentage') return formatPercent(value, lang)
  if (format === 'count') return formatCount(value, lang)
  if (format === 'number') return formatNumber(value, lang)
  if (format === 'date') return formatDate(String(value), lang)
  return '—'
}