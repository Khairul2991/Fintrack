const { AppError } = require('./appError')

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${field} is required.`, 400)
  }
  return value.trim()
}

function integer(value, field, { min, max } = {}) {
  const n = Number(value)
  if (!Number.isInteger(n)) {
    throw new AppError(`${field} must be an integer.`, 400)
  }
  if (min !== undefined && n < min) {
    throw new AppError(`${field} must be at least ${min}.`, 400)
  }
  if (max !== undefined && n > max) {
    throw new AppError(`${field} must be at most ${max}.`, 400)
  }
  return n
}

function amountString(value, field = 'Amount') {
  const s = String(value).trim()
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new AppError(`${field} must be a positive number.`, 400)
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(`${field} must be greater than 0.`, 400)
  }
  return s
}

module.exports = { requireText, integer, amountString }