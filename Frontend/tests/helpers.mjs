import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const DIR = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.resolve(DIR, '../../Backend')
const PORT = 3101

require(path.join(BACKEND_DIR, 'node_modules/dotenv')).config({ path: path.join(BACKEND_DIR, '.env') })

export const TEST_SCHEMA = 'fintrack_test_fe'

function withSchema(url, schema) {
  const qIndex = url.indexOf('?')
  const params = new URLSearchParams(qIndex === -1 ? '' : url.slice(qIndex + 1))
  params.set('schema', schema)
  return `${qIndex === -1 ? url : url.slice(0, qIndex)}?${params.toString()}`
}

const BASE_DB_URL = process.env.DATABASE_URL
if (!BASE_DB_URL) {
  throw new Error('DATABASE_URL must be configured (load Backend/.env) before running the frontend suite.')
}

const TEST_DB_URL = withSchema(BASE_DB_URL, TEST_SCHEMA)

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

let realFetch
let child
let testUserId

export async function startBackend() {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = TEST_DB_URL

  const { Pool } = require(path.resolve(BACKEND_DIR, 'node_modules/pg'))
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

  const { getPrisma } = require(path.resolve(BACKEND_DIR, 'src/lib/prisma.js'))
  const prisma = await getPrisma()
  const existing = await prisma.user.findUnique({ where: { authUserId: 'fe-test-user' } })
  if (existing) {
    testUserId = existing.id
  } else {
    const user = await prisma.user.create({
      data: {
        authUserId: 'fe-test-user',
        email: 'fe-test@fintrack.local',
        name: 'FE Test',
      },
    })
    testUserId = user.id
  }
  await prisma.$disconnect()

  child = spawn(
    'node',
    ['--env-file=.env', 'server.js'],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
        PORT: String(PORT),
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  child.stdout.on('data', () => {})
  child.stderr.on('data', () => {})

  const base = `http://127.0.0.1:${PORT}`
  for (let i = 0; i < 120; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    try {
      const res = await fetch(`${base}/api/health`)
      if (res.ok) {
        realFetch = globalThis.fetch
        globalThis.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : input && input.url
          if (typeof url === 'string' && url.startsWith('/api')) {
            const mergedHeaders = { 'x-test-user-id': String(testUserId), ...init?.headers }
            return realFetch(base + url, { ...init, headers: mergedHeaders })
          }
          return realFetch(input, init)
        }
        return base
      }
    } catch {
      // backend not ready yet
    }
  }
  throw new Error('Backend failed to start for frontend tests.')
}

export function stopBackend() {
  if (child) {
    child.kill()
    child = null
  }
}

export async function request(method, path, body) {
  const headers = { 'x-test-user-id': String(testUserId) }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  const res = await realFetch(`http://127.0.0.1:${PORT}${path}`, {
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

export async function resetDb() {
  const txs = (await request('GET', '/api/transactions?page=1&limit=100')).data.data
  for (const tx of txs) {
    await request('DELETE', `/api/transactions/${tx.id}`)
  }
  const budgets = (await request('GET', '/api/budgets')).data.data
  for (const budget of budgets) {
    await request('DELETE', `/api/budgets/${budget.id}`)
  }
  const categories = (await request('GET', '/api/categories')).data.data
  for (const category of categories) {
    await request('DELETE', `/api/categories/${category.id}`)
  }
  for (const seed of SEED_CATEGORIES) {
    await request('POST', '/api/categories', seed)
  }
}

export function isoDate(year, month, day) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function currentKeys() {
  const now = new Date()
  return { curY: now.getUTCFullYear(), curM: now.getUTCMonth() + 1 }
}
