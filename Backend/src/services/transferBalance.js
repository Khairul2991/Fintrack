const { getDecimal } = require('../lib/prisma')

async function getTransferFlow(prisma, userId, accountIds) {
  const Decimal = await getDecimal()
  const [out, into] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: { userId, type: 'TRANSFER', accountId: { in: accountIds } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['transferAccountId'],
      where: { userId, type: 'TRANSFER', transferAccountId: { in: accountIds } },
      _sum: { amount: true },
    }),
  ])
  const transferOut = new Map(out.map((row) => [row.accountId, row._sum.amount ?? new Decimal(0)]))
  const transferIn = new Map(into.map((row) => [row.transferAccountId, row._sum.amount ?? new Decimal(0)]))
  return { transferOut, transferIn }
}

module.exports = { getTransferFlow }