import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import RecurringBudgetForm from '../components/recurring/RecurringBudgetForm'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { listCategories } from '../services/categoryApi'
import {
  createRecurringBudget,
  deleteRecurringBudget,
  listRecurringBudgets,
  setRecurringBudgetActive,
  updateRecurringBudget,
} from '../services/recurringBudgetApi'
import { formatCurrency } from '../utils/format'

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zM19.5 8.25l.75.75"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.348a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  )
}

function RecurringBudgetsPage() {
  const toast = useToast()
  const { t, translateError, localizeCategory } = useLanguage()

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)

  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

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

  const loadItems = useCallback(() => {
    listRecurringBudgets()
      .then((response) => {
        setLoadError('')
        setItems(response.data)
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [translateError])

  useEffect(() => {
    loadItems()
  }, [loadItems, refreshKey])

  function startReload() {
    setStatus('loading')
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateRecurringBudget(editing.id, payload)
      toast.success(t('recB.updated'))
    } else {
      await createRecurringBudget(payload)
      toast.success(t('recB.added'))
    }
    setFormOpen(false)
    setEditing(null)
    startReload()
    setRefreshKey((key) => key + 1)
  }

  async function handleToggle(item) {
    setTogglingId(item.id)
    try {
      const active = !item.active
      await setRecurringBudgetActive(item.id, active)
      toast.success(active ? t('recB.resumed') : t('recB.paused'))
      startReload()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteRecurringBudget(deleting.id)
      toast.success(t('recB.deleted'))
      setDeleting(null)
      startReload()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('recB.title')} subtitle={t('recB.subtitle')}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {t('recB.add')}
        </button>
      </PageHeader>

      <div role="status" className="alert alert-info">
        <span>{t('recB.rolloverInfo')}</span>
      </div>

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

      <div className="card surface card-border">
        {status === 'loading' ? (
          <LoadingSkeleton rows={6} />
        ) : loadError ? (
          <div role="alert" className="m-4 flex items-center justify-between gap-2 alert alert-error">
            <span>{t('recB.loadError')} {loadError}</span>
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
        ) : items.length === 0 ? (
          <EmptyState
            title={t('recB.empty')}
            message={t('recB.emptyMsg')}
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                {t('recB.add')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="text-base-content/60">
                  <th className="text-xs font-medium uppercase tracking-wide">
                    {t('recB.colCategory')}
                  </th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide">
                    {t('recB.colAmount')}
                  </th>
                  <th className="text-xs font-medium uppercase tracking-wide">{t('recB.colFrequency')}</th>
                  <th className="text-xs font-medium uppercase tracking-wide">{t('recB.colNext')}</th>
                  <th className="text-xs font-medium uppercase tracking-wide">{t('recB.colActive')}</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide">
                    {t('recB.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover">
                    <td className="text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs"
                          style={{ backgroundColor: `${item.category.color}26` }}
                          aria-hidden="true"
                        >
                          {item.category.icon}
                        </span>
                        {localizeCategory(item.category)}
                      </span>
                    </td>
                    <td className="financial-value text-right font-semibold tabular-nums">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {item.frequency === 'YEARLY' ? t('recB.freqYearly') : t('recB.freqMonthly')}
                    </td>
                    <td className="whitespace-nowrap text-sm text-base-content/70">{item.next}</td>
                    <td>
                      <span
                        className={`badge badge-sm border-0 font-medium ${
                          item.active ? 'bg-success/12 text-success' : 'bg-base-300 text-base-content/60'
                        }`}
                      >
                        {item.active ? t('recB.active') : t('recB.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                          onClick={() => handleToggle(item)}
                          disabled={togglingId === item.id}
                          aria-label={item.active ? t('recB.pauseAria', { name: item.category.name }) : t('recB.resumeAria', { name: item.category.name })}
                          title={item.active ? t('recB.pauseAria', { name: item.category.name }) : t('recB.resumeAria', { name: item.category.name })}
                        >
                          {item.active ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                          onClick={() => openEdit(item)}
                          aria-label={t('recB.editAria', { name: item.category.name })}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
                          onClick={() => setDeleting(item)}
                          aria-label={t('recB.deleteAria', { name: item.category.name })}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen ? (
        <RecurringBudgetForm
          recurring={editing}
          categories={categories}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('recB.confirmTitle')}
          message={t('recB.confirmMsg', { category: deleting.category.name })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default RecurringBudgetsPage