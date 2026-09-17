import { Link } from 'react-router-dom'
import { BrandMark } from '../../layouts/Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { ExpenseIcon, IncomeIcon } from '../common/Icons'
import { formatCurrency } from '../../utils/format'

const BARS = [
  { income: 62, expense: 40 },
  { income: 74, expense: 48 },
  { income: 58, expense: 66 },
  { income: 82, expense: 52 },
  { income: 70, expense: 44 },
  { income: 92, expense: 58 },
]

function HeroSection() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const demoTransactions = [
    { name: t('landing.demoSalary'), amount: 8000000, type: 'income' },
    { name: t('landing.demoGroceries'), amount: -350000, type: 'expense' },
    { name: t('landing.demoTransport'), amount: -120000, type: 'expense' },
  ]

  return (
    <section className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="landing-hero-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="fintrack-hero-glow" />
      </div>
      <div className="relative grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="stagger-in relative z-8 min-w-0">
          <p className="badge badge-soft badge-primary">{t('landing.badge')}</p>
          <h1 id="landing-hero-title" className="mt-4 text-3xl font-bold tracking-tight text-balance text-base-content sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-base-content/70 sm:text-lg">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary fintrack-cta">
                {t('landing.openDashboard')}
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary fintrack-cta">
                  {t('landing.getStarted')}
                </Link>
                <Link to="/login" className="btn btn-outline fintrack-cta">
                  {t('auth.loginButton')}
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-base-content/60">{t('landing.heroNote')}</p>
        </div>

        <div className="stagger-in relative z-8 min-w-0">
          <figure
            className="card surface card-border shadow-elevated fintrack-lift"
            role="img"
            aria-label={t('landing.heroPreviewAria')}
          >
            <div className="card-body gap-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-content">
                    <BrandMark className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold tracking-tight text-base-content">FinTrack</span>
                </span>
                <span className="badge badge-soft badge-sm">{t('dash.title')}</span>
              </div>

              <div>
                <p className="text-xs text-base-content/60">{t('dash.balance')}</p>
                <p className="financial-value text-2xl font-bold tracking-tight tabular-nums text-base-content sm:text-3xl">
                  {formatCurrency(12450000)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="surface-2 rounded-selector p-3">
                  <p className="flex items-center gap-1.5 text-xs text-base-content/60">
                    <span className="text-success"><IncomeIcon /></span>
                    {t('dash.income')}
                  </p>
                  <p className="financial-value mt-1 font-bold tabular-nums text-success">{formatCurrency(8200000)}</p>
                </div>
                <div className="surface-2 rounded-selector p-3">
                  <p className="flex items-center gap-1.5 text-xs text-base-content/60">
                    <span className="text-error"><ExpenseIcon /></span>
                    {t('dash.expense')}
                  </p>
                  <p className="financial-value mt-1 font-bold tabular-nums text-error">{formatCurrency(4100000)}</p>
                </div>
              </div>

              <div className="flex h-28 items-end justify-between gap-2 px-1 pt-2" aria-hidden="true">
                {BARS.map((bar, index) => (
                  <div key={index} className="flex h-full flex-1 items-end justify-center gap-1">
                    <div className="w-full max-w-4 rounded-sm bg-primary/70" style={{ height: `${bar.income}%` }} />
                    <div className="w-full max-w-4 rounded-sm bg-base-300" style={{ height: `${bar.expense}%` }} />
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-base-content/60">{t('dash.recent')}</p>
                <ul className="mt-2 divide-y divide-base-200">
                  {demoTransactions.map((tx) => (
                    <li key={tx.name} className="flex items-center justify-between gap-2 py-2">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          }`}
                        >
                          {tx.type === 'income' ? <IncomeIcon /> : <ExpenseIcon />}
                        </span>
                        <span className="truncate text-sm font-medium text-base-content">{tx.name}</span>
                      </span>
                      <span
                        className={`financial-value shrink-0 text-sm font-semibold tabular-nums ${
                          tx.type === 'income' ? 'text-success' : 'text-error'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
