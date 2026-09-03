import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import {
  generateNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationApi'

const TYPE_KEYS = {
  RECURRING_DUE: 'notif.typeRecurring',
  BUDGET_LIMIT: 'notif.typeBudget',
  GOAL_DEADLINE: 'notif.typeGoal',
}

function timeAgo(value, t) {
  if (!value) return ''
  const date = new Date(value)
  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('notif.justNow')
  if (minutes < 60) return t('notif.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('notif.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('notif.daysAgo', { count: days })
}

function NotificationsPage() {
  const toast = useToast()
  const { t, translateError } = useLanguage()

  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [browserState, setBrowserState] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return window.Notification.permission
  })

  const load = useCallback(() => {
    listNotifications()
      .then((response) => {
        setLoadError('')
        setItems(response.data.items)
        setUnread(response.data.unread)
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [translateError])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function startReload() {
    setStatus('loading')
  }

  async function handleGenerate() {
    if (busy) return
    setBusy(true)
    try {
      const response = await generateNotifications()
      if (response.data.unread > 0 && (await maybeNotifyBrowser(response.data.unread))) {
        // native toast handled by maybeNotifyBrowser
      }
      toast.success(t('notif.updated'))
      startReload()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkAll() {
    if (busy) return
    setBusy(true)
    try {
      await markAllNotificationsRead()
      toast.success(t('notif.markedAllRead'))
      startReload()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkRead(item) {
    try {
      await markNotificationRead(item.id)
      setUnread((current) => Math.max(0, current - (item.read ? 0 : 1)))
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
      )
    } catch (error) {
      toast.error(translateError(error.message))
    }
  }

  async function enableBrowserNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error(t('notif.browserUnsupported'))
      return
    }
    try {
      const permission = await window.Notification.requestPermission()
      setBrowserState(permission)
      if (permission === 'granted') {
        toast.success(t('notif.browserEnabled'))
      } else {
        toast.error(t('notif.permissionDenied'))
      }
    } catch {
      setBrowserState('denied')
      toast.error(t('notif.permissionDenied'))
    }
  }

  async function maybeNotifyBrowser(count) {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (window.Notification.permission !== 'granted') return false
    new window.Notification(t('notif.title'), { body: t('notif.unread', { count }) })
    return true
  }

  const enableButtonDisabled = browserState === 'denied' || browserState === 'unsupported'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('notif.title')} subtitle={t('notif.subtitle')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleGenerate}
            disabled={busy}
          >
            {busy ? <span className="loading loading-spinner loading-sm" /> : null}
            {t('notif.generate')}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleMarkAll}
            disabled={busy || unread === 0}
          >
            {t('notif.markAll')}
          </button>
        </div>
      </PageHeader>

      {unread > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-base-content/60">
            {t('notif.unread', { count: unread })}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={enableBrowserNotifications}
            disabled={enableButtonDisabled}
          >
            {t('notif.enableBrowser')}
          </button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="card surface card-border">
          <div className="card-body">
            <LoadingSkeleton rows={6} />
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="card surface card-border">
          <div role="alert" className="card-body">
            <div className="flex items-center justify-between gap-2">
              <span>{t('notif.loadError')} {loadError}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card surface card-border">
          <div className="card-body">
            <EmptyState title={t('notif.empty')} message={t('notif.emptyMsg')} />
          </div>
        </div>
      ) : (
        <div className="card surface card-border">
          <ul className="divide-y divide-base-200">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.read ? 'bg-base-300' : 'bg-primary'
                    }`}
                    aria-hidden="true"
                  />
                  <div
                    className="min-w-0"
                    role="button"
                    tabIndex={0}
                    aria-label={t('notif.itemAria', { title: item.title })}
                    onClick={() => {
                      if (!item.read) handleMarkRead(item)
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !item.read) {
                        event.preventDefault()
                        handleMarkRead(item)
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="badge badge-sm border-0 font-medium bg-base-200 text-base-content/60">
                        {t(TYPE_KEYS[item.type] || 'notif.typeBudget')}
                      </span>
                      {item.read ? (
                        <span className="text-xs text-base-content/40">{t('notif.read')}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-base-content/70">{item.message}</p>
                    <p className="mt-1 text-xs text-base-content/40">{timeAgo(item.createdAt, t)}</p>
                  </div>
                </div>
                {!item.read ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs shrink-0"
                    onClick={() => handleMarkRead(item)}
                    aria-label={t('notif.markReadAria')}
                  >
                    {t('notif.markReadAria')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage