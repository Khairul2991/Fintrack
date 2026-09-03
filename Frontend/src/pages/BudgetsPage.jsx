import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PlusIcon } from '../components/common/Icons'
import BudgetCard from '../components/budgets/BudgetCard'
import BudgetForm from '../components/budgets/BudgetForm'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from '../services/budgetApi'
import { listCategories } from '../services/categoryApi'
import { formatMonth } from '../utils/format'

const STORAGE_KEY = 'fintrack-budget-view'

function currentMonthYear() {
  const now = new Date()
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
}

function readView() {
  const current = currentMonthYear()
  if (typeof localStorage === 'undefined') return current
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return current
  const match = stored.match(/^(\d{4})-(\d{1,2})$/)
  if (!match) return current
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return current
  return { month, year }
}

function monthLabel(view) {
  return formatMonth(`${view.year}-${String(view.month).padStart(2, '0')}`)
}

function shiftMonth(view, delta) {
  const date = new Date(Date.UTC(view.year, view.month - 1 + delta, 1))
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() }
}

function sameMonth(a, b) {
  return a.month === b.month && a.year === b.year
}

function BudgetsPage() {
  const toast = useToast()
  const { t, translateError } = useLanguage()

  const [view, setView] = useState(readView)
  const [budgets, setBudgets] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(() => {
    listBudgets({ month: view.month, year: view.year })
      .then((response) => {
        setBudgets(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [view, translateError])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function changeView(next) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, `${next.year}-${next.month}`)
    }
    setStatus('loading')
    setView(next)
  }

  function retry() {
    setStatus('loading')
    setRefreshKey((key) => key + 1)
  }

  function openForm(budget) {
    setFormBusy(true)
    listCategories()
      .then((response) => {
        setCategories(response.data)
        setEditing(budget)
        setFormOpen(true)
      })
      .catch((error) => toast.error(translateError(error.message)))
      .finally(() => setFormBusy(false))
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateBudget(editing.id, payload)
      toast.success(t('bud.updated'))
    } else {
      await createBudget(payload)
      toast.success(t('bud.added'))
    }
    closeForm()
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteBudget(deleting.id)
      toast.success(t('bud.deleted'))
      setDeleting(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  const isCurrent = sameMonth(view, currentMonthYear())
  const overBudgetCount = budgets.filter((budget) => budget.status === 'Over Budget').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t('bud.title')} subtitle={t('bud.subtitle')} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openForm(null)}
          disabled={formBusy}
        >
          {formBusy ? <span className="loading loading-spinner loading-sm" /> : <PlusIcon />}
          {formBusy ? t('bud.loadingCats') : t('bud.add')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => changeView(shiftMonth(view, -1))}
            aria-label={t('bud.prevMonthAria')}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-sm join-item no-animation"
            onClick={() => changeView(currentMonthYear())}
            aria-label={t('bud.currentMonthAria')}
          >
            {monthLabel(view)}
          </button>
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => changeView(shiftMonth(view, 1))}
            aria-label={t('bud.nextMonthAria')}
          >
            ›
          </button>
        </div>
        {isCurrent ? (
          <span className="badge badge-ghost">{t('bud.currentMonth')}</span>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => changeView(currentMonthYear())}
          >
            {t('bud.goCurrent')}
          </button>
        )}
      </div>

      {status === 'ready' && overBudgetCount > 0 ? (
        <div role="alert" className="alert alert-warning">
          <span>{t('bud.overAlert', { count: overBudgetCount })}</span>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-52 rounded-box" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="alert alert-error flex items-center justify-between gap-2">
          <span>{t('bud.loadError')} {loadError}</span>
          <button type="button" className="btn btn-sm" onClick={retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : budgets.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <EmptyState
            title={t('bud.empty')}
            message={t('bud.emptyMsg', { month: monthLabel(view) })}
            action={
              <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>
                {t('bud.add')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} onEdit={openForm} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {formOpen ? (
        <BudgetForm
          budget={editing}
          categories={categories}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('bud.confirmTitle')}
          message={t('bud.confirmMsg', {
            category: deleting.category.name,
            month: monthLabel({ month: deleting.month, year: deleting.year }),
          })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default BudgetsPage