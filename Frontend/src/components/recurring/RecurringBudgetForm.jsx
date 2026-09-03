import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

const FREQUENCIES = ['MONTHLY', 'YEARLY']

function currentYear() {
  return new Date().getFullYear()
}

function initialForm(recurring, categories) {
  if (!recurring) {
    return {
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      amount: '',
      frequency: 'MONTHLY',
      startMonth: new Date().getMonth() + 1,
      startYear: currentYear(),
    }
  }
  return {
    categoryId: String(recurring.categoryId),
    amount: recurring.amount,
    frequency: recurring.frequency,
    startMonth: recurring.startMonth,
    startYear: recurring.startYear,
  }
}

function RecurringBudgetForm({ recurring, categories = [], onCancel, onSave }) {
  const { t, localizeCategory } = useLanguage()
  const [form, setForm] = useState(() => initialForm(recurring, categories))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categoryIdRef = useRef(null)
  const amountRef = useRef(null)
  const frequencyRef = useRef(null)
  const startMonthRef = useRef(null)
  const startYearRef = useRef(null)

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
      next.categoryId = t('recBf.errCategory')
    }
    const amount = Number(form.amount)
    if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
      next.amount = t('recBf.errAmount')
    } else if (isAmountOverLimit(form.amount)) {
      next.amount = t('common.amountTooLarge')
    }
    if (!FREQUENCIES.includes(form.frequency)) {
      next.frequency = t('recBf.errFrequency')
    }
    const month = Number(form.startMonth)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      next.startMonth = t('recBf.errStartMonth')
    }
    const year = Number(form.startYear)
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      next.startYear = t('recBf.errStartYear', { min: MIN_YEAR, max: MAX_YEAR })
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
      { key: 'amount', ref: amountRef },
      { key: 'frequency', ref: frequencyRef },
      { key: 'startMonth', ref: startMonthRef },
      { key: 'startYear', ref: startYearRef },
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
        amount: form.amount,
        frequency: form.frequency,
        startMonth: Number(form.startMonth),
        startYear: Number(form.startYear),
      })
    } catch (error) {
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg rounded-box">
        <h3 className="text-lg font-bold">{recurring ? t('recBf.edit') : t('recBf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="recb-category">
                <span className="label-text">{t('recBf.category')}</span>
              </label>
              <select
                id="recb-category"
                ref={categoryIdRef}
                className={`select select-bordered w-full ${errors.categoryId ? 'select-error' : ''}`}
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">{t('recBf.selectCategory')}</option>
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
            <div>
              <label className="label" htmlFor="recb-amount">
                <span className="label-text">{t('recBf.amount')}</span>
              </label>
              <MoneyInput
                id="recb-amount"
                inputRef={amountRef}
                value={form.amount}
                onChange={(value) => setField('amount', value)}
                placeholder={t('recBf.amountPlaceholder')}
                error={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="mt-1 text-xs text-error">{errors.amount}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="recb-frequency">
                <span className="label-text">{t('recBf.frequency')}</span>
              </label>
              <select
                id="recb-frequency"
                ref={frequencyRef}
                className={`select select-bordered w-full ${errors.frequency ? 'select-error' : ''}`}
                value={form.frequency}
                onChange={(event) => setField('frequency', event.target.value)}
              >
                <option value="">{t('recBf.selectFrequency')}</option>
                <option value="MONTHLY">{t('recB.freqMonthly')}</option>
                <option value="YEARLY">{t('recB.freqYearly')}</option>
              </select>
              {errors.frequency ? (
                <p className="mt-1 text-xs text-error">{errors.frequency}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="recb-month">
                <span className="label-text">{t('recBf.startMonth')}</span>
              </label>
              <select
                id="recb-month"
                ref={startMonthRef}
                className={`select select-bordered w-full ${errors.startMonth ? 'select-error' : ''}`}
                value={form.startMonth}
                onChange={(event) => setField('startMonth', Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {String(month).padStart(2, '0')}
                  </option>
                ))}
              </select>
              {errors.startMonth ? (
                <p className="mt-1 text-xs text-error">{errors.startMonth}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="recb-year">
                <span className="label-text">{t('recBf.startYear')}</span>
              </label>
              <input
                id="recb-year"
                ref={startYearRef}
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                className={`input input-bordered w-full ${errors.startYear ? 'input-error' : ''}`}
                value={form.startYear}
                onChange={(event) => setField('startYear', Number(event.target.value))}
              />
              {errors.startYear ? (
                <p className="mt-1 text-xs text-error">{errors.startYear}</p>
              ) : null}
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {recurring ? t('recBf.submitEdit') : t('recBf.submitAdd')}
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

export default RecurringBudgetForm