import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import BackLink from '../components/common/BackLink'
import EmptyState from '../components/common/EmptyState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { getAccount } from '../services/accountApi'
import { listTransactions } from '../services/transactionApi'
import { useLanguage } from '../context/LanguageContext'
import { formatCurrency, formatDate } from '../utils/format'
import { accountDisplayName } from '../utils/accountDisplay'

const PAGE_SIZE = 10

function ActivityTypeBadge({ type, t }) {
  const income = type === 'INCOME'
  return (
    <span
      className={`badge badge-sm border-0 font-medium ${income ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
    >
      {income ? t('common.income') : t('common.expense')}
    </span>
  )
}

function AccountActivitiesPage() {
  const { id } = useParams()
  const { t, translateError, localizeCategory } = useLanguage()

  const [account, setAccount] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [transactions, setTransactions] = useState([])
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
  const [txStatus, setTxStatus] = useState('loading')
  const [txError, setTxError] = useState('')
  const [type, setType] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const loadAccount = useCallback(() => {
    setStatus('loading')
    getAccount(id)
      .then((response) => {
        setAccount(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [id, translateError])

  useEffect(() => {
    loadAccount()
  }, [loadAccount, refreshKey])

  useEffect(() => {
    setTxStatus('loading')
    const timer = setTimeout(() => {
      listTransactions({
        accountId: id,
        page,
        limit: PAGE_SIZE,
        type: type === 'ALL' ? undefined : type,
        search: search.trim() || undefined,
      })
        .then((response) => {
          setTransactions(response.data)
          setMeta(response.meta)
          setTxStatus('ready')
        })
        .catch((error) => {
          setTxError(translateError(error.message))
          setTxStatus('error')
        })
    }, search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [id, page, type, search, translateError])

  const filterActive = type !== 'ALL' || search.trim() !== ''

  function changeType(value) {
    setType(value)
    setPage(1)
  }

  function changeSearch(value) {
    setSearch(value)
    setPage(1)
  }

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/accounts" />
      <PageHeader title={t('accAct.title')} subtitle={account ? accountDisplayName(account, t) : undefined} />

      {status === 'loading' ? (
        <div className="skeleton h-32 rounded-box" />
      ) : status === 'error' ? (
        <div role="alert" className="alert alert-error flex items-center justify-between gap-2">
          <span>
            {t('acc.loadError')} {loadError}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <div className="card surface card-border min-w-0">
          <div className="card-body flex-row flex-wrap items-end justify-between gap-4 p-5">
            <div>
              <p className="text-xs text-base-content/60">{t('acc.colBalance')}</p>
              <p className="financial-value text-2xl font-bold tabular-nums text-base-content">
                {formatCurrency(account.balance)}
              </p>
              <p className="mt-1 text-xs text-base-content/40">
                {t('acc.colInitial')}: {formatCurrency(account.initialBalance)}
              </p>
            </div>
            <p className="shrink-0 text-xs text-base-content/50">
              {t('acc.inTransactions', { count: meta.total })}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="join">
          {['ALL', 'INCOME', 'EXPENSE'].map((value) => {
            const active = type === value
            const label =
              value === 'ALL'
                ? t('common.all')
                : value === 'INCOME'
                  ? t('common.income')
                  : t('common.expense')
            return (
              <button
                key={value}
                type="button"
                className={`btn btn-sm join-item ${active ? 'btn-primary' : ''}`}
                onClick={() => changeType(value)}
                aria-pressed={active}
              >
                {label}
              </button>
            )
          })}
        </div>
        <label className="input input-sm grow basis-64">
          <span className="sr-only">{t('tx.searchAria')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={t('tx.searchPlaceholder')}
          />
        </label>
      </div>

      <div className="card surface card-border min-w-0">
        {txStatus === 'loading' ? (
          <LoadingSkeleton rows={6} />
        ) : txStatus === 'error' ? (
          <div role="alert" className="m-4 flex items-center justify-between gap-2 alert alert-error">
            <span>
              {t('tx.loadError')} {txError}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPage((current) => Math.max(1, current))}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={filterActive ? t('tx.noMatch') : t('accAct.noActivity')}
              message={filterActive ? t('tx.noMatchMsg') : undefined}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('tx.colDate')}</th>
                    <th>{t('tx.colDescription')}</th>
                    <th>{t('tx.colCategory')}</th>
                    <th>{t('tx.colGoal')}</th>
                    <th>{t('tx.colType')}</th>
                    <th className="text-right">{t('tx.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const income = transaction.type === 'INCOME'
                    return (
                      <tr key={transaction.id}>
                        <td className="text-base-content/70">{formatDate(transaction.date)}</td>
                        <td className="font-medium">{transaction.description || '-'}</td>
                        <td className="text-base-content/70">
                          {transaction.category
                            ? `${transaction.category.icon} ${localizeCategory(transaction.category)}`
                            : '-'}
                        </td>
                        <td className="text-base-content/70">{transaction.goal ? transaction.goal.name : '-'}</td>
                        <td>
                          <ActivityTypeBadge type={transaction.type} t={t} />
                        </td>
                        <td
                          className={`text-right font-semibold tabular-nums ${income ? 'text-success' : 'text-error'}`}
                        >
                          {income ? '+' : '−'} {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-200 p-4">
              <p className="text-sm text-base-content/60">{t('tx.showing', { from, to, total: meta.total })}</p>
              <div className="join">
                <button
                  type="button"
                  className="join-item btn btn-sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t('tx.prev')}
                </button>
                <span className="join-item btn btn-sm no-animation">
                  {t('tx.page', { page: meta.page, pages: meta.totalPages })}
                </span>
                <button
                  type="button"
                  className="join-item btn btn-sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                >
                  {t('tx.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AccountActivitiesPage