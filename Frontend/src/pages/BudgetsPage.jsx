import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PlusIcon } from '../components/common/Icons'
import BudgetCard from '../components/budgets/BudgetCard'
import BudgetForm from '../components/budgets/BudgetForm'
import { useToast } from '../context/ToastContext'
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from '../services/budgetApi'
import { listCategories } from '../services/categoryApi'
import { formatMonth } from '../utils/format'

function currentMonthYear() {
  const now = new Date()
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
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

  const [view, setView] = useState(currentMonthYear)
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
        setLoadError(error.message)
        setStatus('error')
      })
  }, [view])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function changeView(next) {
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
      .catch((error) => toast.error(error.message))
      .finally(() => setFormBusy(false))
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateBudget(editing.id, payload)
      toast.success('Budget updated.')
    } else {
      await createBudget(payload)
      toast.success('Budget added.')
    }
    closeForm()
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteBudget(deleting.id)
      toast.success('Budget deleted.')
      setDeleting(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const isCurrent = sameMonth(view, currentMonthYear())
  const overBudgetCount = budgets.filter((budget) => budget.status === 'Over Budget').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Budgets" subtitle="Plan monthly spending by category." />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openForm(null)}
          disabled={formBusy}
        >
          {formBusy ? <span className="loading loading-spinner loading-sm" /> : <PlusIcon />}
          {formBusy ? 'Loading categories...' : 'Add Budget'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => changeView(shiftMonth(view, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-sm join-item no-animation"
            onClick={() => changeView(currentMonthYear())}
            aria-label="Go to current month"
          >
            {monthLabel(view)}
          </button>
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => changeView(shiftMonth(view, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        {isCurrent ? (
          <span className="badge badge-ghost">Current month</span>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeView(currentMonthYear())}>
            Go to current month
          </button>
        )}
      </div>

      {status === 'ready' && overBudgetCount > 0 ? (
        <div role="alert" className="alert alert-warning">
          <span>
            You have exceeded {overBudgetCount} budget{overBudgetCount > 1 ? 's' : ''} this
            month. Review your spending.
          </span>
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
          <span>Unable to load budgets. {loadError}</span>
          <button type="button" className="btn btn-sm" onClick={retry}>
            Retry
          </button>
        </div>
      ) : budgets.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <EmptyState
            title="No budgets created yet"
            message={`Create a budget for ${monthLabel(view)} to start tracking your spending.`}
            action={
              <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>
                Add Budget
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openForm}
              onDelete={setDeleting}
            />
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
          title="Delete budget"
          message={`Delete the ${deleting.category.name} budget for ${monthLabel(
            { month: deleting.month, year: deleting.year },
          )}? This action cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default BudgetsPage