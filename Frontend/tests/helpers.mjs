import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.resolve(DIR, '../../Backend')
const PORT = 3101

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

export async function startBackend() {
  child = spawn(
    'node',
    ['--env-file=.env', 'server.js'],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        DATABASE_URL: 'file:./database/test-fe.db',
        PORT: String(PORT),
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
            return realFetch(base + url, init)
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
  const res = await realFetch(`http://127.0.0.1:${PORT}${path}`, {
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