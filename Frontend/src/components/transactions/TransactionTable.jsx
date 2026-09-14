import { useEffect, useMemo, useState } from 'react'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
} from '../../utils/format'
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

function DetailRow({ label, value, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-base-content">{children ?? value ?? '—'}</dd>
    </div>
  )
}

function AccountValue({ name, t }) {
  if (!name) return <span className="text-base-content/40">—</span>
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{accountDisplayName(name, t)}</span>
      {name.deletedAt ? (
        <span className="badge badge-ghost badge-sm border-0 text-base-content/60">
          {t('tx.archivedBadge')}
        </span>
      ) : null}
    </span>
  )
}

function goalValueOf(transaction) {
  if (transaction.type === 'TRANSFER') {
    return [transaction.sourceGoal?.name, transaction.goal?.name].filter(Boolean).join(' → ') || ''
  }
  return transaction.goal?.name || ''
}

function TransactionTable({ transactions, onEdit, onDelete, accounts = [] }) {
  const { t, localizeCategory, lang } = useLanguage()
  const [detailTransaction, setDetailTransaction] = useState(null)
  const detailReasons = detailTransaction ? editBlockedReasons(detailTransaction) : []
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )

  function resolveAccount(transaction) {
    return transaction.account ? accountById.get(transaction.account.id) ?? transaction.account : null
  }

  function resolveDest(transaction) {
    return transaction.transferAccount
      ? accountById.get(transaction.transferAccount.id) ?? transaction.transferAccount
      : null
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setDetailTransaction(null)
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
            const account = resolveAccount(transaction)
            const dest = resolveDest(transaction)
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
                      onClick={() => setDetailTransaction(transaction)}
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
      {detailTransaction ? (
        <dialog
          className="modal modal-open"
          aria-label={t('tx.detailDialogAria', { name: detailTransaction.description })}
        >
          <div className="modal-box max-w-md rounded-box">
            <h3 className="text-lg font-bold">{t('tx.detailTitle')}</h3>
            <p className="mt-1 text-sm text-base-content/60">{detailTransaction.description}</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailRow
                label={t('tx.colDate')}
                value={formatDate(detailTransaction.date, lang)}
              />
              <DetailRow label={t('tx.detailTime')} value={formatTime(detailTransaction.date, lang)} />
              <DetailRow label={t('tx.colType')}>
                <span
                  className={`badge badge-sm border-0 font-medium ${
                    detailTransaction.type === 'INCOME'
                      ? 'bg-success/12 text-success'
                      : detailTransaction.type === 'TRANSFER'
                        ? 'bg-neutral/10 text-base-content/70'
                        : 'bg-error/12 text-error'
                  }`}
                >
                  {detailTransaction.type === 'INCOME'
                    ? t('common.income')
                    : detailTransaction.type === 'TRANSFER'
                      ? t('common.transfer')
                      : t('common.expense')}
                </span>
              </DetailRow>
              <DetailRow label={t('tx.colAmount')}>
                <span
                  className={`tabular-nums ${
                    detailTransaction.type === 'INCOME'
                      ? 'text-success'
                      : detailTransaction.type === 'TRANSFER'
                        ? 'text-base-content'
                        : 'text-error'
                  }`}
                >
                  {detailTransaction.type === 'INCOME'
                    ? '+'
                    : detailTransaction.type === 'TRANSFER'
                      ? ''
                      : '−'}
                  {formatCurrency(detailTransaction.amount)}
                </span>
              </DetailRow>
              <DetailRow label={t('tx.colCategory')}>
                {detailTransaction.category ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs"
                      style={{ backgroundColor: `${detailTransaction.category.color}26` }}
                      aria-hidden="true"
                    >
                      {detailTransaction.category.icon}
                    </span>
                    <span>{localizeCategory(detailTransaction.category)}</span>
                  </span>
                ) : (
                  <span className="text-base-content/40">—</span>
                )}
              </DetailRow>
              {detailTransaction.type === 'TRANSFER' ? (
                <>
                  <DetailRow label={t('tx.detailSource')}>
                    <AccountValue name={resolveAccount(detailTransaction)} t={t} />
                  </DetailRow>
                  <DetailRow label={t('tx.detailDestination')}>
                    <AccountValue name={resolveDest(detailTransaction)} t={t} />
                  </DetailRow>
                </>
              ) : (
                <DetailRow label={t('tx.colAccount')}>
                  <AccountValue name={resolveAccount(detailTransaction)} t={t} />
                </DetailRow>
              )}
              {goalValueOf(detailTransaction) ? (
                <DetailRow label={t('tx.colGoal')} value={goalValueOf(detailTransaction)} />
              ) : null}
              {detailTransaction.note ? (
                <DetailRow
                  label={t('tx.detailNote')}
                  value={detailTransaction.note}
                  className="break-words sm:col-span-2"
                />
              ) : null}
            </dl>
            {detailReasons.length > 0 ? (
              <section
                aria-label={t('tx.detailBlockedTitle')}
                className="mt-4 border-t border-base-200 pt-3"
              >
                <h4 className="text-sm font-semibold">{t('tx.detailBlockedTitle')}</h4>
                <ul className="mt-2 flex flex-col gap-2">
                  {detailReasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-sm text-base-content/80">
                      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-base-content/40" />
                      <span>{t(reason)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setDetailTransaction(null)}>
                {t('tx.infoClose')}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label={t('common.closeDialog')}
            onClick={() => setDetailTransaction(null)}
          />
        </dialog>
      ) : null}
    </>
  )
}

export default TransactionTable