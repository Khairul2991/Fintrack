import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function initialForm(category) {
  if (!category) {
    return { name: '', icon: '', color: '#f59e0b' }
  }
  return { name: category.name, icon: category.icon, color: category.color }
}

function CategoryForm({ category, onCancel, onSave }) {
  const { t } = useLanguage()
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
      next.name = t('catf.errName')
    } else if (form.name.trim().length > 50) {
      next.name = t('catf.errNameTooLong')
    }
    if (!form.icon.trim()) {
      next.icon = t('catf.errIcon')
    }
    if (!HEX_COLOR.test(form.color)) {
      next.color = t('catf.errColor')
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
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-bold">{category ? t('catf.edit') : t('catf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="cat-name">
              <span className="label-text">{t('catf.name')}</span>
            </label>
            <input
              id="cat-name"
              type="text"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              maxLength={50}
              placeholder={t('catf.namePlaceholder')}
              autoFocus
            />
            {errors.name ? <p className="mt-1 text-xs text-error">{errors.name}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="cat-icon">
              <span className="label-text">
                {t('catf.icon')}{' '}
                <span className="ml-1 text-base-content/40">{t('catf.iconEmoji')}</span>
              </span>
            </label>
            <input
              id="cat-icon"
              type="text"
              className={`input input-bordered w-full ${errors.icon ? 'input-error' : ''}`}
              value={form.icon}
              onChange={(event) => setField('icon', event.target.value)}
              maxLength={4}
              placeholder={t('catf.iconPlaceholder')}
            />
            {errors.icon ? <p className="mt-1 text-xs text-error">{errors.icon}</p> : null}
          </div>
          <div>
            <span className="label">
              <span className="label-text">{t('catf.color')}</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                id="cat-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-base-300 bg-transparent"
                value={form.color}
                onChange={(event) => setField('color', event.target.value)}
                aria-label={t('catf.colorAria')}
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
                aria-label={t('catf.colorHexAria')}
              />
            </div>
            {errors.color ? <p className="mt-1 text-xs text-error">{errors.color}</p> : null}
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {category ? t('catf.submitEdit') : t('catf.submitAdd')}
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

export default CategoryForm