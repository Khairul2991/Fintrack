import EmptyState from '../common/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'

function RecentTransactions({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Recent Transactions</h2>
          <EmptyState
            title="No transactions yet"
            message="Your most recent transactions will appear here."
            action={
              <a href="/transactions" className="btn btn-primary btn-sm">
                Add a transaction
              </a>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Recent Transactions</h2>
        <ul className="flex flex-col">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center gap-3 py-2.5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${transaction.category.color}26` }}
                aria-hidden="true"
              >
                {transaction.category.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{transaction.description}</p>
                <p className="truncate text-xs text-base-content/50">
                  {transaction.category.name} · {formatDate(transaction.date)}
                </p>
              </div>
              <span
                className={`whitespace-nowrap text-sm font-semibold ${
                  transaction.type === 'INCOME' ? 'text-success' : 'text-error'
                }`}
              >
                {transaction.type === 'INCOME' ? '+' : '−'}
                {formatCurrency(transaction.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default RecentTransactions