const { getPrisma, getDecimal } = require('../lib/prisma')
const { monthRange, MIN_YEAR, MAX_YEAR } = require('../utils/date')
const { integer } = require('../utils/validate')
const { AppError } = require('../utils/appError')
const { aiConfig, AI_MAX_INSIGHTS, AI_MIN_INSIGHTS } = require('../utils/aiConfig')
const { getExpenseByCategory } = require('./reportService')
const { listGoals } = require('./goalService')

const AI_TYPES = ['spending', 'budget', 'cashflow', 'goal', 'behavior', 'recommendation']
const AI_SEVERITIES = ['positive', 'info', 'warning', 'critical']
const METRIC_FORMATS = ['currency', 'percentage', 'number', 'count', 'date']

const TYPE_METRIC_FORMATS = {
  spending: { current: 'currency', previous: 'currency', changePercent: 'percentage' },
  budget: { current: 'percentage', previous: 'currency', changePercent: 'percentage' },
  cashflow: { current: 'percentage', previous: 'currency', changePercent: 'percentage' },
  goal: { current: 'percentage', previous: 'currency', changePercent: 'percentage' },
  behavior: { current: 'percentage', previous: 'currency', changePercent: 'percentage' },
  recommendation: { current: null, previous: null, changePercent: null },
}

const EXPENSE_SURGE_PCT = 20
const EXPENSE_DROP_PCT = 20
const LOW_SAVINGS_RATE = 10
const GOOD_SAVINGS_RATE = 20
const CONCENTRATION_PCT = 30
const BUDGET_NEAR_PCT = 90
const BUDGET_OVER_PCT = 100

const LANG_STRINGS = {
  en: {
    emptyTitle: 'No data yet',
    emptySummary: 'Add income and expenses to see financial insights for this period.',
    fallbackSpendingUpTitle: 'Spending increased sharply',
    fallbackSpendingUpExplanation:
      'Your expenses rose significantly compared to the previous month.',
    fallbackSpendingUpRecommendation: 'Review your larger transactions this month to see what drove the increase.',
    fallbackSpendingDownTitle: 'Spending decreased',
    fallbackSpendingDownExplanation:
      'Your expenses fell compared to the previous month.',
    fallbackSpendingDownRecommendation: 'If the decrease is sustainable, consider setting aside the difference as savings.',
    fallbackLowSavingsTitle: 'Savings rate is low',
    fallbackLowSavingsExplanation:
      'You are saving a small share of your income this month.',
    fallbackLowSavingsRecommendation: 'Aim to set aside at least 10% of your income.',
    fallbackGoodSavingsTitle: 'Good savings rate',
    fallbackGoodSavingsExplanation:
      'You kept a healthy share of your income as savings this month.',
    fallbackGoodSavingsRecommendation: 'Keep it up and reinforce this habit next month.',
    fallbackConcentrationTitle: 'Spending is concentrated',
    fallbackConcentrationExplanation:
      'A large share of your spending went to one category: {category}.',
    fallbackConcentrationRecommendation:
      'Review your spending on that category to look for savings opportunities.',
    fallbackBudgetNearTitle: 'Budget nearly reached',
    fallbackBudgetNearExplanation:
      'You are close to your monthly budget for one or more categories.',
    fallbackBudgetNearRecommendation: 'Slow spending in that category for the rest of the month.',
    fallbackBudgetOverTitle: 'Budget exceeded',
    fallbackBudgetOverExplanation:
      'You have spent more than your monthly budget for one or more categories.',
    fallbackBudgetOverRecommendation: 'Review that category and adjust the budget if spending is justified.',
    fallbackGoalAtRiskTitle: 'A goal needs attention',
    fallbackGoalAtRiskExplanation:
      'One of your savings goals is progressing slowly towards its target.',
    fallbackGoalAtRiskRecommendation: 'Consider contributing a little more this month.',
    fallbackGoalDoneTitle: 'Goal reached',
    fallbackGoalDoneExplanation: 'You have completed a savings goal.',
    fallbackGoalDoneRecommendation: 'Celebrate your progress and set a new goal.',
    fallbackNoExpenseTitle: 'No expenses this month',
    fallbackNoExpenseExplanation: 'No expense transactions were recorded for this period.',
    fallbackNoIncomeTitle: 'No income this month',
    fallbackNoIncomeExplanation: 'No income transactions were recorded for this period.',
  },
  id: {
    emptyTitle: 'Belum ada data',
    emptySummary: 'Tambahkan pendapatan dan pengeluaran untuk melihat wawasan keuangan periode ini.',
    fallbackSpendingUpTitle: 'Pengeluaran meningkat tajam',
    fallbackSpendingUpExplanation:
      'Pengeluaran Anda naik signifikan dibanding bulan sebelumnya.',
    fallbackSpendingUpRecommendation: 'Tinjau transaksi terbesar bulan ini untuk melihat penyebab kenaikan.',
    fallbackSpendingDownTitle: 'Pengeluaran menurun',
    fallbackSpendingDownExplanation:
      'Pengeluaran Anda turun dibanding bulan sebelumnya.',
    fallbackSpendingDownRecommendation: 'Jika penurunan berlanjut, pertimbangkan menyisihkan selisihnya sebagai tabungan.',
    fallbackLowSavingsTitle: 'Rasio tabungan rendah',
    fallbackLowSavingsExplanation:
      'Anda menabung dalam porsi kecil dari pendapatan bulan ini.',
    fallbackLowSavingsRecommendation: 'Targetkan menyisihkan setidaknya 10% dari pendapatan.',
    fallbackGoodSavingsTitle: 'Rasio tabungan baik',
    fallbackGoodSavingsExplanation:
      'Sebagian besar pendapatan Anda disimpan sebagai tabungan.',
    fallbackGoodSavingsRecommendation: 'Pertahankan dan perkuat kebiasaan ini bulan depan.',
    fallbackConcentrationTitle: 'Pengeluaran terkonsentrasi',
    fallbackConcentrationExplanation:
      'Sebagian besar pengeluaran Anda terkonsentrasi pada kategori {category}.',
    fallbackConcentrationRecommendation:
      'Tinjau pengeluaran pada kategori tersebut untuk mencari peluang penghematan.',
    fallbackBudgetNearTitle: 'Anggaran hampir tercapai',
    fallbackBudgetNearExplanation:
      'Anda hampir mencapai anggaran bulanan untuk satu atau lebih kategori.',
    fallbackBudgetNearRecommendation: 'Kurangi pengeluaran kategori tersebut hingga akhir bulan.',
    fallbackBudgetOverTitle: 'Anggaran terlampaui',
    fallbackBudgetOverExplanation:
      'Anda telah menghabiskan lebih dari anggaran bulanan untuk satu atau lebih kategori.',
    fallbackBudgetOverRecommendation: 'Tinjau kategori tersebut dan sesuaikan anggaran jika wajar.',
    fallbackGoalAtRiskTitle: 'Tujuan perlu perhatian',
    fallbackGoalAtRiskExplanation:
      'Salah satu tujuan tabungan Anda berjalan lambat menuju target.',
    fallbackGoalAtRiskRecommendation: 'Pertimbangkan menambah kontribusi bulan ini.',
    fallbackGoalDoneTitle: 'Tujuan tercapai',
    fallbackGoalDoneExplanation: 'Anda telah menyelesaikan tujuan tabungan.',
    fallbackGoalDoneRecommendation: 'Rayakan kemajuan Anda dan buat tujuan baru.',
    fallbackNoExpenseTitle: 'Tidak ada pengeluaran bulan ini',
    fallbackNoExpenseExplanation: 'Tidak ada transaksi pengeluaran yang dicatat untuk periode ini.',
    fallbackNoIncomeTitle: 'Tidak ada pendapatan bulan ini',
    fallbackNoIncomeExplanation: 'Tidak ada transaksi pendapatan yang dicatat untuk periode ini.',
  },
}

function safePct(numerator, denominator) {
  const num = Number(numerator)
  const den = Number(denominator)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0
  return (num / den) * 100
}

function parseMonthYear(query) {
  const month = query.month === undefined || query.month === null || query.month === ''
    ? null
    : integer(query.month, 'month', { min: 1, max: 12 })
  const year = query.year === undefined || query.year === null || query.year === ''
    ? null
    : integer(query.year, 'year', { min: MIN_YEAR, max: MAX_YEAR })
  return { month, year }
}

function round(n) {
  if (n === null || n === undefined) return null
  const value = Number(n)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

async function buildContext(month, year) {
  const prisma = await getPrisma()
  const Decimal = await getDecimal()
  const range = monthRange(month, year)
  const prevRange = monthRange(month - 1 === 0 ? 12 : month - 1, month - 1 === 0 ? year - 1 : year)

  const incomeAgg = await prisma.transaction.aggregate({
    where: { type: 'INCOME', date: { gte: range.gte, lt: range.lt } },
    _sum: { amount: true },
  })
  const expenseAgg = await prisma.transaction.aggregate({
    where: { type: 'EXPENSE', date: { gte: range.gte, lt: range.lt } },
    _sum: { amount: true },
  })
  const prevExpenseAgg = await prisma.transaction.aggregate({
    where: { type: 'EXPENSE', date: { gte: prevRange.gte, lt: prevRange.lt } },
    _sum: { amount: true },
  })

  const income = incomeAgg._sum.amount ?? new Decimal(0)
  const expense = expenseAgg._sum.amount ?? new Decimal(0)
  const prevExpense = prevExpenseAgg._sum.amount ?? new Decimal(0)
  const net = income.sub(expense)

  const transactionCount = await prisma.transaction.count({
    where: { date: { gte: range.gte, lt: range.lt } },
  })

  const topCategories = await getExpenseByCategory(prisma, { take: 5, month, year })

  const budgets = await prisma.budget.findMany({
    where: { month, year },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  })
  const budgetStatus = []
  for (const budget of budgets) {
    const spentAgg = await prisma.transaction.aggregate({
      where: { type: 'EXPENSE', categoryId: budget.categoryId, date: { gte: range.gte, lt: range.lt } },
      _sum: { amount: true },
    })
    const spent = spentAgg._sum.amount ?? new Decimal(0)
    const utilization = Number(budget.amount) > 0 ? Number(spent) / Number(budget.amount) : 0
    let status = 'On Track'
    if (Number(spent) >= Number(budget.amount)) {
      status = 'Over Budget'
    } else if (utilization * 100 >= BUDGET_NEAR_PCT) {
      status = 'Near Limit'
    }
    budgetStatus.push({
      category: budget.category.name,
      amount: budget.amount,
      spent,
      utilization,
      status,
    })
  }

  const goals = await listGoals()
  const goalSummary = goals.map((goal) => ({
    name: goal.name,
    progress: round(goal.progress),
    status: goal.status,
  }))

  const largestTransactions = await prisma.transaction.findMany({
    where: { date: { gte: range.gte, lt: range.lt } },
    orderBy: { amount: 'desc' },
    take: 3,
    select: {
      amount: true,
      type: true,
      description: true,
      category: { select: { name: true } },
    },
  })

  const expenseChangePercent =
    Number(prevExpense) > 0
      ? ((Number(expense) - Number(prevExpense)) / Number(prevExpense)) * 100
      : null

  const savingsRate = Number(income) > 0
    ? ((Number(income) - Number(expense)) / Number(income)) * 100
    : null

  return {
    period: `${month}-${year}`,
    income,
    expense,
    net,
    savingsRate,
    transactionCount,
    prevMonthExpense: prevExpense,
    expenseChangePercent,
    topCategories: topCategories.map((category) => ({
      name: category.name,
      total: category.total,
      share: safePct(category.total, expense),
    })),
    budgetStatus,
    goals: goalSummary,
    largestTransactions: largestTransactions.map((transaction) => ({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category ? transaction.category.name : '',
    })),
  }
}

function contextToPrompt(context, lang) {
  return [
    'You are a concise personal finance insights assistant for a single-user app.',
    'All financial calculations are provided by the backend as exact numbers. Never recalculate, add, subtract, multiply, or otherwise recompute income, expense, net cash flow, savings rate, percentages, or amounts.',
    'Never invent or alter any financial number. Do NOT change supplied metrics. Use the supplied metrics only to interpret and describe them.',
    'Return strictly valid JSON matching this schema:',
    '{"summary":"string","insights":[{"type":"spending|budget|cashflow|goal|behavior|recommendation","severity":"positive|info|warning|critical","title":"string","explanation":"string","recommendation":"string","metrics":{"current":"number|null","previous":"number|null","changePercent":"number|null"}}]}',
    'Units are fixed: values like savingsRate, category/percentage shares, expenseChangePercent, budget utilization, and goal progress are PERCENTAGES (0 to 100). Income, expense, net cash flow, budget amounts, and category totals are CURRENCY. Present each number in the right unit in every sentence — never label a percentage as currency.',
    'For example if savingsRate is 59.82, it means 59.82%, not 59.82 in a currency.',
    `Return between ${AI_MIN_INSIGHTS} and ${AI_MAX_INSIGHTS} insights.`,
    `Reply entirely in ${lang === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English'}.`,
    '',
    'DATA:',
    JSON.stringify(context),
  ].join('\n')
}

function sanitizeAiText(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length > 500) return trimmed.slice(0, 500)
  return trimmed
}

function roundMetric(value, reference) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return reference !== null && reference !== undefined ? round(reference) : null
  return Math.round(n * 100) / 100
}

function sanitizeFormat(value, fallback) {
  if (METRIC_FORMATS.includes(value)) return value
  return fallback || null
}

function metricFormatsFor(type, supplied) {
  const defaults = TYPE_METRIC_FORMATS[type] || TYPE_METRIC_FORMATS.recommendation
  const source = supplied && typeof supplied === 'object' ? supplied : {}
  return {
    current: sanitizeFormat(source.current, defaults.current),
    previous: sanitizeFormat(source.previous, defaults.previous),
    changePercent: sanitizeFormat(source.changePercent, defaults.changePercent),
  }
}

function sanitizeInsight(insight, lang) {
  if (!insight || typeof insight !== 'object') return null
  if (!AI_TYPES.includes(insight.type)) return null
  if (!AI_SEVERITIES.includes(insight.severity)) return null
  const title = sanitizeAiText(insight.title)
  const explanation = sanitizeAiText(insight.explanation)
  const recommendation = sanitizeAiText(insight.recommendation)
  if (!title || !explanation || !recommendation) return null
  const metrics = insight.metrics && typeof insight.metrics === 'object' ? insight.metrics : {}
  const current = roundMetric(metrics.current, null)
  const previous = roundMetric(metrics.previous, null)
  const changePercent = roundMetric(metrics.changePercent, null)
  return {
    type: insight.type,
    severity: insight.severity,
    title,
    explanation,
    recommendation,
    metrics: { current, previous, changePercent },
    metricFormats: metricFormatsFor(insight.type, insight.metricFormats),
    source: 'ai',
  }
}

function sanitizeAiResponse(parsed, lang) {
  if (!parsed || typeof parsed !== 'object') return null
  const summary = sanitizeAiText(parsed.summary)
  if (!summary) return null
  if (!Array.isArray(parsed.insights)) return null
  const insights = parsed.insights.map((item) => sanitizeInsight(item, lang)).filter(Boolean)
  if (insights.length < AI_MIN_INSIGHTS) return null
  return { summary, insights: insights.slice(0, AI_MAX_INSIGHTS) }
}

async function callAiProvider(context, lang, config, fetchFn = global.fetch) {
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: 'You are a helpful financial insights assistant.' },
      { role: 'user', content: contextToPrompt(context, lang) },
    ],
    temperature: 0.4,
  }
  const endpoint = config.provider.endsWith('/')
    ? config.provider
    : `${config.provider}/`
  const url = `${endpoint}chat/completions`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data && data.choices && data.choices[0] && typeof data.choices[0].message?.content === 'string'
      ? data.choices[0].message.content
      : null
    if (!content) return null
    const jsonStart = content.indexOf('{')
    const jsonEnd = content.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null
    const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1))
    return sanitizeAiResponse(parsed, lang)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function demandFallbackRules(context, lang) {
  const s = LANG_STRINGS[lang] || LANG_STRINGS.en
  const insights = []
  const metrics = {
    current: round(context.expense),
    previous: round(context.prevMonthExpense),
    changePercent: round(context.expenseChangePercent),
  }

  if (context.expenseChangePercent !== null && context.expenseChangePercent > EXPENSE_SURGE_PCT) {
    insights.push({
      type: 'spending',
      severity: 'warning',
      title: s.fallbackSpendingUpTitle,
      explanation: s.fallbackSpendingUpExplanation,
      recommendation: s.fallbackSpendingUpRecommendation,
      metrics,
      metricFormats: { current: 'currency', previous: 'currency', changePercent: 'percentage' },
      source: 'rule',
    })
  }

  if (context.expenseChangePercent !== null && context.expenseChangePercent < -EXPENSE_DROP_PCT) {
    insights.push({
      type: 'spending',
      severity: 'positive',
      title: s.fallbackSpendingDownTitle,
      explanation: s.fallbackSpendingDownExplanation,
      recommendation: s.fallbackSpendingDownRecommendation,
      metrics,
      metricFormats: { current: 'currency', previous: 'currency', changePercent: 'percentage' },
      source: 'rule',
    })
  }

  if (context.savingsRate !== null && context.savingsRate < LOW_SAVINGS_RATE) {
    insights.push({
      type: 'cashflow',
      severity: 'warning',
      title: s.fallbackLowSavingsTitle,
      explanation: s.fallbackLowSavingsExplanation,
      recommendation: s.fallbackLowSavingsRecommendation,
      metrics: { current: round(context.savingsRate), previous: null, changePercent: null },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  } else if (context.savingsRate !== null && context.savingsRate >= GOOD_SAVINGS_RATE) {
    insights.push({
      type: 'cashflow',
      severity: 'positive',
      title: s.fallbackGoodSavingsTitle,
      explanation: s.fallbackGoodSavingsExplanation,
      recommendation: s.fallbackGoodSavingsRecommendation,
      metrics: { current: round(context.savingsRate), previous: null, changePercent: null },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  }

  const topCategory = context.topCategories[0]
  if (topCategory && topCategory.share >= CONCENTRATION_PCT) {
    insights.push({
      type: 'behavior',
      severity: 'info',
      title: s.fallbackConcentrationTitle,
      explanation: s.fallbackConcentrationExplanation.replace('{category}', topCategory.name),
      recommendation: s.fallbackConcentrationRecommendation,
      metrics: { current: round(topCategory.share), previous: null, changePercent: null },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  }

  const overBudget = context.budgetStatus.find((budget) => budget.utilization * 100 >= BUDGET_OVER_PCT)
  const nearBudget = context.budgetStatus.find(
    (budget) => budget.utilization * 100 >= BUDGET_NEAR_PCT && budget.utilization * 100 < BUDGET_OVER_PCT,
  )
  if (overBudget) {
    insights.push({
      type: 'budget',
      severity: 'critical',
      title: s.fallbackBudgetOverTitle,
      explanation: s.fallbackBudgetOverExplanation,
      recommendation: s.fallbackBudgetOverRecommendation,
      metrics: {
        current: round(overBudget.utilization * 100),
        previous: null,
        changePercent: null,
      },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  } else if (nearBudget) {
    insights.push({
      type: 'budget',
      severity: 'warning',
      title: s.fallbackBudgetNearTitle,
      explanation: s.fallbackBudgetNearExplanation,
      recommendation: s.fallbackBudgetNearRecommendation,
      metrics: {
        current: round(nearBudget.utilization * 100),
        previous: null,
        changePercent: null,
      },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  }

  const atRiskGoal = context.goals.find((goal) => goal.status === 'IN_PROGRESS' && Number(goal.progress) < 20)
  const completedGoal = context.goals.find((goal) => goal.status === 'COMPLETED')
  if (completedGoal && !atRiskGoal) {
    insights.push({
      type: 'goal',
      severity: 'positive',
      title: s.fallbackGoalDoneTitle,
      explanation: s.fallbackGoalDoneExplanation,
      recommendation: s.fallbackGoalDoneRecommendation,
      metrics: { current: 100, previous: null, changePercent: null },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  } else if (atRiskGoal) {
    insights.push({
      type: 'goal',
      severity: 'warning',
      title: s.fallbackGoalAtRiskTitle,
      explanation: s.fallbackGoalAtRiskExplanation,
      recommendation: s.fallbackGoalAtRiskRecommendation,
      metrics: { current: round(atRiskGoal.progress), previous: null, changePercent: null },
      metricFormats: { current: 'percentage' },
      source: 'rule',
    })
  }

  if (Number(context.expense) <= 0) {
    insights.push({
      type: 'cashflow',
      severity: 'info',
      title: s.fallbackNoExpenseTitle,
      explanation: s.fallbackNoExpenseExplanation,
      recommendation: '',
      metrics: { current: 0, previous: null, changePercent: null },
      metricFormats: { current: 'currency' },
      source: 'rule',
    })
  }
  if (Number(context.income) <= 0) {
    insights.push({
      type: 'cashflow',
      severity: 'info',
      title: s.fallbackNoIncomeTitle,
      explanation: s.fallbackNoIncomeExplanation,
      recommendation: '',
      metrics: { current: round(context.expense), previous: round(context.prevMonthExpense), changePercent: round(context.expenseChangePercent) },
      metricFormats: { current: 'currency', previous: 'currency', changePercent: 'percentage' },
      source: 'rule',
    })
  }

  return insights
}

function nonEmptyMonthContext(context) {
  return Number(context.income) > 0 || Number(context.expense) > 0
}

async function getAiInsights(query, lang = 'en', fetchFn = global.fetch) {
  const { month, year } = parseMonthYear(query)
  const resolvedMonth = month
  const resolvedYear = year

  if (!resolvedMonth || !resolvedYear) {
    throw new AppError('month and year are required.', 400)
  }

  const context = await buildContext(resolvedMonth, resolvedYear)

  const s = LANG_STRINGS[lang] || LANG_STRINGS.en

  let aiResult = null
  const config = aiConfig()
  if (config && nonEmptyMonthContext(context)) {
    aiResult = await callAiProvider(context, lang, config, fetchFn)
  }

  let insights
  let source
  let summary
  if (aiResult) {
    insights = aiResult.insights
    source = 'ai'
    summary = aiResult.summary
  } else {
    insights = demandFallbackRules(context, lang)
    source = 'rule'
    if (!nonEmptyMonthContext(context)) {
      summary = s.emptySummary
      insights = [{
        type: 'cashflow',
        severity: 'info',
        title: s.emptyTitle,
        explanation: s.emptySummary,
        recommendation: '',
        metrics: { current: null, previous: null, changePercent: null },
        metricFormats: { current: null, previous: null, changePercent: null },
        source: 'rule',
      }]
    } else {
      summary = insights.length > 0 ? '' : s.emptySummary
    }
  }

  return {
    period: `${resolvedYear}-${String(resolvedMonth).padStart(2, '0')}`,
    month: resolvedMonth,
    year: resolvedYear,
    source,
    aiConfigured: Boolean(config),
    summary,
    metrics: {
      income: round(context.income),
      expense: round(context.expense),
      net: round(context.net),
      savingsRate: round(context.savingsRate),
      transactionCount: context.transactionCount,
      prevMonthExpense: round(context.prevMonthExpense),
      expenseChangePercent: round(context.expenseChangePercent),
      topCategories: context.topCategories.map((category) => ({
        name: category.name,
        total: round(category.total),
        share: round(category.share),
      })),
      budgetStatus: context.budgetStatus.map((budget) => ({
        category: budget.category,
        amount: round(budget.amount),
        spent: round(budget.spent),
        utilization: round(budget.utilization * 100),
        status: budget.status,
      })),
      goals: context.goals,
      largestTransactions: context.largestTransactions.map((transaction) => ({
        description: transaction.description,
        amount: round(transaction.amount),
        type: transaction.type,
        category: transaction.category,
      })),
    },
    insights,
  }
}

module.exports = { getAiInsights, buildContext, demandFallbackRules, sanitizeAiResponse }