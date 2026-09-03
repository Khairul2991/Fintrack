import { Link } from 'react-router-dom'
import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

const TYPE_KEYS = {
  CASH: 'acc.typeCash',
  BANK: 'acc.typeBank',
  SAVINGS: 'acc.typeSavings',
  EWALLET: 'acc.typeEWallet',
  OTHER: 'acc.typeOther',
}

function AccountBalances({ accounts }) {
  const { t } = useLanguage()
  if (!accounts || accounts.length === 0) {
    return (
      <div className="card surface card-border">
        <EmptyState
          title={t('dash.accountsEmpty')}
          message={t('dash.accountsEmptyMsg')}
          action={
            <Link to="/accounts" className="btn btn-primary btn-sm">
              {t('acc.add')}
            </Link>
          }
        />
      </div>
    )
  }
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{t('dash.accounts')}</h2>
        <span className="text-sm text-base-content/50">
          {t('dash.totalAccounts')}: {accounts.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accounts.map((account) => (
          <div key={account.id} className="card surface card-border rounded-box p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{account.name}</p>
                <p className="text-xs text-base-content/50">
                  {t(TYPE_KEYS[account.type] || 'acc.typeOther')}
                </p>
              </div>
            </div>
            <p
              className="financial-value mt-3 text-xl font-bold tabular-nums"
              aria-label={t('dash.accountBalanceAria', { name: account.name, value: formatCurrency(account.balance) })}
            >
              {formatCurrency(account.balance)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AccountBalances