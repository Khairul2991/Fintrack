import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { formatCurrency, formatDate } from '../../utils/format'
import { accountDisplayName } from '../../utils/accountDisplay'
import { ArrowRightIcon } from '../common/Icons'

function GoalDetailDialog({ goal, accounts, onClose, onEdit }) {
  const { t, localizeCategory } = useLanguage()
  const percent = Math.min(100, Number(goal.progress))
  const completed = goal.status === 'COMPLETED'
  const goalAccount = accounts.find((account) => account.id === goal.accountId)
  const activities = goal.activities || []
  const recentActivities = activities.slice(0, 5)

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg rounded-box">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">{goal.name}</h3>
            {goal.category ? (
              <p className="text-xs text-base-content/60">
                {goal.category.icon} {localizeCategory(goal.category)}
              </p>
            ) : null}
          </div>
          <span className={`badge ${completed ? 'badge-success' : 'badge-primary'} badge-sm border-0 font-medium`}>
            {completed ? t('goal.statusCompleted') : t('goal.statusInProgress')}
          </span>
        </div>

        {goal.description ? (
          <p className="mt-2 text-sm text-base-content/60">{goal.description}</p>
        ) : null}

        <div className="mt-4 rounded-box border border-base-200 p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-base-content/50">{t('goal.colCurrent')}</p>
              <p className="text-2xl font-bold financial-value">{formatCurrency(goal.currentAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-base-content/50">{t('goal.colTarget')}</p>
              <p className="text-lg font-semibold financial-value">{formatCurrency(goal.targetAmount)}</p>
            </div>
          </div>
          <progress
            className={`progress progress-primary mt-3 h-2.5 w-full ${completed ? 'progress-success' : ''}`}
            value={percent}
            max="100"
            aria-label={t('goal.progressAria', { percent: Math.round(percent) })}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">{percent.toFixed(1)}%</span>
            <span className="text-base-content/50">
              {t('goal.remaining')}: <span className="financial-value">{formatCurrency(goal.remaining)}</span>
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-base-content/50">{t('goal.accountLabel')}</dt>
            <dd className="font-medium">
              {goalAccount ? accountDisplayName(goalAccount, t) : '-'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-base-content/50">{t('goalf.targetDate')}</dt>
            <dd className="font-medium">
              {goal.targetDate ? formatDate(goal.targetDate) : t('goal.noDeadline')}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <h4 className="text-sm font-semibold">{t('goal.activity')}</h4>
          {activities.length === 0 ? (
            <p className="mt-2 text-sm text-base-content/50">{t('goal.noActivity')}</p>
          ) : (
            <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
              {recentActivities.map((activity) => {
                const contribution = activity.type === 'CONTRIBUTION'
                return (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between gap-2 rounded-box border border-base-200 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`font-medium tabular-nums ${contribution ? 'text-success' : 'text-error'}`}>
                        {contribution ? '+' : '−'} {formatCurrency(activity.amount)}
                      </span>
                      <span className={`badge badge-sm border-0 font-medium ${contribution ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                        {contribution ? t('goal.activityContribution') : t('goal.activityWithdrawal')}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-base-content/50">
                      {formatDate(activity.date)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {activities.length > 5 ? (
            <Link
              to={`/goals/${goal.id}/activities`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {t('common.viewAllActivity')}
              <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="modal-action flex-wrap">
          <button type="button" className="btn" onClick={() => onEdit(goal)}>
            {t('goalf.edit')}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t('common.closeDialog')}
        onClick={onClose}
      />
    </dialog>
  )
}

export default GoalDetailDialog