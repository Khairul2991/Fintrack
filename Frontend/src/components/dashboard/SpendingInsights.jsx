import EmptyState from '../common/EmptyState'
import { useLanguage } from '../../context/LanguageContext'

function SpendingInsights({ insights }) {
  const { t, translateInsight } = useLanguage()
  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('dash.insights')}</h2>
        {insights.length === 0 ? (
          <EmptyState title={t('dash.noInsights')} message={t('dash.noInsightsMsg')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-base-content/80">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary"
                  style={{ backgroundColor: 'color-mix(in oklab, var(--color-primary) 12%, transparent)' }}
                  aria-hidden="true"
                >
                  i
                </span>
                <span className="leading-relaxed">{translateInsight(insight)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SpendingInsights