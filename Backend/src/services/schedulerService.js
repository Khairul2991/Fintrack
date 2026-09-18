const { getPrisma } = require('../lib/prisma')
const { generateNotifications } = require('./notificationService')

// FinTrack runs as a single long-running Node/Express process (no serverless,
// no horizontal scaling, no multi-instance scheduler config), so an in-process
// interval is safe: it restarts with the process, and notification generation
// is idempotent (per-user single-flight + unread dedup) so no duplicates occur
// across restarts, overlapping ticks, or concurrent "Check reminders" clicks.
//
// Frequency: 6 hours. Recurring transactions and goal deadlines only change on
// a daily basis, while budget thresholds improve when re-checked intra-day.
// This keeps latencies under a day without running aggressively.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let timer = null
let running = false

async function tick() {
  if (running) return
  running = true
  try {
    const prisma = await getPrisma()
    const users = await prisma.user.findMany({ select: { id: true } })
    for (const user of users) {
      await generateNotifications(user.id)
    }
  } finally {
    running = false
  }
}

function startScheduler() {
  if (timer) return
  // Generate once immediately after startup so users do not wait up to 6h
  // after a deployment/restart before due reminders appear.
  tick()
  timer = setInterval(tick, CHECK_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

module.exports = { startScheduler, stopScheduler, CHECK_INTERVAL_MS }