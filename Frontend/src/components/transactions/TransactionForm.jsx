import { useEffect, useRef, useState } from 'react'
import MoneyInput from '../common/MoneyInput'
import TimeInput from '../common/TimeInput'
import { useLanguage } from '../../context/LanguageContext'
import { isAmountOverLimit } from '../../utils/numberFormat'
import { accountDisplayName, sortAccountsDefaultFirst } from '../../utils/accountDisplay'
import { toLocalInputValue, toUtcInputValue, formatCurrency } from '../../utils/format'
import { sortCategoriesForDisplay } from '../../l10n/categories'
import { resolveTransferSourceGoal } from '../../utils/transferGoal'

const DESCRIPTION_MAX = 200
const NOTE_MAX = 500

const TIME_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::\d{2})?$/

const TYPE_OPTIONS = {
  EXPENSE: { labelKey: 'common.expense', activeClass: 'btn-error' },
  INCOME: { labelKey: 'common.income', activeClass: 'btn-success' },
  TRANSFER: { labelKey: 'common.transfer', activeClass: 'btn-neutral' },
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function todayInput() {
  const now = new Date()
  return [
    now.getFullYear(),
    '-',
    pad2(now.getMonth() + 1),
    '-',
    pad2(now.getDate()),
    'T',
    pad2(now.getHours()),
    ':',
    pad2(now.getMinutes()),
  ].join('')
}

function timePart(value) {
  if (!value) return '00:00'
  const at = value.indexOf('T')
  return at === -1 ? '00:00' : value.slice(at + 1, at + 6)
}

function initialForm(transaction, categories, accounts, goals) {
  const cashDefault = accounts.find((account) => account.isDefault)
  if (!transaction) {
    const expenseCategories = categories.filter((category) => category.type === 'EXPENSE')
    return {
      description: '',
      amount: '',
      type: 'EXPENSE',
      categoryId: expenseCategories.length > 0 ? String(expenseCategories[0].id) : '',
      accountId: cashDefault ? String(cashDefault.id) : '',
      transferAccountId: '',
      goalId: '',
      sourceGoalId: '',
      date: todayInput(),
      note: '',
    }
  }
  const accountId = transaction.accountId != null ? String(transaction.accountId) : ''
  const goalMatches =
    transaction.goalId != null &&
    goals.some(
      (goal) =>
        String(goal.id) === String(transaction.goalId) &&
        goal.accountId != null &&
        String(goal.accountId) === accountId,
    )
  return {
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    categoryId: transaction.categoryId != null ? String(transaction.categoryId) : '',
    accountId,
    transferAccountId: transaction.transferAccountId != null ? String(transaction.transferAccountId) : '',
    goalId: goalMatches ? String(transaction.goalId) : '',
    sourceGoalId: transaction.sourceGoalId != null ? String(transaction.sourceGoalId) : '',
    date: toLocalInputValue(transaction.date),
    note: transaction.note ?? '',
  }
}

function TransactionForm({ transaction, categories, accounts = [], goals = [], fromAccountId, onCancel, onSave }) {
  const { t, localizeCategory, translateError } = useLanguage()
  const defaultAccount = accounts.find((account) => account.isDefault)
  const sortedAccounts = sortAccountsDefaultFirst(accounts)
  const [form, setForm] = useState(() => initialForm(transaction, categories, accounts, goals))
  const isDedicatedTransfer = Boolean(fromAccountId)
  const transferAccounts = sortedAccounts.filter((account) => String(account.id) !== form.accountId)
  const accountGoals = goals.filter(
    (goal) => goal.accountId != null && String(goal.accountId) === String(form.accountId),
  )
  const sourceAccountGoals = accountGoals.filter((goal) => Number(goal.currentAmount) > 0)
  const destinationAccountGoals = goals.filter(
    (goal) => goal.accountId != null && String(goal.accountId) === String(form.transferAccountId),
  )
  function accountBalance(accountId) {
    const account = accounts.find((a) => String(a.id) === String(accountId))
    return account ? Number(account.balance ?? 0) : 0
  }
  const sourceBalance = accountBalance(form.accountId)
  const sourceResolution = resolveTransferSourceGoal({
    amount: Number(form.amount),
    available: sourceBalance,
    goals: accountGoals,
  })
  const requiresSourceGoal = sourceResolution !== null
  const transferringFullBalance = form.amount !== '' && Number(form.amount) === sourceBalance
  const visibleCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.type === form.type),
    localizeCategory,
  )
  const editableTypes = isDedicatedTransfer
    ? ['TRANSFER']
    : !transaction
      ? ['EXPENSE', 'INCOME', 'TRANSFER']
      : form.type === 'TRANSFER'
        ? ['TRANSFER']
        : ['EXPENSE', 'INCOME']
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const descriptionRef = useRef(null)
  const amountRef = useRef(null)
  const typeRef = useRef(null)
  const categoryIdRef = useRef(null)
  const accountIdRef = useRef(null)
  const transferAccountIdRef = useRef(null)
  const dateRef = useRef(null)

  useEffect(() => {
    if (fromAccountId) {
      const found = accounts.find((account) => String(account.id) === String(fromAccountId))
      if (found) {
        setForm((current) => ({
          ...current,
          type: 'TRANSFER',
          accountId: String(fromAccountId),
          transferAccountId: '',
          categoryId: '',
          goalId: '',
          sourceGoalId: '',
          description: current.description || t('txf.transferDescDefault'),
        }))
      }
    }
  }, [fromAccountId, accounts, t])

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
    if (value !== 'TRANSFER') {
      setField('transferAccountId', '')
      setField('sourceGoalId', '')
      const matches = categories.some((category) => category.type === value && String(category.id) === form.categoryId)
      if (!matches) setField('categoryId', '')
    } else {
      setField('categoryId', '')
      setField('goalId', '')
      setField('sourceGoalId', '')
    }
  }

  function handleAccountChange(value) {
    setField('accountId', value)
    if (value && String(form.transferAccountId) === value) {
      setField('transferAccountId', '')
    }
    if (form.goalId && form.type !== 'TRANSFER') {
      const goal = goals.find((goal) => String(goal.id) === form.goalId)
      if (goal && goal.accountId != null && String(goal.accountId) !== value) {
        setField('goalId', '')
      }
    }
    if (form.sourceGoalId && form.type === 'TRANSFER') {
      const goal = goals.find((goal) => String(goal.id) === form.sourceGoalId)
      if (goal && goal.accountId != null && String(goal.accountId) !== value) {
        setField('sourceGoalId', '')
      }
    }
  }

  function handleTransferAccountChange(value) {
    setField('transferAccountId', value)
    if (form.goalId) {
      const goal = goals.find((goal) => String(goal.id) === form.goalId)
      if (goal && goal.accountId != null && String(goal.accountId) !== value) {
        setField('goalId', '')
      }
    }
  }

  function handleDateChange(value) {
    setField('date', `${value}T${timePart(form.date) || '00:00'}`)
  }

  function handleTimeChange(value) {
    const at = form.date ? form.date.indexOf('T') : -1
    const datePart = at !== -1 ? form.date.slice(0, at) : todayInput().slice(0, 10)
    setField('date', `${datePart}T${value || '00:00'}`)
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
    if (form.type !== 'INCOME' && form.type !== 'EXPENSE' && form.type !== 'TRANSFER') {
      next.type = t('txf.errType')
    }
    if (form.type === 'TRANSFER') {
      if (!form.accountId) {
        next.accountId = t('txf.errAccount')
      }
      if (!form.transferAccountId) {
        next.transferAccountId = t('txf.errTransferTo')
      } else if (String(form.accountId) === String(form.transferAccountId)) {
        next.transferAccountId = t('txf.errTransferSame')
      }
    } else if (!form.categoryId) {
      next.categoryId = t('txf.errCategory')
    }
    if (!form.date) {
      next.date = t('txf.errDate')
    } else if (!TIME_RE.test(form.date)) {
      next.date = t('txf.errTime')
    }
    setErrors(next)
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    const next = validate()
    const order = form.type === 'TRANSFER'
      ? [
          { key: 'description', ref: descriptionRef },
          { key: 'amount', ref: amountRef },
          { key: 'type', ref: typeRef },
          { key: 'accountId', ref: accountIdRef },
          { key: 'transferAccountId', ref: transferAccountIdRef },
          { key: 'date', ref: dateRef },
        ]
      : [
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
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        accountId: form.accountId ? Number(form.accountId) : null,
        transferAccountId: form.transferAccountId ? Number(form.transferAccountId) : null,
        goalId: form.goalId ? Number(form.goalId) : null,
        sourceGoalId: form.sourceGoalId ? Number(form.sourceGoalId) : null,
        date: toUtcInputValue(form.date),
        note: form.note.trim() ? form.note.trim() : null,
      })
    } catch (error) {
      setSubmitError(translateError(error.message) || t('common.genericError'))
      setSubmitting(false)
    }
  }

  function renderDateTime() {
    return (
      <div className="grid grid-cols-[3fr_1fr] gap-2">
        <div>
          <label className="label py-1" htmlFor="tx-date">
            <span className="label-text">{t('txf.date')} <span className="text-error">*</span></span>
          </label>
          <input
            id="tx-date"
            ref={dateRef}
            type="date"
            className={`input input-bordered w-full ${errors.date ? 'input-error' : ''}`}
            value={form.date ? form.date.slice(0, 10) : ''}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </div>
        <div>
          <label className="label py-1" htmlFor="tx-time">
            <span className="label-text">{t('txf.time')} <span className="text-error">*</span></span>
          </label>
          <TimeInput
            id="tx-time"
            value={timePart(form.date)}
            onChange={(value) => handleTimeChange(value)}
            error={Boolean(errors.date)}
          />
        </div>
        {errors.date ? (
          <p className="col-span-2 text-xs text-error">{errors.date}</p>
        ) : null}
      </div>
    )
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl rounded-box">
        <h3 className="text-lg font-bold">
          {isDedicatedTransfer ? t('txf.transferTitle') : transaction ? t('txf.edit') : t('txf.new')}
        </h3>
        {isDedicatedTransfer ? (
          <p className="mt-1 text-sm text-base-content/60">{t('txf.transferSubtitle')}</p>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          {isDedicatedTransfer ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{t('txf.fromSection')}</span>
                  <span className="text-xs tabular-nums text-base-content/50">
                    {t('txf.availableBalance', { amount: formatCurrency(sourceBalance) })}
                  </span>
                </div>
                <select
                  id="tx-account"
                  ref={accountIdRef}
                  className={`select select-bordered w-full ${errors.accountId ? 'select-error' : ''}`}
                  value={form.accountId}
                  onChange={(event) => handleAccountChange(event.target.value)}
                >
                  {sortedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountDisplayName(account, t)}
                    </option>
                  ))}
                </select>
                {errors.accountId ? <p className="mt-1 text-xs text-error">{errors.accountId}</p> : null}
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{t('txf.toSection')}</span>
                  <span className="text-xs tabular-nums text-base-content/50">
                    {t('txf.availableBalance', { amount: formatCurrency(accountBalance(form.transferAccountId)) })}
                  </span>
                </div>
                <select
                  id="tx-transfer-account"
                  ref={transferAccountIdRef}
                  className={`select select-bordered w-full ${errors.transferAccountId ? 'select-error' : ''}`}
                  value={form.transferAccountId}
                  onChange={(event) => handleTransferAccountChange(event.target.value)}
                >
                  <option value="">{t('txf.selectAccount')}</option>
                  {transferAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountDisplayName(account, t)}
                    </option>
                  ))}
                </select>
                {errors.transferAccountId ? (
                  <p className="mt-1 text-xs text-error">{errors.transferAccountId}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-base-300 bg-base-200/40 p-2 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label className="label py-1" htmlFor="tx-source-goal">
                    <span className="label-text">
                      {t('txf.sourceGoal')} <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                    </span>
                  </label>
                  <select
                    id="tx-source-goal"
                    className={`select select-bordered w-full ${requiresSourceGoal && sourceAccountGoals.length > 1 && !form.sourceGoalId ? 'select-warning' : ''}`}
                    value={form.sourceGoalId}
                    onChange={(event) => setField('sourceGoalId', event.target.value)}
                    disabled={!form.accountId || sourceAccountGoals.length === 0}
                  >
                    <option value="">{t('txf.noSourceGoal')}</option>
                    {sourceAccountGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} — {formatCurrency(goal.currentAmount)}
                      </option>
                    ))}
                  </select>
                  {form.accountId && sourceAccountGoals.length === 0 ? (
                    <p className="mt-1 text-xs text-base-content/50">{t('txf.noSourceAllocation')}</p>
                  ) : null}
                </div>
                <div>
                  <label className="label py-1" htmlFor="tx-goal">
                    <span className="label-text">
                      {t('txf.destGoal')} <span className="ml-1 text-base-content/40">{t('common.optional')}</span>
                    </span>
                  </label>
                  <select
                    id="tx-goal"
                    className="select select-bordered w-full"
                    value={form.goalId}
                    onChange={(event) => setField('goalId', event.target.value)}
                    disabled={!form.transferAccountId || destinationAccountGoals.length === 0}
                  >
                    <option value="">{t('txf.noGoal')}</option>
                    {destinationAccountGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} — {formatCurrency(goal.currentAmount)}
                      </option>
                    ))}
                  </select>
                  {form.transferAccountId && destinationAccountGoals.length === 0 ? (
                    <p className="mt-1 text-xs text-base-content/50">{t('txf.noGoalsForDestination')}</p>
                  ) : null}
                </div>
              </div>
              {renderDateTime()}
              <div>
                <label className="label py-1" htmlFor="tx-amount">
                  <span className="label-text">{t('txf.amount')} <span className="text-error">*</span></span>
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
                {requiresSourceGoal && !form.sourceGoalId ? (
                  transferringFullBalance ? (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
                    >
                      <span>
                        {sourceResolution.ambiguous
                          ? t('txf.fullBalanceMulti')
                          : t('txf.fullBalanceSingle', {
                              goal: sourceResolution.goal.name,
                              amount: formatCurrency(sourceResolution.withdrawal),
                            })}
                      </span>
                    </div>
                  ) : (
                    <p
                      role={sourceAccountGoals.length > 1 ? 'alert' : undefined}
                      className={`mt-1 text-xs ${sourceAccountGoals.length > 1 ? 'text-warning' : 'text-base-content/60'}`}
                    >
                      {sourceAccountGoals.length === 1
                        ? t('txf.autoSourceHint')
                        : sourceAccountGoals.length > 1
                          ? t('txf.multiSourceHint')
                          : null}
                    </p>
                  )
                ) : null}
              </div>
              <div>
                <label className="label py-1" htmlFor="tx-description">
                    <span className="label-text">{t('txf.description')} <span className="text-error">*</span></span>
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
                  <label className="label py-1" htmlFor="tx-note">
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
          ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="label py-1" htmlFor="tx-description">
                <span className="label-text">{t('txf.description')} <span className="text-error">*</span></span>
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
              <label className="label py-1" htmlFor="tx-amount">
                <span className="label-text">{t('txf.amount')} <span className="text-error">*</span></span>
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
              <span className="label py-1">
                <span className="label-text">{t('txf.type')} <span className="text-error">*</span></span>
              </span>
              {isDedicatedTransfer ? (
                <div className="badge badge-neutral badge-lg font-medium">{t('common.transfer')}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editableTypes.map((type, index) => {
                    const { labelKey, activeClass } = TYPE_OPTIONS[type]
                    return (
                      <label
                        key={type}
                        className={`btn flex-1 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                          form.type === type
                            ? activeClass
                            : 'btn-outline border-base-300 bg-base-200/40 hover:bg-base-200/70'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tx-type"
                          ref={index === 0 ? typeRef : undefined}
                          className="sr-only"
                          checked={form.type === type}
                          onChange={() => handleTypeChange(type)}
                        />
                        {t(labelKey)}
                      </label>
                    )
                  })}
                </div>
              )}
              {errors.type ? <p className="mt-1 text-xs text-error">{errors.type}</p> : null}
            </div>
            {form.type !== 'TRANSFER' ? (
              <div>
                <label className="label py-1" htmlFor="tx-category">
                  <span className="label-text">{t('txf.category')} <span className="text-error">*</span></span>
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
            ) : <div />}
            <div>
              <label className="label py-1" htmlFor="tx-account">
                <span className="label-text">
                  {form.type === 'TRANSFER' ? t('tx.transferFrom') : t('txf.account')}{' '}
                  {form.type === 'TRANSFER' ? <span className="text-error">*</span> : null}
                </span>
              </label>
              <select
                id="tx-account"
                ref={accountIdRef}
                className={`select select-bordered w-full ${errors.accountId ? 'select-error' : ''}`}
                value={form.accountId}
                onChange={(event) => handleAccountChange(event.target.value)}
              >
                {accounts.length === 0 ? <option value="">{t('txf.selectAccount')}</option> : null}
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountDisplayName(account, t)}
                  </option>
                ))}
              </select>
              {errors.accountId ? <p className="mt-1 text-xs text-error">{errors.accountId}</p> : null}
              {!transaction && defaultAccount && form.type !== 'TRANSFER' ? (
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
            {form.type === 'TRANSFER' ? (
              <div>
                <label className="label py-1" htmlFor="tx-transfer-account">
                  <span className="label-text">{t('tx.transferTo')} <span className="text-error">*</span></span>
                </label>
                <select
                  id="tx-transfer-account"
                  ref={transferAccountIdRef}
                  className={`select select-bordered w-full ${errors.transferAccountId ? 'select-error' : ''}`}
                  value={form.transferAccountId}
                  onChange={(event) => handleTransferAccountChange(event.target.value)}
                >
                  <option value="">{t('txf.selectAccount')}</option>
                  {transferAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountDisplayName(account, t)}
                    </option>
                  ))}
                </select>
                {errors.transferAccountId ? (
                  <p className="mt-1 text-xs text-error">{errors.transferAccountId}</p>
                ) : null}
              </div>
            ) : null}
            {form.type === 'TRANSFER' ? (
              <>
                <div>
                  <label className="label py-1" htmlFor="tx-source-goal">
                    <span className="label-text">{t('txf.sourceGoal')}</span>
                  </label>
                  <select
                    id="tx-source-goal"
                    className="select select-bordered w-full"
                    value={form.sourceGoalId}
                    onChange={(event) => setField('sourceGoalId', event.target.value)}
                    disabled={!form.accountId || sourceAccountGoals.length === 0}
                  >
                    <option value="">{t('txf.noSourceGoal')}</option>
                    {sourceAccountGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} — {formatCurrency(goal.currentAmount)}
                      </option>
                    ))}
                  </select>
                  {form.accountId && sourceAccountGoals.length === 0 ? (
                    <p className="mt-1 text-xs text-base-content/50">{t('txf.noSourceAllocation')}</p>
                  ) : null}
                </div>
                <div>
                  <label className="label py-1" htmlFor="tx-goal">
                    <span className="label-text">{t('txf.goal')}</span>
                  </label>
                  <select
                    id="tx-goal"
                    className="select select-bordered w-full"
                    value={form.goalId}
                    onChange={(event) => setField('goalId', event.target.value)}
                    disabled={!form.transferAccountId || destinationAccountGoals.length === 0}
                  >
                    <option value="">{t('txf.noGoal')}</option>
                    {destinationAccountGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} — {formatCurrency(goal.currentAmount)}
                      </option>
                    ))}
                  </select>
                  {form.transferAccountId && destinationAccountGoals.length === 0 ? (
                    <p className="mt-1 text-xs text-base-content/50">
                      {t('txf.noGoalsForDestination')}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div>
                <label className="label py-1" htmlFor="tx-goal">
                  <span className="label-text">{t('txf.goal')}</span>
                </label>
                <select
                  id="tx-goal"
                  className="select select-bordered w-full"
                  value={form.goalId}
                  onChange={(event) => setField('goalId', event.target.value)}
                  disabled={!form.accountId || accountGoals.length === 0}
                >
                  <option value="">{t('txf.noGoal')}</option>
                  {accountGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name} — {formatCurrency(goal.currentAmount)}
                    </option>
                  ))}
                </select>
                {form.accountId && accountGoals.length === 0 ? (
                  <p className="mt-1 text-xs text-base-content/50">{t('txf.noGoalsForAccount')}</p>
                ) : null}
              </div>
            )}
            {renderDateTime()}
            <div>
              <label className="label py-1" htmlFor="tx-note">
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
          )}
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {transaction ? t('txf.submitEdit') : isDedicatedTransfer ? t('txf.transferSubmit') : t('txf.submitAdd')}
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