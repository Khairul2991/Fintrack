import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'
import { accountDisplayName, sortAccountsDefaultFirst } from '../../utils/accountDisplay'
import { sortCategoriesForDisplay } from '../../l10n/categories'

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function initialForm(transaction, categories, accounts) {
  const cashDefault = accounts.find((account) => account.isDefault)
  if (!transaction) {
    const expenseCategories = categories.filter((category) => category.type === 'EXPENSE')
    return {
      description: '',
      amount: '',
      type: 'EXPENSE',
      categoryId: expenseCategories.length > 0 ? String(expenseCategories[0].id) : '',
      accountId: cashDefault ? String(cashDefault.id) : '',
      date: todayInput(),
      note: '',
    }
  }
  return {
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    categoryId: String(transaction.categoryId),
    accountId: transaction.accountId != null ? String(transaction.accountId) : '',
    date: transaction.date.slice(0, 10),
    note: transaction.note ?? '',
  }
}

function TransactionForm({ transaction, categories, accounts = [], onCancel, onSave }) {
  const { t, localizeCategory, translateError } = useLanguage()
  const defaultAccount = accounts.find((account) => account.isDefault)
  const sortedAccounts = sortAccountsDefaultFirst(accounts)
  const [form, setForm] = useState(() => initialForm(transaction, categories, accounts))
  const visibleCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.type === form.type),
    localizeCategory,
  )
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const descriptionRef = useRef(null)
  const amountRef = useRef(null)
  const typeRef = useRef(null)
  const categoryIdRef = useRef(null)
  const accountIdRef = useRef(null)
  const dateRef = useRef(null)

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

  function handleTypeChange(value) {
    if (value === form.type) return
    setField('type', value)
    const matches = categories.some((category) => category.type === value && String(category.id) === form.categoryId)
    if (!matches) setField('categoryId', '')
  }

  function validate() {
    const next = {}
    if (!form.description.trim()) {
      next.description = t('txf.errDescription')
    }
    const amount = Number(form.amount)
    if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
      next.amount = t('txf.errAmount')
    } else if (isAmountOverLimit(form.amount)) {
      next.amount = t('common.amountTooLarge')
    }
    if (form.type !== 'INCOME' && form.type !== 'EXPENSE') {
      next.type = t('txf.errType')
    }
    if (!form.categoryId) {
      next.categoryId = t('txf.errCategory')
    }
    if (!form.date) {
      next.date = t('txf.errDate')
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
      { key: 'date', ref: dateRef },
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
        date: form.date,
        note: form.note.trim() ? form.note.trim() : null,
      })
    } catch (error) {
      setSubmitError(translateError(error.message) || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl rounded-box">
        <h3 className="text-lg font-bold">{transaction ? t('txf.edit') : t('txf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tx-description">
                <span className="label-text">{t('txf.description')}</span>
              </label>
              <input
                id="tx-description"
                ref={descriptionRef}
                type="text"
                className={`input input-bordered w-full ${errors.description ? 'input-error' : ''}`}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={DESCRIPTION_MAX}
                placeholder={t('txf.descPlaceholder')}
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
              <label className="label" htmlFor="tx-amount">
                <span className="label-text">{t('txf.amount')}</span>
              </label>
              <MoneyInput
                id="tx-amount"
                inputRef={amountRef}
                value={form.amount}
                onChange={(value) => setField('amount', value)}
                placeholder={t('txf.amountPlaceholder')}
                error={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="mt-1 text-xs text-error">{errors.amount}</p> : null}
            </div>
            <div>
              <span className="label">
                <span className="label-text">{t('txf.type')}</span>
              </span>
              <div className="flex gap-2">
                <label
                  className={`btn flex-1 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                    form.type === 'EXPENSE'
                      ? 'btn-error'
                      : 'btn-outline border-base-300 bg-base-200/40 hover:bg-base-200/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="tx-type"
                    ref={typeRef}
                    className="sr-only"
                    checked={form.type === 'EXPENSE'}
                    onChange={() => handleTypeChange('EXPENSE')}
                  />
                  {t('common.expense')}
                </label>
                <label
                  className={`btn flex-1 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                    form.type === 'INCOME'
                      ? 'btn-success'
                      : 'btn-outline border-base-300 bg-base-200/40 hover:bg-base-200/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="tx-type"
                    className="sr-only"
                    checked={form.type === 'INCOME'}
                    onChange={() => handleTypeChange('INCOME')}
                  />
                  {t('common.income')}
                </label>
              </div>
              {errors.type ? <p className="mt-1 text-xs text-error">{errors.type}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-category">
                <span className="label-text">{t('txf.category')}</span>
              </label>
              <select
                id="tx-category"
                ref={categoryIdRef}
                className={`select select-bordered w-full ${errors.categoryId ? 'select-error' : ''}`}
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">{t('txf.selectCategory')}</option>
                {visibleCategories.map((category) => (
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
              <label className="label" htmlFor="tx-account">
                <span className="label-text">{t('txf.account')}</span>
              </label>
              <select
                id="tx-account"
                ref={accountIdRef}
                className="select select-bordered w-full"
                value={form.accountId}
                onChange={(event) => setField('accountId', event.target.value)}
              >
                {accounts.length === 0 ? <option value="">{t('txf.selectAccount')}</option> : null}
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountDisplayName(account, t)}
                  </option>
                ))}
              </select>
              {!transaction && defaultAccount ? (
                <div className="mt-1 flex items-start gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2">
                  <span className="text-xs text-base-content/80">
                    <span className="font-bold">
                      {t('txf.accountDefaultHint', { name: accountDisplayName(defaultAccount, t) })}
                    </span>
                    <span className="block text-base-content/60">{t('txf.accountDefaultBody')}</span>
                  </span>
                </div>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-date">
                <span className="label-text">{t('txf.date')}</span>
              </label>
              <input
                id="tx-date"
                ref={dateRef}
                type="date"
                className={`input input-bordered w-full ${errors.date ? 'input-error' : ''}`}
                value={form.date}
                onChange={(event) => setField('date', event.target.value)}
              />
              {errors.date ? <p className="mt-1 text-xs text-error">{errors.date}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-note">
                <span className="label-text">
                  {t('txf.note')}{' '}
                  <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                </span>
              </label>
              <textarea
                id="tx-note"
                className="textarea textarea-bordered w-full"
                rows={2}
                value={form.note}
                onChange={(event) => setField('note', event.target.value)}
                maxLength={NOTE_MAX}
                placeholder={t('txf.notePlaceholder')}
              />
              <p className="mt-1 text-right text-xs text-base-content/40 tabular-nums">
                {form.note.length}/{NOTE_MAX}
              </p>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {transaction ? t('txf.submitEdit') : t('txf.submitAdd')}
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

export default TransactionForm