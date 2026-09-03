const SYSTEM_CATEGORIES = {
  Food: { en: 'Food', id: 'Makanan' },
  Transport: { en: 'Transport', id: 'Transportasi' },
  Shopping: { en: 'Shopping', id: 'Belanja' },
  Entertainment: { en: 'Entertainment', id: 'Hiburan' },
  Bills: { en: 'Bills', id: 'Tagihan' },
  Health: { en: 'Health', id: 'Kesehatan' },
  Education: { en: 'Education', id: 'Pendidikan' },
  Salary: { en: 'Salary', id: 'Gaji' },
  Freelance: { en: 'Freelance', id: 'Freelance' },
  Other: { en: 'Other', id: 'Lainnya' },
}

export function isSystemCategory(category) {
  return Boolean(category && Object.prototype.hasOwnProperty.call(SYSTEM_CATEGORIES, category.name))
}

export function localizeCategory(category, lang) {
  if (!category) return ''
  const entry = SYSTEM_CATEGORIES[category.name]
  if (entry && entry[lang]) return entry[lang]
  return category.name
}
