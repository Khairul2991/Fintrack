import { Link } from 'react-router-dom'
import EmptyState from '../common/EmptyState'
import { formatCurrency, formatDateTime } from '../../utils/format'
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
          {transactions.map((transaction) => {
            const isTransfer = transaction.type === 'TRANSFER'
            const income = transaction.type === 'INCOME'
            const category = transaction.category
            return (
              <li key={transaction.id} className="flex items-center gap-3 py-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base ${
                    category ? '' : 'bg-base-200/40 text-base-content/50'
                  }`}
                  style={category ? { backgroundColor: `${category.color}26` } : undefined}
                  aria-hidden="true"
                >
                  {category ? category.icon : '⇄'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{transaction.description}</p>
                  <p className="truncate text-xs text-base-content/50">
                    {category ? localizeCategory(category) : isTransfer ? t('tx.transferBadge') : ''} ·{' '}
                    {formatDateTime(transaction.date)}
                  </p>
                </div>
                <span
                  className={`financial-value text-right text-sm font-semibold tabular-nums ${
                    income ? 'text-success' : isTransfer ? 'text-base-content' : 'text-error'
                  }`}
                >
                  {income ? '+' : isTransfer ? '' : '−'}
                  {formatCurrency(transaction.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default RecentTransactions