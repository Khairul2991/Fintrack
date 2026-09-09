import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'
import { accountDisplayName, sortAccountsDefaultFirst } from '../../utils/accountDisplay'
import { sortCategoriesForDisplay } from '../../l10n/categories'

const NAME_MAX = 100
const DESC_MAX = 500

function initialForm(goal, accounts) {
  if (!goal) {
    const cashDefault = accounts.find((account) => account.isDefault)
    return {
      name: '',
      targetAmount: '',
      description: '',
      targetDate: '',
      categoryId: '',
      accountId: cashDefault ? String(cashDefault.id) : '',
    }
  }
  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    description: goal.description ?? '',
    targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
    categoryId: goal.categoryId != null ? String(goal.categoryId) : '',
    accountId: goal.accountId != null ? String(goal.accountId) : '',
  }
}

function GoalForm({ goal, categories = [], accounts = [], onCancel, onSave }) {
  const { t, localizeCategory, translateError } = useLanguage()
  const sortedCategories = sortCategoriesForDisplay(categories, localizeCategory)
  const defaultAccount = accounts.find((account) => account.isDefault)
  const sortedAccounts = sortAccountsDefaultFirst(accounts)
  const [form, setForm] = useState(() => initialForm(goal, accounts))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef(null)
  const targetRef = useRef(null)
  const accountRef = useRef(null)

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
    if (!form.accountId) {
      next.accountId = t('goalf.errAccount')
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
      { key: 'accountId', ref: accountRef },
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
        targetDate: form.targetDate ? form.targetDate : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        accountId: Number(form.accountId),
      })
    } catch (error) {
      setSubmitError(translateError(error.message) || t('common.genericError'))
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
                <span className="label-text">{t('goalf.name')} <span className="text-error">*</span></span>
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
                <span className="label-text">{t('goalf.targetAmount')} <span className="text-error">*</span></span>
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
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {localizeCategory(category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="goal-account">
                <span className="label-text">{t('goalf.account')} <span className="text-error">*</span></span>
              </label>
              <select
                id="goal-account"
                ref={accountRef}
                className={`select select-bordered w-full ${errors.accountId ? 'select-error' : ''}`}
                value={form.accountId}
                onChange={(event) => setField('accountId', event.target.value)}
              >
                {accounts.length === 0 ? <option value="">{t('goalf.selectAccount')}</option> : null}
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountDisplayName(account, t)}
                  </option>
                ))}
              </select>
              {errors.accountId ? (
                <p className="mt-1 text-xs text-error">{errors.accountId}</p>
              ) : null}
              {!goal && defaultAccount ? (
                <div className="mt-1 flex items-start gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2">
                  <span className="text-xs text-base-content/80">
                    <span className="font-bold">
                      {t('goalf.accountDefaultHint', { name: accountDisplayName(defaultAccount, t) })}
                    </span>
                    <span className="block text-base-content/60">{t('goalf.accountDefaultBody')}</span>
                  </span>
                </div>
              ) : null}
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