import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'
import { accountDisplayName } from '../../utils/accountDisplay'
import { EditIcon, InfoIcon, TrashIcon } from '../common/Icons'

function editBlockedReasons(transaction) {
  const reasons = []
  if (transaction.type === 'TRANSFER') reasons.push('tx.infoTransfer')
  if (transaction.recurringTransactionId != null) reasons.push('tx.infoRecurring')
  if (transaction.account?.deletedAt) reasons.push('tx.infoArchivedAccount')
  if (transaction.transferAccount?.deletedAt) reasons.push('tx.infoArchivedDest')
  return reasons
}

function TransactionTable({ transactions, onEdit, onDelete, accounts = [] }) {
  const { t, localizeCategory } = useLanguage()
  const [infoTransaction, setInfoTransaction] = useState(null)
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setInfoTransaction(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  return (
    <>
      <div className="overflow-x-auto">
        <table className="table">
        <thead>
          <tr className="text-base-content/60">
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colDate')}</th>
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colCategory')}</th>
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colAccount')}</th>
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colGoal')}</th>
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colDescription')}</th>
            <th className="text-xs font-medium uppercase tracking-wide">{t('tx.colType')}</th>
            <th className="text-right text-xs font-medium uppercase tracking-wide">
              {t('tx.colAmount')}
            </th>
            <th className="text-right w-24 text-xs font-medium uppercase tracking-wide">
              {t('tx.colActions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const account = transaction.account
              ? accountById.get(transaction.account.id) ?? transaction.account
              : null
            const dest = transaction.transferAccount
              ? accountById.get(transaction.transferAccount.id) ?? transaction.transferAccount
              : null
            const isTransfer = transaction.type === 'TRANSFER'
            const isRecurring = transaction.recurringTransactionId != null
            const accountLabel = isTransfer
              ? `${account ? accountDisplayName(account, t) : '—'} → ${dest ? accountDisplayName(dest, t) : '—'}`
              : account ? accountDisplayName(account, t) : '—'
            return (
            <tr key={transaction.id} className="hover">
              <td className="whitespace-nowrap text-sm text-base-content/70">
                {formatDateTime(transaction.date)}
              </td>
              <td className="text-sm">
                {transaction.category ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs"
                      style={{ backgroundColor: `${transaction.category.color}26` }}
                      aria-hidden="true"
                    >
                      {transaction.category.icon}
                    </span>
                    {localizeCategory(transaction.category)}
                  </span>
                ) : (
                  <span className="text-base-content/40">—</span>
                )}
              </td>
              <td className="whitespace-nowrap text-sm text-base-content/70">
                {accountLabel}
              </td>
              <td className="whitespace-nowrap text-sm text-base-content/70">
                {transaction.type === 'TRANSFER'
                  ? [transaction.sourceGoal?.name, transaction.goal?.name]
                      .filter(Boolean)
                      .join(' → ') || '—'
                  : transaction.goal?.name || '—'}
              </td>
              <td>
                <div className="font-medium text-sm">{transaction.description}</div>
                {transaction.note ? (
                  <div className="text-xs text-base-content/50">{transaction.note}</div>
                ) : null}
              </td>
              <td>
                <span
                  className={`badge badge-sm border-0 font-medium ${
                    transaction.type === 'INCOME'
                      ? 'bg-success/12 text-success'
                      : isTransfer
                        ? 'bg-neutral/10 text-base-content/70'
                        : 'bg-error/12 text-error'
                  }`}
                >
                  {transaction.type === 'INCOME'
                    ? t('common.income')
                    : isTransfer
                      ? t('tx.transferBadge')
                      : t('common.expense')}
                </span>
              </td>
              <td
                className={`financial-value text-right font-semibold tabular-nums ${
                  transaction.type === 'INCOME'
                    ? 'text-success'
                    : isTransfer
                      ? 'text-base-content'
                      : 'text-error'
                }`}
              >
                {transaction.type === 'INCOME' ? '+' : isTransfer ? '' : '−'}
                {formatCurrency(transaction.amount)}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  {isTransfer || isRecurring || account?.deletedAt || dest?.deletedAt ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-sm text-base-content/50 hover:text-base-content"
                      onClick={() => setInfoTransaction(transaction)}
                      aria-label={t('tx.infoAria', { name: transaction.description })}
                    >
                      <InfoIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                      onClick={() => onEdit(transaction)}
                      aria-label={t('tx.editAria', { name: transaction.description })}
                    >
                      <EditIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
                    onClick={() => onDelete(transaction)}
                    aria-label={t('tx.deleteAria', { name: transaction.description })}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      {infoTransaction ? (
        <dialog className="modal modal-open" aria-label={t('tx.infoDialogAria')}>
          <div className="modal-box max-w-md rounded-box">
            <h3 className="text-lg font-bold">{t('tx.infoTitle')}</h3>
            <p className="mt-1 text-sm text-base-content/60">{infoTransaction.description}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {editBlockedReasons(infoTransaction).map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-base-content/80">
                  <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-base-content/40" />
                  <span>{t(reason)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setInfoTransaction(null)}>
                {t('tx.infoClose')}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label={t('common.closeDialog')}
            onClick={() => setInfoTransaction(null)}
          />
        </dialog>
      ) : null}
    </>
  )
}

export default TransactionTable