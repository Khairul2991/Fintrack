import { EditIcon, TrashIcon } from '../common/Icons'
import BudgetProgress from './BudgetProgress'
import { formatCurrency } from '../../utils/format'

function statusBadgeClass(status) {
  if (status === 'Over Budget') return 'badge-error'
  if (status === 'Near Limit') return 'badge-warning'
  return 'badge-success'
}

function BudgetCard({ budget, onEdit, onDelete }) {
  const remaining = Number(budget.remaining)
  const over = remaining < 0

  return (
    <div className="card bg-base-100 shadow">
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
              <h3 className="truncate font-semibold">{budget.category.name}</h3>
              <p className="text-xs text-base-content/50">
                {formatCurrency(budget.amount)} budget
              </p>
            </div>
          </div>
          <span className={`badge ${statusBadgeClass(budget.status)}`}>{budget.status}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
          <span className="text-base-content/70">
            Spent <span className="font-semibold text-base-content">{formatCurrency(budget.spent)}</span>
          </span>
          <span className="text-base-content/70">
            Remaining{' '}
            <span
              className={`font-semibold ${over ? 'text-error' : 'text-base-content'}`}
            >
              {formatCurrency(remaining)}
            </span>
          </span>
        </div>

        <BudgetProgress progress={budget.progress} status={budget.status} />

        <div className="flex justify-end gap-1 border-t border-base-200 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => onEdit(budget)}
            aria-label={`Edit ${budget.category.name} budget`}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm hover:text-error"
            onClick={() => onDelete(budget)}
            aria-label={`Delete ${budget.category.name} budget`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BudgetCard