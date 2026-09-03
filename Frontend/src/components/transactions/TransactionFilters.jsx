import { useLanguage } from '../../context/LanguageContext'

function TransactionFilters({ categories, filters, onCommitSearch, onFieldChange, onReset }) {
  const { t } = useLanguage()

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onCommitSearch(String(formData.get('query') || '').trim())
  }

  return (
    <div className="card bg-base-100 shadow">
      <form onSubmit={handleSubmit}>
        <div className="card-body gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-6">
            <div className="flex gap-2">
              <input
                name="query"
                key={filters.search}
                type="search"
                className="input input-bordered w-full"
                placeholder={t('tx.searchPlaceholder')}
                defaultValue={filters.search}
                aria-label={t('tx.searchAria')}
              />
              <button type="submit" className="btn">
                {t('common.search')}
              </button>
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">{t('tx.filterType')}</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.type}
                onChange={(event) => onFieldChange({ type: event.target.value })}
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
                value={filters.categoryId}
                onChange={(event) => onFieldChange({ categoryId: event.target.value })}
                aria-label={t('tx.filterCatAria')}
              >
                <option value="">{t('tx.allCats')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
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
                className="input input-bordered w-full"
                value={filters.startDate}
                onChange={(event) => onFieldChange({ startDate: event.target.value })}
                aria-label={t('tx.startDateAria')}
              />
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">{t('tx.filterTo')}</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.endDate}
                onChange={(event) => onFieldChange({ endDate: event.target.value })}
                aria-label={t('tx.endDateAria')}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">{t('tx.sortBy')}</span>
              <select
                className="select select-bordered select-sm"
                value={filters.sort}
                onChange={(event) => onFieldChange({ sort: event.target.value })}
                aria-label={t('tx.sortAria')}
              >
                <option value="newest">{t('tx.sortNewest')}</option>
                <option value="oldest">{t('tx.sortOldest')}</option>
                <option value="amount-desc">{t('tx.sortAmountDesc')}</option>
                <option value="amount-asc">{t('tx.sortAmountAsc')}</option>
              </select>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
              {t('tx.resetFilters')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default TransactionFilters