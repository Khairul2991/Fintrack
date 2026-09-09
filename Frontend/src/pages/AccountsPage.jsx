import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import AccountForm from '../components/accounts/AccountForm'
import { PlusIcon, EditIcon, TrashIcon, ArrowRightIcon } from '../components/common/Icons'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from '../services/accountApi'
import { listTransactions } from '../services/transactionApi'
import { formatCurrency } from '../utils/format'
import { accountDisplayName, sortAccountsDefaultFirst } from '../utils/accountDisplay'

const TYPE_KEY = {
  CASH: 'acc.typeCash',
  BANK: 'acc.typeBank',
  SAVINGS: 'acc.typeSavings',
  EWALLET: 'acc.typeEWallet',
  OTHER: 'acc.typeOther',
}

function AccountsPage() {
  const toast = useToast()
  const { t, translateError } = useLanguage()

  const [accounts, setAccounts] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [recentByAccount, setRecentByAccount] = useState({})

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(() => {
    listAccounts()
      .then((response) => {
        setAccounts(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [translateError])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    if (status !== 'ready' || accounts.length === 0) return
    let cancelled = false
    Promise.all(
      accounts.map((account) =>
        listTransactions({ accountId: account.id, limit: 3 })
          .then((response) => ({ id: account.id, items: response.data }))
          .catch(() => ({ id: account.id, items: [] })),
      ),
    ).then((entries) => {
      if (!cancelled) {
        setRecentByAccount(
          Object.fromEntries(entries.map((entry) => [String(entry.id), entry.items])),
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [status, accounts])

  function retry() {
    setStatus('loading')
    setRefreshKey((key) => key + 1)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(account) {
    setEditing(account)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateAccount(editing.id, payload)
      toast.success(t('acc.updated'))
    } else {
      await createAccount(payload)
      toast.success(t('acc.added'))
    }
    closeForm()
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteAccount(deleting.id)
      toast.success(t('acc.deleted'))
      setDeleting(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  const total = accounts.reduce((sum, account) => sum + Number(account.balance), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('acc.title')} subtitle={t('acc.subtitle')}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <PlusIcon />
          {t('acc.add')}
        </button>
      </PageHeader>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-48 rounded-box" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="alert alert-error flex items-center justify-between gap-2">
          <span>{t('acc.loadError')} {loadError}</span>
          <button type="button" className="btn btn-sm" onClick={retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card surface card-border">
          <EmptyState
            title={t('acc.empty')}
            message={t('acc.emptyMsg')}
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                {t('acc.add')}
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card surface card-border min-w-0">
            <div className="card-body p-5">
              <p className="text-sm text-base-content/60">{t('dash.totalAccounts')}</p>
              <p className="financial-value text-2xl font-bold tabular-nums text-base-content">
                {formatCurrency(total)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortAccountsDefaultFirst(accounts).map((account) => (
              <div key={account.id} className="card surface card-border min-w-0">
                <div className="card-body gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="card-title text-base font-semibold text-base-content">
                        {accountDisplayName(account, t)}
                      </h2>
                      {account.isDefault ? (
                        <span className="badge badge-primary badge-sm border-0">{t('acc.default')}</span>
                      ) : (
                        <span className="badge badge-ghost">{t(TYPE_KEY[account.type] || 'acc.typeOther')}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                        onClick={() => openEdit(account)}
                        aria-label={t('acc.editAria', { name: accountDisplayName(account, t) })}
                      >
                        <EditIcon />
                      </button>
                      {!account.isDefault ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
                          onClick={() => setDeleting(account)}
                          aria-label={t('acc.deleteAria', { name: accountDisplayName(account, t) })}
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">{t('acc.colBalance')}</p>
                    <p className="financial-value text-xl font-bold tabular-nums text-base-content">
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="mt-1 text-xs text-base-content/40">
                      {t('acc.colInitial')}: {formatCurrency(account.initialBalance)}
                    </p>
                  </div>
                  {recentByAccount[String(account.id)] ? (
                    <div className="border-t border-base-200 pt-3">
                      <p className="text-xs font-medium text-base-content/60">
                        {t('common.recentActivity')}
                      </p>
                      {recentByAccount[String(account.id)].length === 0 ? (
                        <p className="mt-1 text-xs text-base-content/40">{t('accAct.noActivity')}</p>
                      ) : (
                        <ul className="mt-1 flex flex-col gap-1">
                          {recentByAccount[String(account.id)].map((transaction) => {
                            const income = transaction.type === 'INCOME'
                            return (
                              <li
                                key={transaction.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="min-w-0 truncate text-base-content/70">
                                  {transaction.description}
                                </span>
                                <span
                                  className={`shrink-0 font-medium tabular-nums ${income ? 'text-success' : 'text-error'}`}
                                >
                                  {income ? '+' : '−'} {formatCurrency(transaction.amount)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      <Link
                        to={`/accounts/${account.id}/activities`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {t('common.viewAllActivity')}
                        <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {formOpen ? (
        <AccountForm account={editing} onCancel={closeForm} onSave={handleSave} />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('acc.confirmTitle')}
          message={t('acc.confirmMsg', { name: deleting.name })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default AccountsPage