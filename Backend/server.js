const app = require('./src/app')
const { startScheduler } = require('./src/services/schedulerService')

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  if (process.env.NODE_ENV !== 'test') {
    startScheduler()
  }
})