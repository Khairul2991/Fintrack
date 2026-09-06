require('dotenv').config()

const { PrismaPg } = require('@prisma/adapter-pg')

let prismaPromise = null
let decimalPromise = null

function getDecimal() {
  if (!decimalPromise) {
    decimalPromise = import('../generated/prisma/internal/prismaNamespace.mts').then(
      (mod) => mod.Decimal,
    )
  }
  return decimalPromise
}

function schemaFromUrl(url) {
  if (!url || typeof url !== 'string') return undefined
  const qIndex = url.indexOf('?')
  if (qIndex === -1) return undefined
  return new URLSearchParams(url.slice(qIndex + 1)).get('schema') || undefined
}

const POOL_CONFIG = {
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
}

function buildPoolConfig(url) {
  return { ...POOL_CONFIG, connectionString: url }
}

function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('../generated/prisma/client.mts').then(({ PrismaClient }) => {
      const schema = schemaFromUrl(process.env.DATABASE_URL)
      const poolConfig = buildPoolConfig(process.env.DATABASE_URL)
      const adapter = schema
        ? new PrismaPg(poolConfig, { schema })
        : new PrismaPg(poolConfig)
      return new PrismaClient({ adapter })
    })
  }
  return prismaPromise
}

module.exports = { getPrisma, getDecimal }