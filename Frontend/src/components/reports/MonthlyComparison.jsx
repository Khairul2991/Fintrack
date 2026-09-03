import EmptyState from '../common/EmptyState'
import { formatCurrency, formatMonth } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function positive(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return num
}

function MonthlyComparison({ months }) {
  const { t } = useLanguage()
  const hasDeltas = months.some((month) => Number(month.expenseDelta) !== 0)

  if (!hasDeltas) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">{t('rep.monthCompare')}</h2>
          <EmptyState title={t('rep.noCompare')} message={t('rep.noCompareMsg')} />
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
        <h2 className="card-title">{t('rep.monthCompare')}</h2>
        {!changed ? (
          <p className="text-sm text-base-content/70">
            {t('rep.sameExpense', {
              a: formatMonth(last.month),
              b: formatMonth(previous.month),
            })}
          </p>
        ) : (
          <>
            <p className="text-sm">
              {rising ? t('rep.increased') : t('rep.decreased')} by{' '}
              <span className="font-semibold">
                {formatCurrency(positive(last.expenseDelta))}
              </span>{' '}
              {t('rep.fromTo', {
                a: formatMonth(previous.month),
                b: formatMonth(last.month),
              })}
              {previousExpense > 0 ? (
                <>
                  {' '}
                  (
                  <span className="font-semibold">
                    {Math.abs(changePercent).toFixed(1)}% {rising ? t('rep.up') : t('rep.down')}
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
                <div className="stat-desc">{t('common.expense')}</div>
              </div>
              <div className="stat">
                <div className="stat-title">{formatMonth(last.month)}</div>
                <div className="stat-value text-lg">{formatCurrency(currentExpense)}</div>
                <div className="stat-desc">{t('common.expense')}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MonthlyComparison