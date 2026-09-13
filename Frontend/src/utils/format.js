const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
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
  if (Math.round(amount * 100) % 100 === 0) return wholeCurrencyFormatter.format(amount)
  return currencyFormatter.format(amount)
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

export function formatDateTime(iso, lang = currentLang()) {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return formatDate(iso, lang)
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
  }).format(date)
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

export function toUtcInputValue(value) {
  const match = typeof value === 'string' ? value.match(LOCAL_INPUT_RE) : null
  if (!match) return value
  const [, y, mo, d, h, mi, s] = match
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  const hour = Number(h)
  const minute = Number(mi)
  const second = s ? Number(s) : 0
  const date = new Date(year, month - 1, day, hour, minute, second)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return value
  }
  return date.toISOString().slice(0, 19)
}

export function toLocalInputValue(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return typeof iso === 'string' ? iso.slice(0, 16) : ''
  }
  return [
    date.getFullYear(),
    '-',
    pad2(date.getMonth() + 1),
    '-',
    pad2(date.getDate()),
    'T',
    pad2(date.getHours()),
    ':',
    pad2(date.getMinutes()),
    ':',
    pad2(date.getSeconds()),
  ].join('')
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