import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

function initialForm(budget) {
  const now = new Date()
  const current = { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }
  if (!budget) {
    return { categoryId: '', month: String(current.month), year: String(current.year), amount: '' }
  }
  return {
    categoryId: String(budget.categoryId),
    month: String(budget.month),
    year: String(budget.year),
    amount: budget.amount,
  }
}

function BudgetForm({ budget, categories, onCancel, onSave }) {
  const { t, localizeCategory } = useLanguage()
  const [form, setForm] = useState(() => initialForm(budget))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categoryIdRef = useRef(null)
  const monthRef = useRef(null)
  const yearRef = useRef(null)
  const amountRef = useRef(null)

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
    if (!form.categoryId) {
      next.categoryId = t('budf.errCategory')
    }
    const month = Number(form.month)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      next.month = t('budf.errMonth')
    }
    const year = Number(form.year)
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      next.year = t('budf.errYear', { min: MIN_YEAR, max: MAX_YEAR })
    }
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      next.amount = t('budf.errAmount')
    }
    setErrors(next)
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    const next = validate()
    const order = [
      { key: 'categoryId', ref: categoryIdRef },
      { key: 'month', ref: monthRef },
      { key: 'year', ref: yearRef },
      { key: 'amount', ref: amountRef },
    ]
    const firstInvalid = order.find((item) => next[item.key])
    if (firstInvalid) {
      if (firstInvalid.ref.current) firstInvalid.ref.current.focus()
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        categoryId: Number(form.categoryId),
        month: Number(form.month),
        year: Number(form.year),
        amount: form.amount,
      })
    } catch (error) {
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  const years = []
  for (let y = MAX_YEAR; y >= MIN_YEAR; y -= 1) {
    years.push(y)
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md rounded-box">
        <h3 className="text-lg font-bold">{budget ? t('budf.edit') : t('budf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="budget-category">
              <span className="label-text">{t('budf.category')}</span>
            </label>
            <select
              id="budget-category"
              ref={categoryIdRef}
              className={`select select-bordered w-full ${errors.categoryId ? 'select-error' : ''}`}
              value={form.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
              autoFocus
            >
              <option value="">{t('budf.selectCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {localizeCategory(category)}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-1 text-xs text-error">{errors.categoryId}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="budget-month">
                <span className="label-text">{t('budf.month')}</span>
              </label>
              <select
                id="budget-month"
                ref={monthRef}
                className={`select select-bordered w-full ${errors.month ? 'select-error' : ''}`}
                value={form.month}
                onChange={(event) => setField('month', event.target.value)}
              >
                {Array.from({ length: 12 }, (_, index) => {
                  const name = t(`months.${index + 1}`)
                  return (
                    <option key={name} value={index + 1}>
                      {index + 1}. {name}
                    </option>
                  )
                })}
              </select>
              {errors.month ? <p className="mt-1 text-xs text-error">{errors.month}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="budget-year">
                <span className="label-text">{t('budf.year')}</span>
              </label>
              <select
                id="budget-year"
                ref={yearRef}
                className={`select select-bordered w-full ${errors.year ? 'select-error' : ''}`}
                value={form.year}
                onChange={(event) => setField('year', event.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.year ? <p className="mt-1 text-xs text-error">{errors.year}</p> : null}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="budget-amount">
              <span className="label-text">{t('budf.amount')}</span>
            </label>
            <MoneyInput
              id="budget-amount"
              inputRef={amountRef}
              value={form.amount}
              onChange={(value) => setField('amount', value)}
              placeholder={t('budf.amountPlaceholder')}
              error={Boolean(errors.amount)}
            />
            {errors.amount ? <p className="mt-1 text-xs text-error">{errors.amount}</p> : null}
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {budget ? t('budf.submitEdit') : t('budf.submitAdd')}
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

export default BudgetForm