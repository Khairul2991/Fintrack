import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'

const NAME_MAX = 100
const DESC_MAX = 500

function initialForm(goal) {
  if (!goal) {
    return {
      name: '',
      targetAmount: '',
      currentAmount: '',
      description: '',
      targetDate: '',
      categoryId: '',
      accountId: '',
    }
  }
  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    description: goal.description ?? '',
    targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
    categoryId: goal.categoryId != null ? String(goal.categoryId) : '',
    accountId: goal.accountId != null ? String(goal.accountId) : '',
  }
}

function GoalForm({ goal, categories = [], accounts = [], onCancel, onSave }) {
  const { t, localizeCategory } = useLanguage()
  const [form, setForm] = useState(() => initialForm(goal))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef(null)
  const targetRef = useRef(null)
  const currentRef = useRef(null)

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
      next.name = t('goalf.errName')
    } else if (form.name.length > NAME_MAX) {
      next.name = t('goalf.errNameTooLong')
    }
    const target = Number(form.targetAmount)
    if (form.targetAmount === '' || !Number.isFinite(target) || target <= 0) {
      next.targetAmount = t('goalf.errTarget')
    } else if (isAmountOverLimit(form.targetAmount)) {
      next.targetAmount = t('common.amountTooLarge')
    }
    const currentNum = Number(form.currentAmount)
    if (form.currentAmount !== '' && (!Number.isFinite(currentNum) || currentNum < 0)) {
      next.currentAmount = t('goalf.errCurrent')
    } else if (
      form.currentAmount !== '' &&
      Number.isFinite(target) &&
      currentNum > target
    ) {
      next.currentAmount = t('goalf.errCurrentExceedsTarget')
    } else if (isAmountOverLimit(form.currentAmount)) {
      next.currentAmount = t('common.amountTooLarge')
    }
    if (form.description.length > DESC_MAX) {
      next.description = t('goalf.errDescriptionTooLong')
    }
    if (form.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.targetDate)) {
      next.targetDate = t('goalf.errTargetDate')
    }
    setErrors(next)
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    const next = validate()
    const order = [
      { key: 'name', ref: nameRef },
      { key: 'targetAmount', ref: targetRef },
      { key: 'currentAmount', ref: currentRef },
    ]
    const firstInvalid = order.find((item) => next[item.key])
    if (firstInvalid) {
      if (firstInvalid.ref.current) firstInvalid.ref.current.focus()
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        targetAmount: form.targetAmount,
        currentAmount: form.currentAmount === '' ? '0' : form.currentAmount,
        targetDate: form.targetDate ? form.targetDate : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        accountId: form.accountId ? Number(form.accountId) : null,
      })
    } catch (error) {
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl rounded-box">
        <h3 className="text-lg font-bold">{goal ? t('goalf.edit') : t('goalf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="goal-name">
                <span className="label-text">{t('goalf.name')}</span>
              </label>
              <input
                id="goal-name"
                ref={nameRef}
                type="text"
                className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                maxLength={NAME_MAX}
                placeholder={t('goalf.namePlaceholder')}
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-error">{errors.name}</p>
              ) : (
                <p className="mt-1 text-right text-xs text-base-content/40 tabular-nums">
                  {form.name.length}/{NAME_MAX}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="goal-target">
                <span className="label-text">{t('goalf.targetAmount')}</span>
              </label>
              <MoneyInput
                id="goal-target"
                inputRef={targetRef}
                value={form.targetAmount}
                onChange={(value) => setField('targetAmount', value)}
                error={Boolean(errors.targetAmount)}
              />
              {errors.targetAmount ? (
                <p className="mt-1 text-xs text-error">{errors.targetAmount}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="goal-current">
                <span className="label-text">{t('goalf.currentAmount')}</span>
              </label>
              <MoneyInput
                id="goal-current"
                inputRef={currentRef}
                value={form.currentAmount}
                onChange={(value) => setField('currentAmount', value)}
                error={Boolean(errors.currentAmount)}
              />
              {errors.currentAmount ? (
                <p className="mt-1 text-xs text-error">{errors.currentAmount}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="goal-date">
                <span className="label-text">
                  {t('goalf.targetDate')}{' '}
                  <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                </span>
              </label>
              <input
                id="goal-date"
                type="date"
                className={`input input-bordered w-full ${errors.targetDate ? 'input-error' : ''}`}
                value={form.targetDate}
                onChange={(event) => setField('targetDate', event.target.value)}
              />
              {errors.targetDate ? (
                <p className="mt-1 text-xs text-error">{errors.targetDate}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="goal-category">
                <span className="label-text">{t('goalf.category')}</span>
              </label>
              <select
                id="goal-category"
                className="select select-bordered w-full"
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">{t('goalf.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {localizeCategory(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="goal-account">
                <span className="label-text">{t('goalf.account')}</span>
              </label>
              <select
                id="goal-account"
                className="select select-bordered w-full"
                value={form.accountId}
                onChange={(event) => setField('accountId', event.target.value)}
              >
                <option value="">{t('goalf.selectAccount')}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="goal-desc">
                <span className="label-text">
                  {t('goalf.description')}{' '}
                  <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                </span>
              </label>
              <textarea
                id="goal-desc"
                className={`textarea textarea-bordered w-full ${errors.description ? 'textarea-error' : ''}`}
                rows={2}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={DESC_MAX}
                placeholder={t('goalf.descriptionPlaceholder')}
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-error">{errors.description}</p>
              ) : (
                <p className="mt-1 text-right text-xs text-base-content/40 tabular-nums">
                  {form.description.length}/{DESC_MAX}
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
              {goal ? t('goalf.submitEdit') : t('goalf.submitAdd')}
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

export default GoalForm