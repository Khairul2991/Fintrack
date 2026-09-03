import { EditIcon, TrashIcon } from '../common/Icons'
import BudgetProgress from './BudgetProgress'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function statusBadgeClass(status) {
  if (status === 'Over Budget') return 'border-0 bg-error/12 text-error'
  if (status === 'Near Limit') return 'border-0 bg-warning/12 text-warning'
  return 'border-0 bg-success/12 text-success'
}

function translateStatus(status, t) {
  if (status === 'Over Budget') return t('status.overBudget')
  if (status === 'Near Limit') return t('status.nearLimit')
  return t('status.onTrack')
}

function BudgetCard({ budget, onEdit, onDelete }) {
  const { t, localizeCategory } = useLanguage()
  const remaining = Number(budget.remaining)
  const over = remaining < 0
  const categoryLabel = localizeCategory(budget.category)

  return (
    <div className="card surface card-border">
      <div className="card-body gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl"
              style={{ backgroundColor: `${budget.category.color}26` }}
              aria-hidden="true"
            >
              {budget.category.icon}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{categoryLabel}</h3>
              <p className="text-xs text-base-content/50">
                {t('bud.budgetLabel', { value: formatCurrency(budget.amount) })}
              </p>
            </div>
          </div>
          <span className={`badge badge-sm ${statusBadgeClass(budget.status)}`}>
            {translateStatus(budget.status, t)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
          <span className="text-base-content/70">
            {t('bud.spent')}{' '}
            <span className="font-semibold tabular-nums text-base-content">
              {formatCurrency(budget.spent)}
            </span>
          </span>
          <span className="text-base-content/70">
            {t('bud.remaining')}{' '}
            <span className={`font-semibold tabular-nums ${over ? 'text-error' : 'text-base-content'}`}>
              {formatCurrency(remaining)}
            </span>
          </span>
        </div>

        <BudgetProgress progress={budget.progress} status={budget.status} />

        <div className="flex justify-end gap-1 border-t border-base-200 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
            onClick={() => onEdit(budget)}
            aria-label={t('bud.editAria', { name: categoryLabel })}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
            onClick={() => onDelete(budget)}
            aria-label={t('bud.deleteAria', { name: categoryLabel })}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BudgetCard