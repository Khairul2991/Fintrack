import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import EmptyState from '../components/common/EmptyState'
import { formatCurrency, formatMonth, formatNumber, formatPercent, formatInsightMetric } from '../utils/format'
import { getAiInsights } from '../services/aiInsightsApi'
import { useLanguage } from '../context/LanguageContext'

const STORAGE_KEY = 'fintrack-ai-view'

function currentMonthYear() {
  const now = new Date()
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
}

function readView() {
  const current = currentMonthYear()
  if (typeof localStorage === 'undefined') return current
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return current
  const match = stored.match(/^(\d{4})-(\d{1,2})$/)
  if (!match) return current
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return current
  return { month, year }
}

function monthLabel(view) {
  return formatMonth(`${view.year}-${String(view.month).padStart(2, '0')}`)
}

function shiftMonth(view, delta) {
  const date = new Date(Date.UTC(view.year, view.month - 1 + delta, 1))
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() }
}

function sameMonth(a, b) {
  return a.month === b.month && a.year === b.year
}

function formatMetricValue(value) {
  return formatCurrency(value)
}

function formatMetricWithUnit(value, format) {
  return formatInsightMetric(value, format)
}

function currentMetricLabel(type) {
  if (type === 'spending') return 'ai.metric.spending.current'
  if (type === 'budget') return 'ai.metric.budget.current'
  if (type === 'goal') return 'ai.metric.goal.current'
  if (type === 'behavior') return 'ai.metric.behavior.current'
  if (type === 'recommendation') return 'ai.metric.recommendation.current'
  return 'ai.metric.cashflow.current'
}

function SeverityBadge({ severity }) {
  const { t } = useLanguage()
  const tone =
    severity === 'positive'
      ? 'badge-success'
      : severity === 'warning'
        ? 'badge-warning'
        : severity === 'critical'
          ? 'badge-error'
          : 'badge-ghost'
  const labelKey = `ai.sev.${severity}`
  return <span className={`badge badge-sm ${tone}`}>{t(labelKey)}</span>
}

function TypeLabel({ type }) {
  const { t } = useLanguage()
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-base-content/50">
      {t(`ai.type.${type}`)}
    </span>
  )
}

function ChangePill({ change }) {
  const { t } = useLanguage()
  if (change === null || change === undefined) return null
  const value = Number(change)
  const absValue = `${formatNumber(Math.abs(value))}%`
  if (value > 0) {
    return (
      <span className="text-sm font-medium text-error">
        {t('ai.trendUp', { value: absValue })}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="text-sm font-medium text-success">
        {t('ai.trendDown', { value: absValue })}
      </span>
    )
  }
  return <span className="text-sm text-base-content/60">{t('ai.trendFlat')}</span>
}

function InsightCard({ insight }) {
  const { t } = useLanguage()
  return (
    <div className="card surface card-border">
      <div className="card-body min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TypeLabel type={insight.type} />
          <SeverityBadge severity={insight.severity} />
        </div>
        <h3 className="card-title text-base font-semibold">{insight.title}</h3>
        {insight.explanation ? (
          <p className="text-sm text-base-content/80">{insight.explanation}</p>
        ) : null}
        {insight.recommendation ? (
          <p className="text-sm">
            <span className="font-medium">{t('ai.recommendation')}</span>{' '}
            {insight.recommendation}
          </p>
        ) : null}
        {insight.metrics &&
        (insight.metrics.current !== null ||
          insight.metrics.previous !== null ||
          insight.metrics.changePercent !== null) ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-base-200 pt-2 text-sm">
            {insight.metrics.current !== null ? (
              <span className="tabular-nums">
                {t(currentMetricLabel(insight.type))}{' '}
                <span className="font-medium">
                  {formatMetricWithUnit(insight.metrics.current, insight.metricFormats?.current)}
                </span>
              </span>
            ) : null}
            {insight.metrics.previous !== null ? (
              <span className="tabular-nums">
                {t('ai.metricPrevious')}{' '}
                <span className="font-medium">
                  {formatMetricWithUnit(insight.metrics.previous, insight.metricFormats?.previous)}
                </span>
              </span>
            ) : null}
            {insight.metrics.changePercent !== null ? (
              <ChangePill change={insight.metrics.changePercent} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AiInsightsPage() {
  const { t, translateError, lang } = useLanguage()
  const [view, setView] = useState(readView)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    getAiInsights({ month: view.month, year: view.year, lang })
      .then((response) => {
        setData(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message) || t('ai.loadError'))
        setStatus('error')
      })
  }, [view, lang, t, translateError])

  useEffect(() => {
    load()
  }, [load])

  function changeView(next) {
    if (!sameMonth(next, view)) {
      setStatus('loading')
      setView(next)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, `${next.year}-${next.month}`)
      }
    }
  }

  function retry() {
    setStatus('loading')
    load()
  }

  const isCurrent = sameMonth(view, currentMonthYear())
  const metrics = data?.metrics

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => changeView(shiftMonth(view, -1))}
              aria-label={t('bud.prevMonthAria')}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-sm join-item no-animation"
              onClick={() => changeView(currentMonthYear())}
              aria-label={t('bud.currentMonthAria')}
            >
              {monthLabel(view)}
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => changeView(shiftMonth(view, 1))}
              aria-label={t('bud.nextMonthAria')}
            >
              ›
            </button>
          </div>
          {isCurrent ? (
            <span className="badge badge-ghost">{t('bud.currentMonth')}</span>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => changeView(currentMonthYear())}
            >
              {t('bud.goCurrent')}
            </button>
          )}
        </div>
      </PageHeader>

      {status === 'loading' ? (
        <div className="card surface card-border">
          <div className="card-body">
            <LoadingSkeleton rows={6} />
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="card surface card-border">
          <div role="alert" className="card-body">
            <div className="flex items-center justify-between gap-2">
              <span>{t('ai.loadError')} {loadError}</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={retry}>
                {t('common.retry')}
              </button>
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${data.source === 'ai' ? 'badge-primary' : 'badge-ghost'}`}
            >
              {data.source === 'ai'
                ? t('ai.sourceAi')
                : data.aiConfigured
                  ? t('ai.sourceRuleConfigured')
                  : t('ai.sourceRuleNotConfigured')}
            </span>
            <span className="text-sm text-base-content/50 tabular-nums">
              {t('ai.transactions')}: {metrics.transactionCount}
            </span>
          </div>

          <div className="card surface card-border">
            <div className="card-body min-w-0">
              <h2 className="text-base font-semibold">{t('ai.summaryLabel')}</h2>
              {data.summary ? (
                <p className="text-sm text-base-content/80">{data.summary}</p>
              ) : (
                <EmptyState title={t('ai.noData')} message={t('ai.noDataMsg')} />
              )}
            </div>
          </div>

          {Number(metrics.expense) > 0 || Number(metrics.income) > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  label={t('ai.metricIncome')}
                  value={formatMetricValue(metrics.income)}
                  tone="success"
                />
                <MetricCard
                  label={t('ai.metricExpense')}
                  value={formatMetricValue(metrics.expense)}
                  tone="error"
                />
                <MetricCard
                  label={t('ai.metricNet')}
                  value={formatMetricValue(metrics.net)}
                  tone={Number(metrics.net) >= 0 ? 'success' : 'error'}
                />
                <MetricCard label={t('ai.metricSavings')} value={formatPercent(metrics.savingsRate)} />
              </div>

              {metrics.topCategories && metrics.topCategories.length > 0 ? (
                <div className="card surface card-border">
                  <div className="card-body min-w-0">
                    <h3 className="card-title text-base font-semibold">{t('ai.topCategories')}</h3>
                    <ul className="flex flex-col gap-3">
                      {metrics.topCategories.map((category) => (
                        <li key={category.name}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0">{category.name}</span>
                            <span className="financial-value tabular-nums text-base-content/60">
                              {formatCurrency(category.total)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <progress
                              className="progress progress-primary h-2 w-full"
                              value={formatNumber(category.share)}
                              max="100"
                            />
                            <span className="w-12 text-right text-xs tabular-nums text-base-content/60">
                              {formatNumber(category.share)}%
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <h2 className="flex items-center gap-3 pt-2 text-lg font-bold">
                {t('ai.insightsTitle')}
              </h2>
              {data.insights && data.insights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {data.insights.map((insight, index) => (
                    <InsightCard key={`${insight.type}-${index}`} insight={insight} />
                  ))}
                </div>
              ) : (
                <div className="card surface card-border">
                  <div className="card-body">
                    <EmptyState title={t('ai.noInsights')} message={t('ai.noInsightsMsg')} />
                  </div>
                </div>
              )}
            </>
          ) : null}

          <p className="pt-2 text-xs text-base-content/50">{t('ai.disclaimer')}</p>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, tone }) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'error'
        ? 'text-error'
        : 'text-base-content'
  return (
    <div className="card surface card-border rounded-box p-4 min-w-0">
      <p className="text-xs text-base-content/60">{label}</p>
      <p className={`financial-value mt-1 text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}

export default AiInsightsPage