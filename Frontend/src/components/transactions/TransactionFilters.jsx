import { useLanguage } from '../../context/LanguageContext'
import { SearchIcon } from '../common/Icons'

function ChevronIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const EMPTY_DRAFT = { type: '', categoryId: '', accountId: '', startDate: '', endDate: '' }

function TransactionFilters({
  accounts = [],
  categories,
  searchInput,
  draft,
  filterCount,
  panelOpen,
  onSearchInputChange,
  onCommitSearch,
  onClearSearch,
  onTogglePanel,
  onDraftChange,
  onApply,
  onResetFilters,
}) {
  const { t, localizeCategory } = useLanguage()
  const hasQuery = searchInput !== ''

  const hasDateRangeError =
    Boolean(draft.startDate && draft.endDate) && draft.startDate > draft.endDate

  function handleSearchSubmit(event) {
    event.preventDefault()
    onCommitSearch()
  }

  function handleApply() {
    if (hasDateRangeError) return
    onApply()
  }

  const hasDraftChanges = Object.keys(EMPTY_DRAFT).some((key) => draft[key] !== EMPTY_DRAFT[key])

  return (
    <div className="card surface card-border">
      <div className="card-body gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            aria-label={t('tx.searchAria')}
            className="flex w-full items-stretch gap-2 sm:flex-1"
          >
            <div className="relative w-full">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base-content/40">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                placeholder={t('tx.searchPlaceholder')}
                className="input input-bordered w-full pl-10 pr-10"
                aria-label={t('tx.searchAria')}
              />
              {hasQuery ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label={t('tx.clearSearchAria')}
                  className="btn btn-ghost btn-square btn-sm absolute inset-y-0 right-1 my-auto text-base-content/50 hover:text-base-content"
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary shrink-0">
              {t('common.search')}
            </button>
          </form>
          <button
            type="button"
            onClick={onTogglePanel}
            aria-label={t('tx.filterToggleAria')}
            aria-expanded={panelOpen}
            className={`btn shrink-0 ${filterCount > 0 ? 'btn-primary' : 'btn-outline'}`}
          >
            <ChevronIcon open={panelOpen} />
            {filterCount > 0 ? t('tx.filterWithCount', { count: filterCount }) : t('tx.filter')}
          </button>
        </div>

        {panelOpen ? (
          <div
            role="region"
            aria-label={t('tx.filterPanelAria')}
            className="border-t border-base-200 pt-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <div>
                <label className="label">
                  <span className="text-sm text-base-content/60">{t('tx.filterType')}</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={draft.type}
                  onChange={(event) => onDraftChange({ type: event.target.value })}
                  aria-label={t('tx.filterTypeAria')}
                >
                  <option value="">{t('tx.allTypes')}</option>
                  <option value="INCOME">{t('common.income')}</option>
                  <option value="EXPENSE">{t('common.expense')}</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="text-sm text-base-content/60">{t('tx.filterCat')}</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={draft.categoryId}
                  onChange={(event) => onDraftChange({ categoryId: event.target.value })}
                  aria-label={t('tx.filterCatAria')}
                >
                  <option value="">{t('tx.allCats')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {localizeCategory(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="text-sm text-base-content/60">{t('tx.filterAccount')}</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={draft.accountId}
                  onChange={(event) => onDraftChange({ accountId: event.target.value })}
                  aria-label={t('tx.filterAccountAria')}
                >
                  <option value="">{t('tx.allAccounts')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="text-sm text-base-content/60">{t('tx.filterFrom')}</span>
                </label>
                <input
                  type="date"
                  className={`input input-bordered w-full ${
                    hasDateRangeError ? 'input-error' : ''
                  }`}
                  value={draft.startDate}
                  onChange={(event) => onDraftChange({ startDate: event.target.value })}
                  aria-label={t('tx.startDateAria')}
                />
              </div>
              <div>
                <label className="label">
                  <span className="text-sm text-base-content/60">{t('tx.filterTo')}</span>
                </label>
                <input
                  type="date"
                  className={`input input-bordered w-full ${
                    hasDateRangeError ? 'input-error' : ''
                  }`}
                  value={draft.endDate}
                  onChange={(event) => onDraftChange({ endDate: event.target.value })}
                  aria-label={t('tx.endDateAria')}
                />
              </div>
            </div>

            {hasDateRangeError ? (
              <p className="mt-2 text-xs text-error" role="alert">
                {t('tx.dateRangeError')}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-base-200 pt-3">
              <span className="text-xs text-base-content/50">
                {hasDraftChanges ? null : t('tx.noActiveFilters')}
              </span>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={onResetFilters}>
                  {t('tx.resetFilters')}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
                  {t('tx.apply')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TransactionFilters