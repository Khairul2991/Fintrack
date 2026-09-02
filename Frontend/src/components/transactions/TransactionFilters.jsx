const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' },
]

function TransactionFilters({ categories, filters, onCommitSearch, onFieldChange, onReset }) {
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
                placeholder="Search description..."
                defaultValue={filters.search}
                aria-label="Search transactions"
              />
              <button type="submit" className="btn">
                Search
              </button>
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.type}
                onChange={(event) => onFieldChange({ type: event.target.value })}
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">Category</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.categoryId}
                onChange={(event) => onFieldChange({ categoryId: event.target.value })}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">From</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.startDate}
                onChange={(event) => onFieldChange({ startDate: event.target.value })}
                aria-label="Start date"
              />
            </div>
            <div>
              <label className="label">
                <span className="text-sm text-base-content/60">To</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.endDate}
                onChange={(event) => onFieldChange({ endDate: event.target.value })}
                aria-label="End date"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">Sort by</span>
              <select
                className="select select-bordered select-sm"
                value={filters.sort}
                onChange={(event) => onFieldChange({ sort: event.target.value })}
                aria-label="Sort transactions"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
              Reset filters
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default TransactionFilters