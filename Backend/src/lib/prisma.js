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

function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('../generated/prisma/client.mts').then(({ PrismaClient }) => {
      const schema = schemaFromUrl(process.env.DATABASE_URL)
      const adapter = schema
        ? new PrismaPg(process.env.DATABASE_URL, { schema })
        : new PrismaPg(process.env.DATABASE_URL)
      return new PrismaClient({ adapter })
    })
  }
  return prismaPromise
}

module.exports = { getPrisma, getDecimal }