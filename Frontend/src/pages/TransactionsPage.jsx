import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import TransactionFilters from '../components/transactions/TransactionFilters'
import TransactionTable from '../components/transactions/TransactionTable'
import TransactionForm from '../components/transactions/TransactionForm'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { listCategories } from '../services/categoryApi'
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../services/transactionApi'

const DEFAULT_FILTERS = {
  search: '',
  type: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  sort: 'newest',
}

const SORTS = {
  newest: { sortBy: 'date', sortOrder: 'desc' },
  oldest: { sortBy: 'date', sortOrder: 'asc' },
  'amount-desc': { sortBy: 'amount', sortOrder: 'desc' },
  'amount-asc': { sortBy: 'amount', sortOrder: 'asc' },
}

const PAGE_SIZES = [10, 20, 50]

const STORAGE_KEY = 'fintrack-tx-size'

function readSize() {
  if (typeof localStorage === 'undefined') return 10
  const stored = Number(localStorage.getItem(STORAGE_KEY))
  return PAGE_SIZES.includes(stored) ? stored : 10
}

function TransactionsPage() {
  const toast = useToast()
  const { t, translateError } = useLanguage()

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(readSize)
  const [transactions, setTransactions] = useState([])
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    let active = true
    listCategories()
      .then((response) => {
        if (active) {
          setCategories(response.data)
          setCategoriesError('')
        }
      })
      .catch((error) => {
        if (active) setCategoriesError(translateError(error.message))
      })
    return () => {
      active = false
    }
  }, [categoriesAttempt, translateError])

  const buildQuery = useCallback(() => {
    const sort = SORTS[filters.sort] || SORTS.newest
    return {
      search: filters.search || undefined,
      type: filters.type || undefined,
      categoryId: filters.categoryId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      page,
      limit: size,
    }
  }, [filters, page, size])

  useEffect(() => {
    let active = true
    listTransactions(buildQuery())
      .then((response) => {
        if (!active) return
        setLoadError('')
        setTransactions(response.data)
        setMeta(response.meta)
        setStatus('ready')
      })
      .catch((error) => {
        if (active) {
          setLoadError(translateError(error.message))
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [buildQuery, refreshKey, translateError])

  function startReload() {
    setStatus('loading')
  }

  function handleFieldChange(patch) {
    startReload()
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  function handleCommitSearch(value) {
    startReload()
    setFilters((current) => ({ ...current, search: value }))
    setPage(1)
  }

  function handleReset() {
    startReload()
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(transaction) {
    setEditing(transaction)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  function changeSize(next) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(next))
    }
    startReload()
    setSize(next)
    setPage(1)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateTransaction(editing.id, payload)
      toast.success(t('tx.updated'))
    } else {
      await createTransaction(payload)
      toast.success(t('tx.added'))
    }
    setFormOpen(false)
    setEditing(null)
    startReload()
    setPage(1)
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteTransaction(deleting.id)
      toast.success(t('tx.deleted'))
      setDeleting(null)
      startReload()
      if (meta.page > 1 && transactions.length === 1) {
        setPage(meta.page - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtersActive = Boolean(
    filters.search || filters.type || filters.categoryId || filters.startDate || filters.endDate,
  )
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t('tx.title')} subtitle={t('tx.subtitle')} />
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {t('tx.add')}
        </button>
      </div>

      <TransactionFilters
        categories={categories}
        filters={filters}
        onCommitSearch={handleCommitSearch}
        onFieldChange={handleFieldChange}
        onReset={handleReset}
      />

      {categoriesError ? (
        <div role="alert" className="flex items-center justify-between gap-2 alert alert-warning">
          <span>{t('tx.catLoadError')} {categoriesError}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setCategoriesAttempt((attempt) => attempt + 1)}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      <div className="card bg-base-100 shadow">
        {status === 'loading' ? (
          <LoadingSkeleton rows={Math.min(size, 10)} />
        ) : loadError ? (
          <div role="alert" className="m-4 flex items-center justify-between gap-2 alert alert-error">
            <span>{t('tx.loadError')} {loadError}</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                startReload()
                setRefreshKey((key) => key + 1)
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : transactions.length === 0 ? (
          filtersActive ? (
            <EmptyState title={t('tx.noMatch')} message={t('tx.noMatchMsg')} />
          ) : (
            <EmptyState
              title={t('tx.noYet')}
              message={t('tx.noYetMsg')}
              action={
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  {t('tx.add')}
                </button>
              }
            />
          )
        ) : (
          <>
            <TransactionTable
              transactions={transactions}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm text-base-content/60">
                {t('tx.showing', { from, to, total: meta.total })}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="join">
                  <button
                    type="button"
                    className="join-item btn btn-sm"
                    onClick={() => {
                      startReload()
                      setPage((current) => Math.max(1, current - 1))
                    }}
                    disabled={meta.page <= 1}
                  >
                    {t('tx.prev')}
                  </button>
                  <button
                    type="button"
                    className="join-item btn btn-sm no-animation"
                    aria-current="page"
                  >
                    {t('tx.page', { page: meta.page, pages: meta.totalPages })}
                  </button>
                  <button
                    type="button"
                    className="join-item btn btn-sm"
                    onClick={() => {
                      startReload()
                      setPage((current) => Math.min(meta.totalPages, current + 1))
                    }}
                    disabled={meta.page >= meta.totalPages}
                  >
                    {t('tx.next')}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="label">
                    <span className="label-text text-sm text-base-content/60">
                      {t('tx.rowsPerPage')}
                    </span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={size}
                    onChange={(event) => changeSize(Number(event.target.value))}
                    aria-label={t('tx.rowsPerPage')}
                  >
                    {PAGE_SIZES.map((option) => (
                      <option key={option} value={option}>
                        {t('tx.perPage', { count: option })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {formOpen ? (
        <TransactionForm
          transaction={editing}
          categories={categories}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('tx.confirmTitle')}
          message={t('tx.confirmMsg', { name: deleting.description })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default TransactionsPage