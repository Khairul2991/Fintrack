// Backend mirror of the frontend system-category localizer (see Frontend/src/l10n/categories.js).
// System category names (global defaults) are localized; custom names are kept as-is.

const SYSTEM_LOCALES = {
  en: {
    Salary: 'Salary',
    Allowance: 'Allowance',
    Bonus: 'Bonus',
    Dividends: 'Dividends',
    Investments: 'Investments',
    Lottery: 'Lottery',
    Tips: 'Tips',
    Bills: 'Bills',
    Food: 'Food',
    Shopping: 'Shopping',
    Entertainment: 'Entertainment',
    Transportation: 'Transportation',
    Clothing: 'Clothing',
    Education: 'Education',
    Fitness: 'Fitness',
    Health: 'Health',
    Pets: 'Pets',
    Other: 'Other',
  },
  id: {
    Salary: 'Gaji',
    Allowance: 'Uang Saku',
    Bonus: 'Bonus',
    Dividends: 'Dividen',
    Investments: 'Investasi',
    Lottery: 'Lotre',
    Tips: 'Tip',
    Bills: 'Tagihan',
    Food: 'Makanan',
    Shopping: 'Belanja',
    Entertainment: 'Hiburan',
    Transportation: 'Transportasi',
    Clothing: 'Pakaian',
    Education: 'Pendidikan',
    Fitness: 'Kebugaran',
    Health: 'Kesehatan',
    Pets: 'Peliharaan',
    Other: 'Lainnya',
  },
}

function localizeCategoryName(name, lang) {
  const table = SYSTEM_LOCALES[lang] || SYSTEM_LOCALES.en
  return table[name] || name
}

module.exports = { localizeCategoryName }