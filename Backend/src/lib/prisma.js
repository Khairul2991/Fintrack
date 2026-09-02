require('dotenv').config()

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')

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

function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('../generated/prisma/client.mts').then(({ PrismaClient }) => {
      const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
      return new PrismaClient({ adapter })
    })
  }
  return prismaPromise
}

module.exports = { getPrisma, getDecimal }