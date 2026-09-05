import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const path = require('node:path')
const BACKEND_DIR = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))

require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') })

export const TEST_SCHEMA = 'fintrack_test'

function withSchema(url, schema) {
  const qIndex = url.indexOf('?')
  const params = new URLSearchParams(qIndex === -1 ? '' : url.slice(qIndex + 1))
  params.set('schema', schema)
  return `${qIndex === -1 ? url : url.slice(0, qIndex)}?${params.toString()}`
}

const BASE_DB_URL = process.env.DATABASE_URL
if (!BASE_DB_URL) {
  throw new Error('DATABASE_URL must be configured (load Backend/.env) before running the backend suite.')
}

export const TEST_DB_URL = withSchema(BASE_DB_URL, TEST_SCHEMA)

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

let testUserId = null

export async function startApp() {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = TEST_DB_URL

  const { Pool } = require('pg')
  const admin = new Pool({ connectionString: BASE_DB_URL })
  try {
    await admin.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`)
    await admin.query(`CREATE SCHEMA "${TEST_SCHEMA}"`)
  } finally {
    await admin.end()
  }

  execSync('npx prisma migrate deploy', {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    timeout: 60000,
  })

  const prisma = (await require('../src/lib/prisma').getPrisma())

  const existing = await prisma.user.findUnique({ where: { authUserId: 'test-user' } })
  if (existing) {
    testUserId = existing.id
  } else {
    const user = await prisma.user.create({
      data: {
        authUserId: 'test-user',
        email: 'test@fintrack.local',
        name: 'Test User',
      },
    })
    testUserId = user.id
  }

  const app = require('../src/app')
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const port = server.address().port
  return { server, base: `http://127.0.0.1:${port}/api`, testUserId }
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

export async function request(base, method, path, body, { userId } = {}) {
  const headers = {}
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  if (userId !== undefined) {
    headers['x-test-user-id'] = String(userId)
  }
  const res = await fetch(base + path, {
    method,
    headers,
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

export async function getCategories(base, userId) {
  const res = await request(base, 'GET', '/categories', undefined, { userId })
  return res.data.data
}

export async function resetDb(base, userId) {
  const txs = (await request(base, 'GET', '/transactions?page=1&limit=100', undefined, { userId })).data.data
  for (const tx of txs) {
    await request(base, 'DELETE', `/transactions/${tx.id}`, undefined, { userId })
  }
  const budgets = (await request(base, 'GET', '/budgets', undefined, { userId })).data.data
  for (const budget of budgets) {
    await request(base, 'DELETE', `/budgets/${budget.id}`, undefined, { userId })
  }
  for (const category of await getCategories(base, userId)) {
    await request(base, 'DELETE', `/categories/${category.id}`, undefined, { userId })
  }
  for (const seed of SEED_CATEGORIES) {
    await request(base, 'POST', '/categories', seed, { userId })
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
