import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import AccountForm from '../components/accounts/AccountForm'
import { PlusIcon, EditIcon, TrashIcon } from '../components/common/Icons'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from '../services/accountApi'
import { formatCurrency } from '../utils/format'

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
            {accounts.map((account) => (
              <div key={account.id} className="card surface card-border min-w-0">
                <div className="card-body gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="card-title text-base font-semibold text-base-content">
                        {account.name}
                      </h2>
                      <span className="badge badge-ghost">{t(TYPE_KEY[account.type] || 'acc.typeOther')}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
                        onClick={() => openEdit(account)}
                        aria-label={t('acc.editAria', { name: account.name })}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
                        onClick={() => setDeleting(account)}
                        aria-label={t('acc.deleteAria', { name: account.name })}
                      >
                        <TrashIcon />
                      </button>
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