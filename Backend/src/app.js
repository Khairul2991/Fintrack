const express = require('express')
const apiRoutes = require('./routes')
const categoryRoutes = require('./routes/categories')
const transactionRoutes = require('./routes/transactions')
const budgetRoutes = require('./routes/budgets')
const dashboardRoutes = require('./routes/dashboard')
const reportRoutes = require('./routes/reports')
const { notFound } = require('./middleware/notFound')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()

app.use(express.json())

app.use('/api', apiRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/budgets', budgetRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app