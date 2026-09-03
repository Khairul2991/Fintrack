const INCREASED = /^Your expenses increased compared to last month\.$/
const DECREASED = /^Your expenses decreased compared to last month\.$/
const HIGHEST_CATEGORY = /^(.+) is your highest spending category this month\.$/
const EXCEEDED_BUDGET = /^You have exceeded your (.+) budget\.$/

export function translateInsight(text, lang) {
  if (lang !== 'id' || typeof text !== 'string') return text

  if (INCREASED.test(text)) return 'Pengeluaran Anda meningkat dibanding bulan lalu.'
  if (DECREASED.test(text)) return 'Pengeluaran Anda menurun dibanding bulan lalu.'

  let match = text.match(HIGHEST_CATEGORY)
  if (match) return `${match[1]} adalah kategori pengeluaran tertinggi bulan ini.`

  match = text.match(EXCEEDED_BUDGET)
  if (match) return `Anda telah melebihi anggaran ${match[1]}.`

  return text
}