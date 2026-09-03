// Maximum accepted financial amount (whole IDR). Kept at or below
// Number.MAX_SAFE_INTEGER so every aggregation stays exact, and generous
// enough for personal finance figures. Backend stores amounts as Decimal and
// enforces no upper bound, so the frontend guards this limit consistently.
export const MAX_FINANCIAL_AMOUNT = 999999999999999

export function groupThousands(intPart) {
  let rest = intPart
  let out = ''
  while (rest.length > 3) {
    out = `.${rest.slice(-3)}${out}`
    rest = rest.slice(0, -3)
  }
  return `${rest}${out}`
}

export function toRawNumber(input) {
  if (input == null) return ''
  let s = String(input).trim()
  if (!s) return ''

  let sign = ''
  if (s.startsWith('-')) {
    sign = '-'
    s = s.slice(1)
  }
  s = s.replace(/[.,\s]/g, '')

  if (!/\d/.test(s)) return sign
  const digits = s.match(/\d+/)
  return `${sign}${digits ? digits[0] : ''}`
}

export function formatNumberDisplay(raw) {
  const value = toRawNumber(raw)
  if (!value) return ''
  if (!/\d/.test(value)) return '-'

  let sign = ''
  let rest = value
  if (rest.startsWith('-')) {
    sign = '-'
    rest = rest.slice(1)
  }
  if (!rest) rest = '0'
  rest = rest.replace(/^0+(?=\d)/, '')
  if (!rest) rest = '0'

  return `${sign}${groupThousands(rest)}`
}

export function caretAfterMapping(oldDisplay, caret, newDisplay) {
  const before = oldDisplay.slice(0, caret)
  const digitsBefore = (before.match(/\d/g) || []).length

  if (digitsBefore === 0) return 0

  let seen = 0
  for (let index = 0; index < newDisplay.length; index += 1) {
    if (/\d/.test(newDisplay[index])) {
      seen += 1
      if (seen === digitsBefore) return index + 1
    }
  }
  return newDisplay.length
}

// Precision-safe "does this raw amount exceed the maximum?" check. Compares
// digit strings instead of Number() so arbitrarily long pasted values can
// never lose precision, overflow to Infinity, or cause NaN.
export function isAmountOverLimit(raw) {
  if (raw == null || raw === '') return false
  const value = toRawNumber(raw)
  if (!value) return false
  const digits = value.replace(/\D/g, '')
  if (!digits.length) return false
  const maxDigits = String(MAX_FINANCIAL_AMOUNT).replace(/\D/g, '')
  if (digits.length > maxDigits.length) return true
  if (digits.length < maxDigits.length) return false
  return digits > maxDigits
}