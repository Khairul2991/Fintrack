import SummaryCard from '../dashboard/SummaryCard'
import { IncomeIcon, ExpenseIcon } from '../common/Icons'
import { useLanguage } from '../../context/LanguageContext'
import { formatCurrency } from '../../utils/format'

function MonthSummary({ summary }) {
  const { t } = useLanguage()
  const netTone = summary.net > 0 ? 'success' : summary.net < 0 ? 'error' : 'default'
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label={t('common.income')}
          value={formatCurrency(summary.income)}
          tone="success"
          icon={<IncomeIcon />}
        />
        <SummaryCard
          label={t('common.expense')}
          value={formatCurrency(summary.expense)}
          tone="error"
          icon={<ExpenseIcon />}
        />
        <SummaryCard label={t('cal.net')} value={formatCurrency(summary.net)} tone={netTone} />
      </div>
      <p className="text-sm text-base-content/60">
        {t('cal.txCount', { count: summary.count })}
        {' · '}
        {t('cal.incomeDays', { count: summary.incomeDays })}
        {' · '}
        {t('cal.expenseDays', { count: summary.expenseDays })}
        {summary.transfers > 0 ? (
          <>
            {' · '}
            {t('cal.transferCount', { count: summary.transfers })}
          </>
        ) : null}
      </p>
    </div>
  )
}

export default MonthSummary