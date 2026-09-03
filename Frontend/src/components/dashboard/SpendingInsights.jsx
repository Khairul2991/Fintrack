import EmptyState from '../common/EmptyState'
import { useLanguage } from '../../context/LanguageContext'

function SpendingInsights({ insights }) {
  const { t, translateInsight } = useLanguage()
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">{t('dash.insights')}</h2>
        {insights.length === 0 ? (
          <EmptyState title={t('dash.noInsights')} message={t('dash.noInsightsMsg')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <span className="badge badge-info badge-lg">i</span>
                <span>{translateInsight(insight)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SpendingInsights