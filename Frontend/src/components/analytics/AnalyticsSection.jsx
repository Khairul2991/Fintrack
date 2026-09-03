import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import LoadingSkeleton from '../common/LoadingSkeleton'
import EmptyState from '../common/EmptyState'
import { formatCurrency, formatCurrencyCompact, formatMonth } from '../../utils/format'
import { getAnalytics } from '../../services/analyticsApi'
import { useLanguage } from '../../context/LanguageContext'

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

function TrendLabel({ change }) {
  const { t } = useLanguage()
  if (change === null || change === undefined) return <span>—</span>
  const value = Math.abs(Number(change))
  if (Number(change) > 0) return <span className="text-error">{t('an.uptrend', { value: `${formatNumber(value)}%` })}</span>
  if (Number(change) < 0) return <span className="text-success">{t('an.downtrend', { value: `${formatNumber(value)}%` })}</span>
  return <span>{t('an.flat')}</span>
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function AnalyticsSection({ categoryById = {} }) {
  const { t, localizeCategory } = useLanguage()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    getAnalytics()
      .then((response) => {
        setLoadError('')
        setData(response.data)
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(error.message || t('an.loadError'))
        setStatus('error')
      })
  }, [t])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function retry() {
    setStatus('loading')
    setRefreshKey((key) => key + 1)
  }

  const noActivity =
    data &&
    Number(data.totalIncome) === 0 &&
    Number(data.totalExpense) === 0 &&
    data.transactionCount === 0

  if (status === 'loading') {
    return (
      <div className="card surface card-border">
        <div className="card-body">
          <LoadingSkeleton rows={6} />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card surface card-border">
        <div role="alert" className="card-body">
          <div className="flex items-center justify-between gap-2">
            <span>{t('an.loadError')} {loadError}</span>
            <button type="button" className="btn btn-sm btn-outline" onClick={retry}>
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  if (noActivity) {
    return (
      <div className="card surface card-border">
        <div className="card-body">
          <EmptyState title={t('an.empty')} message={t('an.emptyMsg')} />
        </div>
      </div>
    )
  }

  const trendData = data.monthlyTrend.map((item) => ({
    label: formatMonth(item.month),
    income: Number(item.income),
    expense: Number(item.expense),
  }))
  const hasTrend = trendData.some((entry) => entry.income > 0 || entry.expense > 0)

  const utilization = data.budgetUtilizationTrend

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <MetricCard label={t('an.totalIncome')} value={formatCurrency(data.totalIncome)} tone="success" />
      <MetricCard label={t('an.totalExpense')} value={formatCurrency(data.totalExpense)} tone="error" />
      <MetricCard
        label={t('an.netCashFlow')}
        value={formatCurrency(data.netCashFlow)}
        tone={Number(data.netCashFlow) >= 0 ? 'success' : 'error'}
      />
      <MetricCard label={t('an.avgMonthlyExpense')} value={formatCurrency(data.avgMonthlyExpense)} />
      <MetricCard label={t('an.avgTransaction')} value={formatCurrency(data.avgTransactionAmount)} />
      <MetricCard label={t('an.savingsRate')} value={formatSavings(data.savingsRate)} />

      <div className="card surface card-border lg:col-span-2">
        <div className="card-body">
          <h3 className="card-title text-base font-semibold">{t('an.monthlyTrend')}</h3>
          {hasTrend ? (
            <div role="img" aria-label={t('an.trendAria')}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-base-300)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tick={{ fill: 'var(--color-base-content)', opacity: 0.6 }}
                  />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    fontSize={12}
                    tick={{ fill: 'var(--color-base-content)', opacity: 0.6 }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: 'var(--color-base-100)',
                      border: '1px solid var(--color-base-300)',
                      borderRadius: 'var(--radius-field)',
                      color: 'var(--color-base-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, opacity: 0.8 }} />
                  <Bar dataKey="income" name={t('common.income')} fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t('common.expense')} fill="var(--color-error)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title={t('chart.noData')} message={t('chart.noDataMsg')} />
          )}
        </div>
      </div>

      <div className="card surface card-border">
        <div className="card-body">
          <h3 className="card-title text-base font-semibold">{t('an.budgetUtilization')}</h3>
          {utilization.count === 0 ? (
            <EmptyState title={t('an.noBudgetData')} message={t('an.noBudgetData')} />
          ) : (
            <>
              <p className="text-sm text-base-content/60">
                {t('an.avgUtilization')}: {formatNumber(utilization.averageUtilization * 100)}%
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                {utilization.budgets.map((budget) => {
                  const cat = categoryById[budget.categoryId]
                  return (
                  <li key={budget.categoryId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="min-w-0">{cat ? localizeCategory(cat) : budget.categoryId}</span>
                      <span className="financial-value tabular-nums text-base-content/60">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <progress
                      className="progress progress-primary h-2 w-full"
                      value={formatNumber(budget.utilization * 100)}
                      max="100"
                    />
                  </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="card surface card-border">
        <div className="card-body">
          <h3 className="card-title text-base font-semibold">{t('an.spendingConcentration')}</h3>
          {data.highestSpendingCategory ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md text-lg"
                  style={{ backgroundColor: `${data.highestSpendingCategory.color}26` }}
                  aria-hidden="true"
                >
                  {data.highestSpendingCategory.icon}
                </span>
                <div>
                  <p className="font-semibold">
                    {localizeCategory(data.highestSpendingCategory)}
                  </p>
                  <p className="text-sm text-success">
                    {t('an.concentrationHigh', {
                      value: formatNumber(data.spendingConcentration),
                    })}
                  </p>
                </div>
              </div>
              <div className="border-t border-base-200 pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">{t('an.monthOverMonth')}</span>
                  <span>
                    <TrendLabel change={data.monthOverMonthChange} />
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-base-content/60">{t('an.largestTransaction')}</span>
                  {data.largestTransaction ? (
                    <span className="financial-value text-right font-medium tabular-nums">
                      {formatCurrency(data.largestTransaction.amount)}{' '}
                      <span className="text-base-content/50">· {data.largestTransaction.description}</span>
                    </span>
                  ) : (
                    <span>{t('an.noLargest')}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base-content/60">{t('an.transactionCount')}</span>
                  <span className="tabular-nums">{data.transactionCount}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base-content/60">{t('an.expenseCount')}</span>
                  <span className="tabular-nums">{data.expenseTransactionCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title={t('an.noLargest')} message={t('an.noLargest')} />
          )}
        </div>
      </div>
    </div>
  )
}

function formatSavings(value) {
  if (value === null || value === undefined) return '—'
  return `${formatNumber(value)}%`
}

export default AnalyticsSection