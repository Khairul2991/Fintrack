import { useEffect } from 'react'

function ConfirmDialog({ title, message, confirmLabel = 'Delete', loading = false, onCancel, onConfirm }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, loading])

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="py-4 text-sm text-base-content/70">{message}</p>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>
            Cancel
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
        aria-label="Close dialog"
        onClick={() => {
          if (!loading) onCancel()
        }}
      />
    </dialog>
  )
}

export default ConfirmDialog