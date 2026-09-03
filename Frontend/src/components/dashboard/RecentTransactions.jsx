import { Link } from 'react-router-dom'
import EmptyState from '../common/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function RecentTransactions({ transactions }) {
  const { t, localizeCategory } = useLanguage()

  if (transactions.length === 0) {
    return (
      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('dash.recent')}</h2>
          <EmptyState
            title={t('dash.recentEmpty')}
            message={t('dash.recentEmptyMsg')}
            action={
              <Link to="/transactions" className="btn btn-primary btn-sm">
                {t('dash.addShort')}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('dash.recent')}</h2>
        <ul className="flex flex-col divide-y divide-base-200">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-center gap-3 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center text-base"
                style={{ backgroundColor: `${transaction.category.color}26` }}
                aria-hidden="true"
              >
                {transaction.category.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{transaction.description}</p>
                <p className="truncate text-xs text-base-content/50">
                  {localizeCategory(transaction.category)} · {formatDate(transaction.date)}
                </p>
              </div>
              <span
                className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
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