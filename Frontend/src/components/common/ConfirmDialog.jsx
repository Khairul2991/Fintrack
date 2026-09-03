import { useEffect, useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'

function ConfirmDialog({ title, message, confirmLabel, loading = false, onCancel, onConfirm }) {
  const { t } = useLanguage()
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel()
        return
      }
      if (event.key === 'Tab' && !loading) {
        const focusables = dialogRef.current
          ? Array.from(dialogRef.current.querySelectorAll('button'))
          : []
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, loading])

  useEffect(() => {
    if (cancelRef.current) cancelRef.current.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-open"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="modal-box rounded-box">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-error"
            style={{ backgroundColor: 'color-mix(in oklab, var(--color-error) 12%, transparent)' }}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 3 1.5 20.5h21L12 3z" />
              <path d="M12 10v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-base-content">
              {title}
            </h3>
            <p id="confirm-dialog-message" className="mt-1 text-sm text-base-content/60">
              {message}
            </p>
          </div>
        </div>
        <div className="modal-action">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t('common.closeDialog')}
        onClick={() => {
          if (!loading) onCancel()
        }}
      />
    </dialog>
  )
}

export default ConfirmDialog