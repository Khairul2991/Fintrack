import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'

const DESCRIPTION_MAX = 200
const NOTE_MAX = 200

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function initialForm(recurring, categories) {
  if (!recurring) {
    return {
      description: '',
      amount: '',
      type: 'EXPENSE',
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      accountId: '',
      frequency: '',
      startDate: todayInput(),
      endDate: '',
      note: '',
    }
  }
  return {
    description: recurring.description,
    amount: recurring.amount,
    type: recurring.type,
    categoryId: String(recurring.categoryId),
    accountId: recurring.accountId != null ? String(recurring.accountId) : '',
    frequency: recurring.frequency,
    startDate: recurring.startDate.slice(0, 10),
    endDate: recurring.endDate ? recurring.endDate.slice(0, 10) : '',
    note: recurring.note ?? '',
  }
}

function RecurringTransactionForm({
  recurring,
  categories,
  accounts = [],
  onCancel,
  onSave,
}) {
  const { t, localizeCategory } = useLanguage()
  const [form, setForm] = useState(() => initialForm(recurring, categories))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const descriptionRef = useRef(null)
  const amountRef = useRef(null)
  const typeRef = useRef(null)
  const categoryIdRef = useRef(null)
  const frequencyRef = useRef(null)
  const startDateRef = useRef(null)

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
    if (!form.description.trim()) {
      next.description = t('recTf.errDescription')
    } else if (form.description.length > DESCRIPTION_MAX) {
      next.description = t('recTf.errDescriptionTooLong')
    }
    const amount = Number(form.amount)
    if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
      next.amount = t('recTf.errAmount')
    } else if (isAmountOverLimit(form.amount)) {
      next.amount = t('common.amountTooLarge')
    }
    if (form.type !== 'INCOME' && form.type !== 'EXPENSE') {
      next.type = t('recTf.errType')
    }
    if (!form.categoryId) {
      next.categoryId = t('recTf.errCategory')
    }
    if (!FREQUENCIES.includes(form.frequency)) {
      next.frequency = t('recTf.errFrequency')
    }
    if (!form.startDate) {
      next.startDate = t('recTf.errStartDate')
    }
    if (form.endDate) {
      if (form.startDate && form.endDate < form.startDate) {
        next.endDate = t('recTf.errEndBeforeStart')
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) {
        next.endDate = t('recTf.errEndDate')
      }
    }
    if (form.note.length > NOTE_MAX) {
      next.note = t('recTf.errNoteTooLong')
    }
    setErrors(next)
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    const next = validate()
    const order = [
      { key: 'description', ref: descriptionRef },
      { key: 'amount', ref: amountRef },
      { key: 'type', ref: typeRef },
      { key: 'categoryId', ref: categoryIdRef },
      { key: 'frequency', ref: frequencyRef },
      { key: 'startDate', ref: startDateRef },
    ]
    const firstInvalid = order.find((item) => next[item.key])
    if (firstInvalid) {
      if (firstInvalid.ref.current) firstInvalid.ref.current.focus()
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        description: form.description.trim(),
        amount: form.amount,
        type: form.type,
        categoryId: Number(form.categoryId),
        accountId: form.accountId ? Number(form.accountId) : null,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate ? form.endDate : null,
        note: form.note.trim() ? form.note.trim() : null,
      })
    } catch (error) {
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl rounded-box">
        <h3 className="text-lg font-bold">
          {recurring ? t('recTf.edit') : t('recTf.new')}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="rect-description">
                <span className="label-text">{t('recTf.description')}</span>
              </label>
              <input
                id="rect-description"
                ref={descriptionRef}
                type="text"
                className={`input input-bordered w-full ${errors.description ? 'input-error' : ''}`}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={DESCRIPTION_MAX}
                placeholder={t('recTf.descPlaceholder')}
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-error">{errors.description}</p>
              ) : (
                <p className="mt-1 text-right text-xs text-base-content/40 tabular-nums">
                  {form.description.length}/{DESCRIPTION_MAX}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="rect-amount">
                <span className="label-text">{t('recTf.amount')}</span>
              </label>
              <MoneyInput
                id="rect-amount"
                inputRef={amountRef}
                value={form.amount}
                onChange={(value) => setField('amount', value)}
                placeholder={t('recTf.amountPlaceholder')}
                error={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="mt-1 text-xs text-error">{errors.amount}</p> : null}
            </div>
            <div>
              <span className="label">
                <span className="label-text">{t('recTf.type')}</span>
              </span>
              <div className="flex gap-2">
                <label
                  className={`btn btn-outline flex-1 ${
                    form.type === 'EXPENSE' ? 'btn-error' : 'bg-base-200/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="rect-type"
                    ref={typeRef}
                    className="sr-only"
                    checked={form.type === 'EXPENSE'}
                    onChange={() => setField('type', 'EXPENSE')}
                  />
                  {t('common.expense')}
                </label>
                <label
                  className={`btn btn-outline flex-1 ${
                    form.type === 'INCOME' ? 'btn-success' : 'bg-base-200/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="rect-type"
                    className="sr-only"
                    checked={form.type === 'INCOME'}
                    onChange={() => setField('type', 'INCOME')}
                  />
                  {t('common.income')}
                </label>
              </div>
              {errors.type ? <p className="mt-1 text-xs text-error">{errors.type}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="rect-category">
                <span className="label-text">{t('recTf.category')}</span>
              </label>
              <select
                id="rect-category"
                ref={categoryIdRef}
                className={`select select-bordered w-full ${errors.categoryId ? 'select-error' : ''}`}
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">{t('recTf.selectCategory')}</option>
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
              <label className="label" htmlFor="rect-account">
                <span className="label-text">{t('recTf.account')}</span>
              </label>
              <select
                id="rect-account"
                className="select select-bordered w-full"
                value={form.accountId}
                onChange={(event) => setField('accountId', event.target.value)}
              >
                <option value="">{t('recTf.selectAccount')}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="rect-frequency">
                <span className="label-text">{t('recTf.frequency')}</span>
              </label>
              <select
                id="rect-frequency"
                ref={frequencyRef}
                className={`select select-bordered w-full ${errors.frequency ? 'select-error' : ''}`}
                value={form.frequency}
                onChange={(event) => setField('frequency', event.target.value)}
              >
                <option value="">{t('recTf.selectFrequency')}</option>
                <option value="DAILY">{t('recT.freqDaily')}</option>
                <option value="WEEKLY">{t('recT.freqWeekly')}</option>
                <option value="MONTHLY">{t('recT.freqMonthly')}</option>
                <option value="YEARLY">{t('recT.freqYearly')}</option>
              </select>
              {errors.frequency ? (
                <p className="mt-1 text-xs text-error">{errors.frequency}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="rect-start">
                <span className="label-text">{t('recTf.startDate')}</span>
              </label>
              <input
                id="rect-start"
                ref={startDateRef}
                type="date"
                className={`input input-bordered w-full ${errors.startDate ? 'input-error' : ''}`}
                value={form.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
              />
              {errors.startDate ? (
                <p className="mt-1 text-xs text-error">{errors.startDate}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="rect-end">
                <span className="label-text">{t('recTf.endDate')}</span>
              </label>
              <input
                id="rect-end"
                type="date"
                className={`input input-bordered w-full ${errors.endDate ? 'input-error' : ''}`}
                value={form.endDate}
                onChange={(event) => setField('endDate', event.target.value)}
              />
              {errors.endDate ? <p className="mt-1 text-xs text-error">{errors.endDate}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="rect-note">
                <span className="label-text">
                  {t('recTf.note')}{' '}
                  <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                </span>
              </label>
              <textarea
                id="rect-note"
                className="textarea textarea-bordered w-full"
                rows={2}
                value={form.note}
                onChange={(event) => setField('note', event.target.value)}
                maxLength={NOTE_MAX}
                placeholder={t('recTf.notePlaceholder')}
              />
              {errors.note ? (
                <p className="mt-1 text-xs text-error">{errors.note}</p>
              ) : (
                <p className="mt-1 text-right text-xs text-base-content/40 tabular-nums">
                  {form.note.length}/{NOTE_MAX}
                </p>
              )}
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {recurring ? t('recTf.submitEdit') : t('recTf.submitAdd')}
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

export default RecurringTransactionForm