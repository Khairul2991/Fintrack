import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../../context/ToastContext'

function alertClass(type) {
  if (type === 'success') return 'alert-success'
  if (type === 'error') return 'alert-error'
  return 'alert-info'
}

function AlertIcon({ type }) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-5 w-5 shrink-0',
    'aria-hidden': 'true',
  }
  if (type === 'success') {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((current) => [...current, { id, message, type }])
      const timer = setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast toast-end z-[100] gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`alert ${alertClass(toast.type)} shadow-elevated rounded-field`}
          >
            <AlertIcon type={toast.type} />
            <span className="text-sm">{toast.message}</span>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-xs ml-1"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider