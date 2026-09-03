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
      <div className="modal-box">
        <h3 id="confirm-dialog-title" className="text-lg font-bold">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="py-4 text-sm text-base-content/70">
          {message}
        </p>
        <div className="modal-action">
          <button
            ref={cancelRef}
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-error" onClick={onConfirm} disabled={loading}>
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