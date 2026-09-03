import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import SummaryCard from '../components/dashboard/SummaryCard'
import RecentTransactions from '../components/dashboard/RecentTransactions'
import IncomeExpenseChart from '../components/dashboard/IncomeExpenseChart'
import CategoryChart from '../components/dashboard/CategoryChart'
import SpendingInsights from '../components/dashboard/SpendingInsights'
import AccountBalances from '../components/dashboard/AccountBalances'
import { getDashboardSummary } from '../services/dashboardApi'
import { formatCurrency } from '../utils/format'
import { IncomeIcon, ExpenseIcon } from '../components/common/Icons'
import { useLanguage } from '../context/LanguageContext'

function DashboardPage() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    getDashboardSummary()
      .then((response) => {
        setData(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(error.message)
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const header = <PageHeader title={t('dash.title')} subtitle={t('dash.subtitle')} />

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-28 rounded-box" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-80 rounded-box sm:col-span-1 lg:col-span-2" />
          <div className="skeleton h-80 rounded-box" />
          <div className="skeleton h-80 rounded-box" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="card surface card-border">
          <div role="alert" className="card-body">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-base-content/80">{t('dash.loadError')} {loadError}</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setStatus('loading')
                  setRefreshKey((key) => key + 1)
                }}
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasTransactions = data.recentTransactions.length > 0
  const hasExpenses = data.expenseByCategory.length > 0

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label={t('dash.balance')} value={formatCurrency(data.summary.balance)} />
        <SummaryCard
          label={t('dash.income')}
          value={formatCurrency(data.summary.income)}
          tone="success"
          icon={<IncomeIcon />}
        />
        <SummaryCard
          label={t('dash.expense')}
          value={formatCurrency(data.summary.expense)}
          tone="error"
          icon={<ExpenseIcon />}
        />
      </div>

      <AccountBalances accounts={data.accounts} />

      {!hasTransactions ? (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <div className="card surface card-border">
              <EmptyState
                title={t('dash.welcome')}
                message={t('dash.welcomeMsg')}
                action={
                  <Link to="/transactions" className="btn btn-primary">
                    {t('dash.addTransaction')}
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IncomeExpenseChart series={data.monthlySeries} />
          {hasExpenses ? <CategoryChart categories={data.expenseByCategory} /> : null}
          <RecentTransactions transactions={data.recentTransactions} />
          <SpendingInsights insights={data.insights} />
        </div>
      )}
    </div>
  )
}

export default DashboardPage