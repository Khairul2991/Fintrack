import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listNotifications } from '../services/notificationApi'

// Single shared source of truth for the unread notification count. The API
// (GET /notifications -> unread) is the source; the Sidebar badge and the
// Notifications page read and update this one state so they can never drift.
const NotificationContext = createContext(null)

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}

export function NotificationProvider({ children }) {
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(() => {
    return listNotifications()
      .then((response) => {
        setUnread(response.data.unread)
        return response.data.unread
      })
      .catch(() => null)
  }, [])

  // Keep the badge fresh without polling: refresh once on mount and on every
  // route change (e.g. a dashboard visit can now create due reminders via
  // catch-up). The Notifications page loads the same payload itself, so skip
  // the redundant fetch while it is mounted.
  useEffect(() => {
    if (location.pathname === '/notifications') return
    refreshUnread()
  }, [location.pathname, refreshUnread])

  const value = useMemo(
    () => ({ unread, setUnread, refreshUnread }),
    [unread, refreshUnread],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}