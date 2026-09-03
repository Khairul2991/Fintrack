// Backend mirror of the frontend system-category localizer (see Frontend/src/l10n/categories.js).
// Only the 10 seeded/system category names are localized; custom names are kept as-is.

const SYSTEM_LOCALES = {
  en: {
    Food: 'Food',
    Transport: 'Transport',
    Shopping: 'Shopping',
    Entertainment: 'Entertainment',
    Bills: 'Bills',
    Health: 'Health',
    Education: 'Education',
    Salary: 'Salary',
    Freelance: 'Freelance',
    Other: 'Other',
  },
  id: {
    Food: 'Makanan',
    Transport: 'Transportasi',
    Shopping: 'Belanja',
    Entertainment: 'Hiburan',
    Bills: 'Tagihan',
    Health: 'Kesehatan',
    Education: 'Pendidikan',
    Salary: 'Gaji',
    Freelance: 'Freelance',
    Other: 'Lainnya',
  },
}

function localizeCategoryName(name, lang) {
  const table = SYSTEM_LOCALES[lang] || SYSTEM_LOCALES.en
  return table[name] || name
}

module.exports = { localizeCategoryName }