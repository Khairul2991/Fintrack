class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message)
    this.status = status
    this.name = 'AppError'
    this.details = details
  }
}

module.exports = { AppError }