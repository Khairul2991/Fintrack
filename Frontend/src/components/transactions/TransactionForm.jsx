import { useEffect, useState } from 'react'

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function initialForm(transaction, categories) {
  if (!transaction) {
    return {
      description: '',
      amount: '',
      type: 'EXPENSE',
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      date: todayInput(),
      note: '',
    }
  }
  return {
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    categoryId: String(transaction.categoryId),
    date: transaction.date.slice(0, 10),
    note: transaction.note ?? '',
  }
}

function TransactionForm({ transaction, categories, onCancel, onSave }) {
  const [form, setForm] = useState(() => initialForm(transaction, categories))
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
    if (!form.description.trim()) {
      next.description = 'Description is required.'
    }
    const amount = Number(form.amount)
    if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than 0.'
    }
    if (form.type !== 'INCOME' && form.type !== 'EXPENSE') {
      next.type = 'Select income or expense.'
    }
    if (!form.categoryId) {
      next.categoryId = 'Please select a category.'
    }
    if (!form.date) {
      next.date = 'Date is required.'
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
        description: form.description.trim(),
        amount: form.amount.trim(),
        type: form.type,
        categoryId: Number(form.categoryId),
        date: form.date,
        note: form.note.trim() ? form.note.trim() : null,
      })
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="text-lg font-bold">{transaction ? 'Edit Transaction' : 'New Transaction'}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{submitError}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tx-description">
                <span className="label-text">Description</span>
              </label>
              <input
                id="tx-description"
                type="text"
                className={`input input-bordered w-full ${errors.description ? 'input-error' : ''}`}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={200}
                placeholder="e.g. Groceries"
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-error">{errors.description}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-amount">
                <span className="label-text">Amount (IDR)</span>
              </label>
              <input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                className={`input input-bordered w-full ${errors.amount ? 'input-error' : ''}`}
                value={form.amount}
                onChange={(event) => setField('amount', event.target.value)}
                placeholder="e.g. 50000"
              />
              {errors.amount ? <p className="mt-1 text-xs text-error">{errors.amount}</p> : null}
            </div>
            <div>
              <span className="label">
                <span className="label-text">Type</span>
              </span>
              <div className="flex gap-2">
                <label
                  className={`btn btn-outline flex-1 ${form.type === 'EXPENSE' ? 'btn-error' : ''}`}
                >
                  <input
                    type="radio"
                    name="tx-type"
                    className="sr-only"
                    checked={form.type === 'EXPENSE'}
                    onChange={() => setField('type', 'EXPENSE')}
                  />
                  Expense
                </label>
                <label
                  className={`btn btn-outline flex-1 ${
                    form.type === 'INCOME' ? 'btn-success' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="tx-type"
                    className="sr-only"
                    checked={form.type === 'INCOME'}
                    onChange={() => setField('type', 'INCOME')}
                  />
                  Income
                </label>
              </div>
              {errors.type ? <p className="mt-1 text-xs text-error">{errors.type}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-category">
                <span className="label-text">Category</span>
              </label>
              <select
                id="tx-category"
                className={`select select-bordered w-full ${errors.categoryId ? 'select-error' : ''}`}
                value={form.categoryId}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p className="mt-1 text-xs text-error">{errors.categoryId}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="tx-date">
                <span className="label-text">Date</span>
              </label>
              <input
                id="tx-date"
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
                  Note <span className="ml-1 text-base-content/40">(optional)</span>
                </span>
              </label>
              <textarea
                id="tx-note"
                className="textarea textarea-bordered w-full"
                rows={2}
                value={form.note}
                onChange={(event) => setField('note', event.target.value)}
                maxLength={500}
                placeholder="Optional details"
              />
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : null}
              {transaction ? 'Save changes' : 'Add transaction'}
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

export default TransactionForm