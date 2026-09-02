const { getPrisma } = require('../src/lib/prisma')

const categories = [
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

async function main() {
  const prisma = await getPrisma()
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }
  const count = await prisma.category.count()
  console.log(`Seed completed. ${count} categories.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})