import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'

function HighestCategory({ highest }) {
  if (!highest) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Highest Spending Category</h2>
          <EmptyState
            title="No expense data yet"
            message="Your highest spending category will appear here once you record expenses."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Highest Spending Category</h2>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
            style={{ backgroundColor: `${highest.color}26` }}
            aria-hidden="true"
          >
            {highest.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{highest.name}</p>
            <p className="text-sm text-base-content/60">{formatCurrency(highest.total)} in expenses</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HighestCategory