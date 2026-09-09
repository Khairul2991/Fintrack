import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import BackLink from '../components/common/BackLink'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { getGoal } from '../services/goalApi'
import { useLanguage } from '../context/LanguageContext'
import { formatCurrency, formatDate } from '../utils/format'
import { accountDisplayName } from '../utils/accountDisplay'

function ActivityTypeBadge({ type, t }) {
  const contribution = type === 'CONTRIBUTION'
  return (
    <span
      className={`badge badge-sm border-0 font-medium ${contribution ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
    >
      {contribution ? t('goal.activityContribution') : t('goal.activityWithdrawal')}
    </span>
  )
}

function GoalActivitiesPage() {
  const { id } = useParams()
  const { t, translateError } = useLanguage()

  const [goal, setGoal] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('ALL')

  const loadGoal = useCallback(() => {
    setStatus('loading')
    getGoal(id)
      .then((response) => {
        setGoal(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [id, translateError])

  useEffect(() => {
    loadGoal()
  }, [loadGoal])

  const activities = (goal ? goal.activities : []) || []
  const filtered =
    filter === 'ALL' ? activities : activities.filter((activity) => activity.type === filter)

  const percent = goal ? Math.min(100, Number(goal.progress)) : 0

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/goals" />
      <PageHeader title={t('goalActPage.title')} subtitle={goal ? goal.name : undefined} />

      {status === 'loading' ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-28 rounded-box" />
          <LoadingSkeleton rows={6} />
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="alert alert-error flex items-center justify-between gap-2">
          <span>
            {t('goal.loadError')} {loadError}
          </span>
          <button type="button" className="btn btn-sm" onClick={loadGoal}>
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card surface card-border rounded-box p-4">
              <p className="text-xs text-base-content/50">{t('goal.colCurrent')}</p>
              <p className="mt-1 text-xl font-bold financial-value">{formatCurrency(goal.currentAmount)}</p>
            </div>
            <div className="card surface card-border rounded-box p-4">
              <p className="text-xs text-base-content/50">{t('goal.colTarget')}</p>
              <p className="mt-1 text-xl font-bold financial-value">{formatCurrency(goal.targetAmount)}</p>
            </div>
            <div className="card surface card-border rounded-box p-4">
              <p className="text-xs text-base-content/50">{t('goal.sumProgress')}</p>
              <p className="mt-1 text-xl font-bold text-primary">{percent.toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="join">
              {['ALL', 'CONTRIBUTION', 'WITHDRAWAL'].map((value) => {
                const active = filter === value
                const label =
                  value === 'ALL'
                    ? t('common.all')
                    : value === 'CONTRIBUTION'
                      ? t('goal.activityContribution')
                      : t('goal.activityWithdrawal')
                return (
                  <button
                    key={value}
                    type="button"
                    className={`btn btn-sm join-item ${active ? 'btn-primary' : ''}`}
                    onClick={() => setFilter(value)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="shrink-0 text-xs text-base-content/50">
              {t('acc.inTransactions', { count: activities.length })}
            </p>
          </div>

          <div className="card surface card-border min-w-0">
            {filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState title={t('goal.noActivity')} />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('tx.colDate')}</th>
                        <th>{t('goalActPage.source')}</th>
                        <th>{t('tx.colAccount')}</th>
                        <th>{t('tx.colType')}</th>
                        <th className="text-right">{t('tx.colAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((activity) => {
                        const contribution = activity.type === 'CONTRIBUTION'
                        const source = activity.transaction
                          ? activity.transaction.description
                          : activity.note || t('goalActPage.manual')
                        return (
                          <tr key={activity.id}>
                            <td className="text-base-content/70">{formatDate(activity.date)}</td>
                            <td className="font-medium">{source || '-'}</td>
                            <td className="text-base-content/70">
                              {activity.account ? accountDisplayName(activity.account, t) : '-'}
                            </td>
                            <td>
                              <ActivityTypeBadge type={activity.type} t={t} />
                            </td>
                            <td
                              className={`text-right font-semibold tabular-nums ${contribution ? 'text-success' : 'text-error'}`}
                            >
                              {contribution ? '+' : '−'} {formatCurrency(activity.amount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default GoalActivitiesPage