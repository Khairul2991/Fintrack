import EmptyState from '../common/EmptyState'
import { formatCurrency, formatMonth } from '../../utils/format'

function positive(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return num
}

function MonthlyComparison({ months }) {
  const hasDeltas = months.some((month) => Number(month.expenseDelta) !== 0)

  if (!hasDeltas) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Month Comparison</h2>
          <EmptyState
            title="No comparison available"
            message="Expense changes will appear here once you have data for at least two months."
          />
        </div>
      </div>
    )
  }

  const last = months[months.length - 1]
  const previous = months[months.length - 2]
  const currentExpense = Number(last.expense)
  const previousExpense = Number(previous.expense)

  let changePercent = 0
  if (previousExpense > 0) {
    changePercent = ((currentExpense - previousExpense) / previousExpense) * 100
  }

  const rising = currentExpense > previousExpense
  const changed = currentExpense !== previousExpense

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Month Comparison</h2>
        {!changed ? (
          <p className="text-sm text-base-content/70">
            Your expenses are the same in {formatMonth(last.month)} and{' '}
            {formatMonth(previous.month)}.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {rising ? 'Your expenses increased' : 'Your expenses decreased'} by{' '}
              <span className="font-semibold">
                {formatCurrency(positive(last.expenseDelta))}
              </span>{' '}
              from {formatMonth(previous.month)} to {formatMonth(last.month)}
              {previousExpense > 0 ? (
                <>
                  {' '}
                  (
                  <span className="font-semibold">
                    {Math.abs(changePercent).toFixed(1)}% {rising ? 'up' : 'down'}
                  </span>
                  )
                </>
              ) : null}
              .
            </p>
            <div className="stats stats-vertical sm:stats-horizontal mt-2 w-full shadow">
              <div className="stat">
                <div className="stat-title">{formatMonth(previous.month)}</div>
                <div className="stat-value text-lg">{formatCurrency(previousExpense)}</div>
                <div className="stat-desc">Expense</div>
              </div>
              <div className="stat">
                <div className="stat-title">{formatMonth(last.month)}</div>
                <div className="stat-value text-lg">{formatCurrency(currentExpense)}</div>
                <div className="stat-desc">Expense</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MonthlyComparison