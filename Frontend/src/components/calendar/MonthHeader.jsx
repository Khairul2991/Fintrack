import { useLanguage } from '../../context/LanguageContext'
import { formatMonthLong, viewKey } from '../../utils/calendarView'

function MonthHeader({ view, isCurrent, onPrev, onNext, onToday, children }) {
  const { t, lang } = useLanguage()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={onPrev}
            aria-label={t('cal.prevMonth')}
          >
            ‹
          </button>
          <span className="px-1 text-xl font-semibold tracking-tight text-base-content sm:text-lg">
            {formatMonthLong(viewKey(view), lang)}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={onNext}
            aria-label={t('cal.nextMonth')}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onToday}
          disabled={isCurrent}
          aria-label={t('cal.goToday')}
        >
          {t('cal.today')}
        </button>
      </div>
      {children ? (
        <div className="flex items-center gap-2 sm:border-s sm:border-base-300 sm:ps-4">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default MonthHeader