const { AppError } = require('../utils/appError')

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message })
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body.' })
  }

  if (err && typeof err.code === 'string' && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta && err.meta.target) ? err.meta.target : [err.meta && err.meta.target]
      if (target.includes('authUserId') || target.includes('email')) {
        return res.status(409).json({ success: false, message: 'A user with this email already exists.' })
      }
      if (target.includes('name')) {
        return res.status(409).json({ success: false, message: 'Category name already exists.' })
      }
      if (target.includes('month')) {
        return res.status(409).json({ success: false, message: 'A budget for this category and period already exists.' })
      }
      return res.status(409).json({ success: false, message: 'This record already exists.' })
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ success: false, message: 'This category cannot be deleted because it is currently in use.' })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found.' })
    }
  }

  console.error(err)
  res.status(500).json({ success: false, message: 'Unable to process request.' })
}

module.exports = { errorHandler }