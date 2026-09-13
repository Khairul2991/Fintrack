import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { getAccount } from '../../services/accountApi'
import { listTransactions } from '../../services/transactionApi'
import { accountDisplayName } from '../../utils/accountDisplay'
import { ArrowRightIcon } from '../common/Icons'

const TYPE_KEY = {
  CASH: 'acc.typeCash',
  BANK: 'acc.typeBank',
  SAVINGS: 'acc.typeSavings',
  EWALLET: 'acc.typeEWallet',
  OTHER: 'acc.typeOther',
}

function AccountDetailDialog({ accountId, accounts = [], onClose }) {
  const { t, translateError } = useLanguage()
  const fallback = accounts.find((account) => account.id === accountId) || null
  const [account, setAccount] = useState(fallback)
  const [transactions, setTransactions] = useState([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountId == null) return
    let active = true
    setFailed(false)
    setLoading(true)
    Promise.all([getAccount(accountId), listTransactions({ accountId, limit: 5 })])
      .then(([accountRes, txRes]) => {
        if (!active) return
        setAccount(accountRes.data)
        setTransactions(txRes.data || [])
        setLoading(false)
      })
      .catch((error) => {
        if (!active) return
        setFailed(translateError(error.message))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [accountId, translateError])

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg rounded-box">
        {account ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{accountDisplayName(account, t)}</h3>
                <span className="badge badge-ghost badge-sm border-0">
                  {t(TYPE_KEY[account.type] || 'acc.typeOther')}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-box border border-base-200 p-4">
              <p className="text-xs text-base-content/50">{t('acc.colBalance')}</p>
              <p className="financial-value text-2xl font-bold tabular-nums text-base-content">
                {formatCurrency(account.balance)}
              </p>
              <p className="mt-1 text-xs text-base-content/40">
                {t('acc.colInitial')}: {formatCurrency(account.initialBalance)}
              </p>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold">{t('common.recentActivity')}</h4>
              {loading ? (
                <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto" aria-hidden="true">
                  <li className="skeleton h-10 w-full rounded-box" />
                  <li className="skeleton h-10 w-full rounded-box" />
                  <li className="skeleton h-10 w-full rounded-box" />
                </ul>
              ) : transactions.length === 0 ? (
                <p className="mt-2 text-sm text-base-content/50">{t('acc.noActivity')}</p>
              ) : (
                <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {transactions.map((transaction) => {
                    const dest = transaction.transferAccount
                    const isTransfer = transaction.type === 'TRANSFER'
                    const income = transaction.type === 'INCOME'
                    const label = isTransfer && dest
                      ? `${accountDisplayName(transaction.account, t)} → ${accountDisplayName(dest, t)}`
                      : transaction.description
                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-2 rounded-box border border-base-200 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-base-content/70">{label}</span>
                          <span className="block text-xs text-base-content/40 tabular-nums">
                            {formatDateTime(transaction.date)}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-medium tabular-nums ${
                            isTransfer
                              ? 'text-base-content/60'
                              : income ? 'text-success' : 'text-error'
                          }`}
                        >
                          {income ? '+' : isTransfer ? '' : '−'} {formatCurrency(transaction.amount)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {transactions.length >= 5 ? (
                <Link
                  to={`/accounts/${account.id}/activities`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  {t('common.viewAllActivity')}
                  <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </>
        ) : failed ? (
          <p className="text-sm text-error" role="alert">{failed}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-1/2 rounded-box" />
            <div className="skeleton h-20 w-full rounded-box" />
          </div>
        )}

        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t('common.closeDialog')}
        onClick={onClose}
      />
    </dialog>
  )
}

export default AccountDetailDialog