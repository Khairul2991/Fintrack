const { AppError } = require('../utils/appError')
const { getPrisma } = require('../lib/prisma')
const { requireText } = require('../utils/validate')

const NAME_MAX = 50

async function ensureCategoryExists(prisma, categoryId, status = 404) {
  const found = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })
  if (!found) {
    throw new AppError('Category not found.', status)
  }
  return found
}

function parseCategoryInput(body) {
  const name = requireText(body.name, 'Name')
  if (name.length > NAME_MAX) {
    throw new AppError(`Name must be at most ${NAME_MAX} characters.`, 400)
  }
  const icon = requireText(body.icon, 'Icon')
  const color = requireText(body.color, 'Color')
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new AppError('Color must be a hex value like #f59e0b.', 400)
  }
  return { name, icon, color }
}

async function listCategories() {
  const prisma = await getPrisma()
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}

async function getCategory(id) {
  const prisma = await getPrisma()
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) {
    throw new AppError('Category not found.', 404)
  }
  return category
}

async function createCategory(body) {
  const prisma = await getPrisma()
  return prisma.category.create({ data: parseCategoryInput(body) })
}

async function updateCategory(id, body) {
  const prisma = await getPrisma()
  await ensureCategoryExists(prisma, id)
  return prisma.category.update({ where: { id }, data: parseCategoryInput(body) })
}

async function deleteCategory(id) {
  const prisma = await getPrisma()
  await ensureCategoryExists(prisma, id)
  const usedCount =
    (await prisma.transaction.count({ where: { categoryId: id } })) +
    (await prisma.budget.count({ where: { categoryId: id } }))
  if (usedCount > 0) {
    throw new AppError('This category cannot be deleted because it is currently in use.', 409)
  }
  await prisma.category.delete({ where: { id } })
  return { id: Number(id) }
}

module.exports = {
  ensureCategoryExists,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
}