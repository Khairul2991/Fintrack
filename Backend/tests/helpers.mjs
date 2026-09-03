import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export const TEST_DB_URL = 'file:./database/test.db'

export const SEED_CATEGORIES = [
  { name: 'Food', icon: '🍜', color: '#f59e0b' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Bills', icon: '🧾', color: '#ef4444' },
  { name: 'Health', icon: '🏥', color: '#10b981' },
  { name: 'Education', icon: '📚', color: '#06b6d4' },
  { name: 'Salary', icon: '💰', color: '#22c55e' },
  { name: 'Freelance', icon: '💻', color: '#6366f1' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
]

export async function startApp() {
  process.env.DATABASE_URL = TEST_DB_URL
  const app = require('../src/app')
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const port = server.address().port
  return { server, base: `http://127.0.0.1:${port}/api` }
}

export async function stopApp(server) {
  if (server && typeof server.closeAllConnections === 'function') {
    server.closeAllConnections()
  }
  await new Promise((resolve) => server.close(resolve))
}

export async function disconnectPrisma() {
  const { getPrisma } = require('../src/lib/prisma')
  const prisma = await getPrisma()
  await prisma.$disconnect()
}

export async function request(base, method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, data }
}

export async function getCategories(base) {
  const res = await request(base, 'GET', '/categories')
  return res.data.data
}

export async function resetDb(base) {
  const txs = (await request(base, 'GET', '/transactions?page=1&limit=100')).data.data
  for (const tx of txs) {
    await request(base, 'DELETE', `/transactions/${tx.id}`)
  }
  const budgets = (await request(base, 'GET', '/budgets')).data.data
  for (const budget of budgets) {
    await request(base, 'DELETE', `/budgets/${budget.id}`)
  }
  for (const category of await getCategories(base)) {
    await request(base, 'DELETE', `/categories/${category.id}`)
  }
  for (const seed of SEED_CATEGORIES) {
    await request(base, 'POST', '/categories', seed)
  }
}

export function isoDate(year, month, day) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function currentKeys() {
  const now = new Date()
  const curY = now.getUTCFullYear()
  const curM = now.getUTCMonth() + 1
  const prev = new Date(Date.UTC(curY, curM - 2, 1))
  const prevY = prev.getUTCFullYear()
  const prevM = prev.getUTCMonth() + 1
  const prevPrev = new Date(Date.UTC(curY, curM - 3, 1))
  const ppY = prevPrev.getUTCFullYear()
  const ppM = prevPrev.getUTCMonth() + 1
  return { curY, curM, prevY, prevM, ppY, ppM }
}