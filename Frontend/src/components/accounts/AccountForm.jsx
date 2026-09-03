import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'

const NAME_MAX = 50
const ACCOUNT_TYPES = ['CASH', 'BANK', 'SAVINGS', 'EWALLET', 'OTHER']

const TYPE_KEY = {
  CASH: 'acc.typeCash',
  BANK: 'acc.typeBank',
  SAVINGS: 'acc.typeSavings',
  EWALLET: 'acc.typeEWallet',
  OTHER: 'acc.typeOther',
}

function initialForm(account) {
  if (!account) {
    return { name: '', type: '', initialBalance: '' }
  }
  return {
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance,
  }
}

function AccountForm({ account, onCancel, onSave }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(() => initialForm(account))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef(null)
  const typeRef = useRef(null)
  const initialRef = useRef(null)

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
      next.name = t('accf.errName')
    } else if (form.name.trim().length > NAME_MAX) {
      next.name = t('accf.errNameTooLong')
    }
    if (!form.type) {
      next.type = t('accf.errType')
    }
    const amount = form.initialBalance === '' ? 0 : Number(form.initialBalance)
    if (!Number.isFinite(amount) || amount < 0) {
      next.initialBalance = t('accf.errInitial')
    } else if (isAmountOverLimit(form.initialBalance)) {
      next.initialBalance = t('common.amountTooLarge')
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
      { key: 'type', ref: typeRef },
      { key: 'initialBalance', ref: initialRef },
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
        type: form.type,
        initialBalance: form.initialBalance === '' ? '0' : form.initialBalance,
      })
    } catch (error) {
      setSubmitError(error.message || t('common.genericError'))
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md rounded-box">
        <h3 className="text-lg font-bold">{account ? t('accf.edit') : t('accf.new')}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="account-name">
              <span className="label-text">{t('accf.name')}</span>
            </label>
            <input
              id="account-name"
              ref={nameRef}
              type="text"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              maxLength={NAME_MAX}
              placeholder={t('accf.namePlaceholder')}
              autoFocus
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
            <label className="label" htmlFor="account-type">
              <span className="label-text">{t('accf.type')}</span>
            </label>
            <select
              id="account-type"
              ref={typeRef}
              className={`select select-bordered w-full ${errors.type ? 'select-error' : ''}`}
              value={form.type}
              onChange={(event) => setField('type', event.target.value)}
            >
              <option value="">{t('accf.selectType')}</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(TYPE_KEY[type])}
                </option>
              ))}
            </select>
            {errors.type ? <p className="mt-1 text-xs text-error">{errors.type}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="account-initial">
              <span className="label-text">{t('accf.initialBalance')}</span>
            </label>
            <MoneyInput
              id="account-initial"
              inputRef={initialRef}
              value={form.initialBalance}
              onChange={(value) => setField('initialBalance', value)}
              placeholder={t('accf.initialBalancePlaceholder')}
              error={Boolean(errors.initialBalance)}
            />
            {errors.initialBalance ? (
              <p className="mt-1 text-xs text-error">{errors.initialBalance}</p>
            ) : null}
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {account ? t('accf.submitEdit') : t('accf.submitAdd')}
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

export default AccountForm