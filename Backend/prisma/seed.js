const { getPrisma } = require('../src/lib/prisma')

async function main() {
  const prisma = await getPrisma()

  const legacy = await prisma.user.findUnique({
    where: { authUserId: 'legacy-admin' },
    select: { id: true, authUserId: true, email: true },
  })

  if (!legacy) {
    console.log('No legacy-admin user present. System categories are global and apply to all users.')
  } else {
    console.log(`Legacy admin present: id=${legacy.id} authUserId=${legacy.authUserId}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})