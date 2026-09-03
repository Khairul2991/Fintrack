import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import MoneyInput from '../components/common/MoneyInput'
import GoalForm from '../components/goals/GoalForm'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { listCategories } from '../services/categoryApi'
import { listAccounts } from '../services/accountApi'
import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
  updateGoalProgress,
} from '../services/goalApi'
import { formatCurrency, formatDate } from '../utils/format'
import { isAmountOverLimit } from '../utils/numberFormat'

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

function GoalProgressDialog({ goal, onCancel, onSave }) {
  const { t } = useLanguage()
  const [value, setValue] = useState(goal.currentAmount)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const num = Number(value)
    if (value === '' || !Number.isFinite(num) || num < 0) {
      setError(t('goalf.errCurrent'))
      return
    }
    if (isAmountOverLimit(value)) {
      setError(t('common.amountTooLarge'))
      return
    }
    if (Number(goal.targetAmount) && num > Number(goal.targetAmount)) {
      setError(t('goalf.errCurrentExceedsTarget'))
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSave(value)
    } catch (err) {
      setError(err.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm rounded-box">
        <h3 className="text-lg font-bold">{t('goal.updateProgressTitle')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="goal-progress">
              <span className="label-text">{t('goal.updateProgressLabel')}</span>
            </label>
            <MoneyInput
              id="goal-progress"
              value={value}
              onChange={(next) => {
                setValue(next)
                setError('')
              }}
              error={Boolean(error)}
            />
            {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t('common.closeDialog')}
        onClick={() => {
          if (!submitting) onCancel()
        }}
      />
    </dialog>
  )
}

function GoalsPage() {
  const toast = useToast()
  const { t, translateError, localizeCategory } = useLanguage()

  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])

  const [goals, setGoals] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [progressTarget, setProgressTarget] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    let active = true
    listCategories()
      .then((response) => {
        if (active) setCategories(response.data)
      })
      .catch(() => {
        if (active) setCategories([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    listAccounts()
      .then((response) => {
        if (active) setAccounts(response.data)
      })
      .catch(() => {
        if (active) setAccounts([])
      })
    return () => {
      active = false
    }
  }, [])

  const loadGoals = useCallback(() => {
    listGoals()
      .then((response) => {
        setLoadError('')
        setGoals(response.data)
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [translateError])

  useEffect(() => {
    loadGoals()
  }, [loadGoals, refreshKey])

  function startReload() {
    setStatus('loading')
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(goal) {
    setEditing(goal)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateGoal(editing.id, payload)
      toast.success(t('goal.updated'))
    } else {
      await createGoal(payload)
      toast.success(t('goal.added'))
    }
    setFormOpen(false)
    setEditing(null)
    startReload()
    setRefreshKey((key) => key + 1)
  }

  async function handleProgressSave(value) {
    await updateGoalProgress(progressTarget.id, value)
    toast.success(t('goal.progressUpdated'))
    setProgressTarget(null)
    startReload()
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteGoal(deleting.id)
      toast.success(t('goal.deleted'))
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
      <PageHeader title={t('goal.title')} subtitle={t('goal.subtitle')}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {t('goal.add')}
        </button>
      </PageHeader>

      <div className="card surface card-border">
        {status === 'loading' ? (
          <LoadingSkeleton rows={6} />
        ) : loadError ? (
          <div role="alert" className="m-4 flex items-center justify-between gap-2 alert alert-error">
            <span>{t('goal.loadError')} {loadError}</span>
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
        ) : goals.length === 0 ? (
          <EmptyState
            title={t('goal.empty')}
            message={t('goal.emptyMsg')}
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                {t('goal.add')}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => {
              const percent = Math.min(100, Number(goal.progress))
              const completed = goal.status === 'COMPLETED'
              return (
                <article
                  key={goal.id}
                  className="card surface card-border rounded-box p-4 min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base">{goal.name}</h3>
                      <p className="text-xs text-base-content/50">
                        {goal.category ? localizeCategory(goal.category) : ''}
                        {goal.category && goal.account ? ' · ' : ''}
                        {goal.account ? goal.account.name : ''}
                      </p>
                    </div>
                    {completed ? (
                      <span className="badge badge-success badge-sm border-0 font-medium">
                        {t('goal.statusCompleted')}
                      </span>
                    ) : (
                      <span className="badge badge-sm border-0 font-medium bg-primary/15 text-primary">
                        {t('goal.statusInProgress')}
                      </span>
                    )}
                  </div>

                  {goal.description ? (
                    <p className="mt-2 text-sm text-base-content/60">{goal.description}</p>
                  ) : null}

                  <progress
                    className={`progress progress-primary mt-3 h-2.5 w-full ${completed ? 'progress-success' : ''}`}
                    value={percent}
                    max="100"
                    aria-label={t('goal.progressAria', { percent: Math.round(percent) })}
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-base-content/60">
                    <span className="min-w-0">
                      {t('goal.colCurrent')}: <span className="financial-value">{formatCurrency(goal.currentAmount)}</span>
                    </span>
                    <span className="min-w-0 text-right">
                      {t('goal.colTarget')}: <span className="financial-value">{formatCurrency(goal.targetAmount)}</span>
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-primary">
                      {t('goal.remaining')}: <span className="financial-value">{formatCurrency(goal.remaining)}</span>
                    </span>
                    <span className="text-base-content/50">
                      {goal.targetDate
                        ? t('goal.deadlineLabel', { date: formatDate(goal.targetDate) })
                        : t('goal.noDeadline')}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-base-200 pt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setProgressTarget(goal)}
                      aria-label={t('goal.updateProgressAria')}
                    >
                      {t('goal.updateProgressAria')}
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                        onClick={() => openEdit(goal)}
                        aria-label={t('goal.editAria', { name: goal.name })}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
                        onClick={() => setDeleting(goal)}
                        aria-label={t('goal.deleteAria', { name: goal.name })}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {formOpen ? (
        <GoalForm
          goal={editing}
          categories={categories}
          accounts={accounts}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : null}

      {progressTarget ? (
        <GoalProgressDialog
          goal={progressTarget}
          onCancel={() => setProgressTarget(null)}
          onSave={handleProgressSave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('goal.confirmTitle')}
          message={t('goal.confirmMsg', { name: deleting.name })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default GoalsPage