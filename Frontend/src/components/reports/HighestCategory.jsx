import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function HighestCategory({ highest }) {
  const { t, localizeCategory } = useLanguage()

  if (!highest) {
    return (
      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('rep.highest')}</h2>
          <EmptyState title={t('chart.noExpense')} message={t('rep.highestMsg')} />
        </div>
      </div>
    )
  }

  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('rep.highest')}</h2>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
            style={{ backgroundColor: `${highest.color}26` }}
            aria-hidden="true"
          >
            {highest.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{localizeCategory(highest)}</p>
            <p className="text-sm text-base-content/60">
              {t('rep.inExpenses', { value: formatCurrency(highest.total) })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HighestCategory