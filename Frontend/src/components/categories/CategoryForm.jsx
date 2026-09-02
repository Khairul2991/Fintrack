import { useEffect, useState } from 'react'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function initialForm(category) {
  if (!category) {
    return { name: '', icon: '', color: '#f59e0b' }
  }
  return { name: category.name, icon: category.icon, color: category.color }
}

function CategoryForm({ category, onCancel, onSave }) {
  const [form, setForm] = useState(() => initialForm(category))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [submitting, onCancel])

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) {
      next.name = 'Name is required.'
    } else if (form.name.trim().length > 50) {
      next.name = 'Name must be at most 50 characters.'
    }
    if (!form.icon.trim()) {
      next.icon = 'Icon is required.'
    }
    if (!HEX_COLOR.test(form.color)) {
      next.color = 'Color must be a hex value like #f59e0b.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        name: form.name.trim(),
        icon: form.icon.trim(),
        color: form.color,
      })
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-bold">{category ? 'Edit Category' : 'New Category'}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="cat-name">
              <span className="label-text">Name</span>
            </label>
            <input
              id="cat-name"
              type="text"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              maxLength={50}
              placeholder="e.g. Groceries"
              autoFocus
            />
            {errors.name ? <p className="mt-1 text-xs text-error">{errors.name}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="cat-icon">
              <span className="label-text">
                Icon <span className="ml-1 text-base-content/40">(emoji)</span>
              </span>
            </label>
            <input
              id="cat-icon"
              type="text"
              className={`input input-bordered w-full ${errors.icon ? 'input-error' : ''}`}
              value={form.icon}
              onChange={(event) => setField('icon', event.target.value)}
              maxLength={4}
              placeholder="e.g. 🍜"
            />
            {errors.icon ? <p className="mt-1 text-xs text-error">{errors.icon}</p> : null}
          </div>
          <div>
            <span className="label">
              <span className="label-text">Color</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                id="cat-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-base-300 bg-transparent"
                value={form.color}
                onChange={(event) => setField('color', event.target.value)}
                aria-label="Pick color"
              />
              <input
                type="text"
                className={`input input-bordered w-32 font-mono text-sm ${
                  errors.color ? 'input-error' : ''
                }`}
                value={form.color}
                onChange={(event) => setField('color', event.target.value)}
                maxLength={7}
                placeholder="#f59e0b"
                aria-label="Color hex value"
              />
            </div>
            {errors.color ? <p className="mt-1 text-xs text-error">{errors.color}</p> : null}
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {category ? 'Save changes' : 'Add category'}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close dialog"
        onClick={() => {
          if (!submitting) onCancel()
        }}
      />
    </dialog>
  )
}

export default CategoryForm