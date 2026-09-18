const RECURRING_DUE_MSG = /^"(.+)" is due in your (.+) category\.$/
const BUDGET_EXCEEDED_MSG = /^You have exceeded your (.+) budget this month\.$/
const BUDGET_NEARING_MSG = /^Your (.+) budget is nearing its limit\.$/
const GOAL_DEADLINE_MSG = /^Your financial goal "(.+)" is due in (\d+) day\(s\)\.$/

const TYPE_TITLES_ID = {
  RECURRING_DUE: 'Transaksi berulang jatuh tempo',
  BUDGET_LIMIT: 'Batas anggaran',
  GOAL_DEADLINE: 'Batas waktu tujuan semakin dekat',
}

// Backend stores notifications as neutral English templates plus user data
// (category/description/goal names, day counts). Like translateInsight, the
// frontend re-localizes at render time so every notification follows the
// current UI language regardless of when it was generated.
export function translateNotification(item, lang) {
  if (!item || typeof item.message !== 'string') {
    return { title: item && item.title, message: item && item.message }
  }
  if (lang !== 'id') {
    return { title: item.title, message: item.message }
  }

  const message = item.message

  let match = message.match(RECURRING_DUE_MSG)
  if (match) {
    return {
      title: TYPE_TITLES_ID.RECURRING_DUE,
      message: `"${match[1]}" jatuh tempo di kategori ${match[2]} Anda.`,
    }
  }

  match = message.match(BUDGET_EXCEEDED_MSG)
  if (match) {
    return {
      title: 'Anggaran terlampaui',
      message: `Anda telah melebihi anggaran ${match[1]} bulan ini.`,
    }
  }

  match = message.match(BUDGET_NEARING_MSG)
  if (match) {
    return {
      title: 'Mendekati batas anggaran',
      message: `Anggaran ${match[1]} Anda hampir mencapai batas.`,
    }
  }

  match = message.match(GOAL_DEADLINE_MSG)
  if (match) {
    return {
      title: TYPE_TITLES_ID.GOAL_DEADLINE,
      message: `Tujuan keuangan Anda "${match[1]}" akan jatuh tempo dalam ${match[2]} hari.`,
    }
  }

  return { title: item.title, message }
}