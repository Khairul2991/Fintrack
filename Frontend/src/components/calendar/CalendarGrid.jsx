import { useLanguage } from '../../context/LanguageContext'
import { formatCurrencyCompact, formatDate } from '../../utils/format'
import {
  buildGridCells,
  formatMonthLong,
  isToday,
  summarizeTransactionList,
  viewKey,
  weekdayLabels,
} from '../../utils/calendarView'

function CalendarGrid({ view, byDay, selectedDay, onSelect }) {
  const { t, lang } = useLanguage()
  const cells = buildGridCells(view.year, view.month)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div role="grid" aria-label={t('cal.gridAria', { month: formatMonthLong(viewKey(view), lang) })}>
      <div role="row" className="grid grid-cols-7 gap-1">
        {weekdayLabels(lang).map((label) => (
          <div
            key={label}
            role="columnheader"
            className="pb-1 text-center text-xs font-medium uppercase tracking-wide text-base-content/50"
          >
            {label}
          </div>
        ))}
      </div>
      {rows.map((week, rowIndex) => (
        <div key={rowIndex} role="row" className="grid grid-cols-7 gap-1">
          {week.map((cell) => {
            const txs = byDay.get(cell.key) || []
            const summary = summarizeTransactionList(txs)
            const isSelected = cell.key === selectedDay
            const today = isToday(cell.key)
            const base = 'flex min-h-16 flex-col gap-0.5 rounded-btn border p-1.5 text-left transition sm:min-h-20'
            const box = isSelected
              ? 'border-primary bg-primary/5 shadow-sm'
              : today
                ? 'border-primary/50 bg-primary/5'
                : 'border-base-200 bg-base-100 hover:border-primary/40'
            const dimmed = cell.inMonth ? '' : 'opacity-40'
            const dateLabel = formatDate(cell.key, lang)
            const hasMoney = summary.income > 0 || summary.expense > 0
            const hasTransfers = summary.transfers > 0
            const ariaLabel = hasMoney
              ? t('cal.dayCellAria', {
                  date: dateLabel,
                  income: formatCurrencyCompact(summary.income),
                  expense: formatCurrencyCompact(summary.expense),
                })
              : hasTransfers
                ? t('cal.dayCellTransfersAria', { date: dateLabel, count: summary.transfers })
                : t('cal.selectDate', { date: dateLabel })
            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                aria-label={ariaLabel}
                aria-pressed={isSelected}
                onClick={() => onSelect(cell.key)}
                className={`${base} ${box} ${dimmed}`}
              >
                <span
                  className={`text-sm font-medium tabular-nums ${
                    today ? 'text-primary' : isSelected ? 'text-primary' : 'text-base-content'
                  }`}
                >
                  {cell.day}
                </span>
                {summary.income > 0 ? (
                  <span className="truncate text-[11px] leading-tight tabular-nums text-success">
                    +{formatCurrencyCompact(summary.income)}
                  </span>
                ) : null}
                {summary.expense > 0 ? (
                  <span className="truncate text-[11px] leading-tight tabular-nums text-error">
                    −{formatCurrencyCompact(summary.expense)}
                  </span>
                ) : null}
                {hasTransfers ? (
                  <span className="truncate text-[11px] leading-tight text-base-content/40">
                    ⇄ {summary.transfers}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default CalendarGrid