import EmptyState from '../common/EmptyState'
import { CloseIcon } from '../common/Icons'
import { useLanguage } from '../../context/LanguageContext'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'
import { summarizeDay } from '../../utils/calendarView'
import { accountDisplayName } from '../../utils/accountDisplay'

function dayRowLabel(tx, t) {
  if (tx.type === 'TRANSFER') {
    return `${accountDisplayName(tx.account, t)} → ${accountDisplayName(tx.transferAccount, t)}`
  }
  return accountDisplayName(tx.account, t)
}

function DayTransactionRow({ tx }) {
  const { t, lang } = useLanguage()
  const isTransfer = tx.type === 'TRANSFER'
  const category = tx.category
  return (
    <li className="flex items-start gap-2 py-2">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs"
        style={category ? { backgroundColor: `${category.color}26` } : undefined}
      >
        {category ? category.icon : '•'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-base-content">{tx.description}</p>
        <p className="truncate text-xs text-base-content/50">
          {formatDateTime(tx.date, lang)} · {dayRowLabel(tx, t)}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          tx.type === 'INCOME'
            ? 'text-success'
            : isTransfer
              ? 'text-base-content'
              : 'text-error'
        }`}
      >
        {tx.type === 'INCOME' ? '+' : isTransfer ? '' : '−'}
        {formatCurrency(tx.amount)}
      </span>
    </li>
  )
}

function DaySection({ title, tone, transactions }) {
  if (transactions.length === 0) return null
  return (
    <section className="mt-3 border-t border-base-200">
      <h3 className={`pt-3 text-xs font-semibold uppercase tracking-wide ${tone}`}>{title}</h3>
      <ul className="divide-y divide-base-100">
        {transactions.map((tx) => (
          <DayTransactionRow key={tx.id} tx={tx} />
        ))}
      </ul>
    </section>
  )
}

function DayDetailPanel({ dayKey, transactions, onClear }) {
  const { t, lang } = useLanguage()
  if (!dayKey) {
    return (
      <div className="card surface card-border">
        <div className="card-body">
          <EmptyState title={t('cal.selectDate')} message={t('cal.selectDateMsg')} />
        </div>
      </div>
    )
  }

  const summary = summarizeDay(transactions)
  const income = transactions.filter((tx) => tx.type === 'INCOME')
  const expense = transactions.filter((tx) => tx.type === 'EXPENSE')
  const transfers = transactions.filter((tx) => tx.type === 'TRANSFER')
  const netTone = summary.net > 0 ? 'text-success' : summary.net < 0 ? 'text-error' : 'text-base-content'

  return (
    <div className="card surface card-border lg:sticky lg:top-4">
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-base-content">{formatDate(dayKey, lang)}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-square text-base-content/50 hover:text-base-content"
            onClick={onClear}
            aria-label={t('cal.closeDetail')}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-base-content/60">
          {t('cal.txCount', { count: summary.count })} ·{' '}
          <span className={netTone}>
            {t('cal.net')}: {formatCurrency(summary.net)}
          </span>
        </p>
        {transactions.length === 0 ? (
          <EmptyState title={t('cal.noActivityDay')} />
        ) : (
          <>
            <DaySection title={t('common.income')} tone="text-success" transactions={income} />
            <DaySection title={t('common.expense')} tone="text-error" transactions={expense} />
            <DaySection
              title={t('cal.transfers')}
              tone="text-base-content/60"
              transactions={transfers}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default DayDetailPanel