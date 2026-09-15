const { getPrisma } = require('../lib/prisma')
const { ensureCashAccount } = require('./accountService')

async function resetAllUserData(userId) {
  const prisma = await getPrisma()
  await prisma.$transaction(async (tx) => {
    await tx.goalActivity.deleteMany({ where: { goal: { userId } } })
    await tx.transaction.deleteMany({ where: { userId } })
    await tx.recurringTransaction.deleteMany({ where: { userId } })
    await tx.budget.deleteMany({ where: { userId } })
    await tx.recurringBudget.deleteMany({ where: { userId } })
    await tx.goal.deleteMany({ where: { userId } })
    await tx.account.deleteMany({ where: { userId } })
    await tx.category.deleteMany({ where: { userId, isSystem: false } })
    await tx.notification.deleteMany({ where: { userId } })
    await ensureCashAccount(tx, userId)
  })
  return { reset: true }
}

module.exports = {
  resetAllUserData,
}
