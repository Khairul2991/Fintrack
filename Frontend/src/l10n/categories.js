const SYSTEM_CATEGORIES = {
  Salary: { en: 'Salary', id: 'Gaji' },
  Allowance: { en: 'Allowance', id: 'Uang Saku' },
  Bonus: { en: 'Bonus', id: 'Bonus' },
  Dividends: { en: 'Dividends', id: 'Dividen' },
  Investments: { en: 'Investments', id: 'Investasi' },
  Lottery: { en: 'Lottery', id: 'Lotre' },
  Tips: { en: 'Tips', id: 'Tip' },
  Bills: { en: 'Bills', id: 'Tagihan' },
  Food: { en: 'Food', id: 'Makanan' },
  Shopping: { en: 'Shopping', id: 'Belanja' },
  Entertainment: { en: 'Entertainment', id: 'Hiburan' },
  Transportation: { en: 'Transportation', id: 'Transportasi' },
  Clothing: { en: 'Clothing', id: 'Pakaian' },
  Education: { en: 'Education', id: 'Pendidikan' },
  Fitness: { en: 'Fitness', id: 'Kebugaran' },
  Health: { en: 'Health', id: 'Kesehatan' },
  Pets: { en: 'Pets', id: 'Peliharaan' },
  Other: { en: 'Other', id: 'Lainnya' },
}

export function isSystemCategory(category) {
  return Boolean(category && (category.isSystem === true || Object.prototype.hasOwnProperty.call(SYSTEM_CATEGORIES, category.name)))
}

const SYSTEM_CATEGORY_ORDER = {
  INCOME: ['Salary', 'Allowance', 'Bonus', 'Tips', 'Dividends', 'Investments', 'Lottery', 'Other'],
  EXPENSE: [
    'Food',
    'Bills',
    'Shopping',
    'Entertainment',
    'Transportation',
    'Clothing',
    'Education',
    'Fitness',
    'Health',
    'Pets',
    'Other',
  ],
}

const systemOrderIndex = new Map()
for (const order of Object.values(SYSTEM_CATEGORY_ORDER)) {
  order.forEach((name, index) => {
    if (!systemOrderIndex.has(name)) systemOrderIndex.set(name, index)
  })
}

export function sortCategoriesForDisplay(categories, localize = (category) => category?.name || '') {
  return [...categories].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'INCOME' ? -1 : 1
    const aSystem = isSystemCategory(a)
    const bSystem = isSystemCategory(b)
    if (aSystem !== bSystem) return aSystem ? -1 : 1
    if (aSystem) {
      const aIndex = systemOrderIndex.has(a.name) ? systemOrderIndex.get(a.name) : Number.MAX_SAFE_INTEGER
      const bIndex = systemOrderIndex.has(b.name) ? systemOrderIndex.get(b.name) : Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    }
    return localize(a).localeCompare(localize(b))
  })
}

export function localizeCategory(category, lang) {
  if (!category) return ''
  const entry = SYSTEM_CATEGORIES[category.name]
  if (entry && entry[lang]) return entry[lang]
  return category.name
}

export function localizeCategoryName(name, lang) {
  if (!name) return ''
  return localizeCategory({ name }, lang)
}