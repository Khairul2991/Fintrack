const { getPrisma } = require('../lib/prisma')
const { DEFAULT_CATEGORIES } = require('../utils/defaultCategories')

async function provisionLocalUser({ authUserId, email, name }) {
  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { authUserId },
      select: { id: true, authUserId: true, email: true, name: true },
    })
    if (existing) {
      return existing
    }
    const user = await tx.user.create({
      data: {
        authUserId,
        email,
        name: name || null,
        categories: {
          create: DEFAULT_CATEGORIES.map((category) => ({
            name: category.name,
            icon: category.icon,
            color: category.color,
          })),
        },
      },
      select: { id: true, authUserId: true, email: true, name: true },
    })
    return user
  })
}

async function getLocalUserByAuthId(authUserId) {
  const prisma = await getPrisma()
  return prisma.user.findUnique({
    where: { authUserId },
    select: { id: true, authUserId: true, email: true, name: true },
  })
}

module.exports = { provisionLocalUser, getLocalUserByAuthId }