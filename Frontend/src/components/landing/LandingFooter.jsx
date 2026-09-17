import { Link } from 'react-router-dom'
import { BrandMark } from '../../layouts/Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

function FinalCta() {
  const { user } = useAuth()
  const { t } = useLanguage()
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-cta-title">
      <div className="relative z-8 card surface card-border mx-auto w-full max-w-6xl">
        <div className="card-body mx-auto max-w-2xl items-center gap-3 p-8 text-center sm:p-12">
          <h2 id="landing-cta-title" className="text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
            {t('landing.ctaTitle')}
          </h2>
          <p className="leading-relaxed text-pretty text-base-content/70">{t('landing.ctaSub')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  const { t } = useLanguage()
  return (
    <>
      <FinalCta />
      <footer>
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <p className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-content">
                <BrandMark className="h-5 w-5" />
              </span>
              <span className="text-base font-bold tracking-tight text-base-content">FinTrack</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-base-content/60">
              {t('landing.footerDesc')}
            </p>
          </div>
          <nav aria-label={t('landing.footerProduct')}>
            <h2 className="text-sm font-semibold text-base-content">{t('landing.footerProduct')}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li>
                <a href="#why-fintrack" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.navWhy')}
                </a>
              </li>
              <li>
                <a href="#features" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.navFeatures')}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.navHow')}
                </a>
              </li>
              <li>
                <a href="#budgets-goals" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.navBudgets')}
                </a>
              </li>
              <li>
                <a href="#reports" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('nav.reports')}
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('nav.dashboard')}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t('landing.footerAccount')}>
            <h2 className="text-sm font-semibold text-base-content">{t('landing.footerAccount')}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li>
                <Link to="/login" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('auth.loginButton')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.getStarted')}
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <h2 className="text-sm font-semibold text-base-content">{t('landing.footerContact')}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li>
                <a href="#contact" className="text-base-content/70 transition-colors hover:text-base-content">
                  {t('landing.navContact')}
                </a>
              </li>
              <li>
                <a
                  href="mailto:auni4040@gmail.com"
                  className="break-all text-base-content/70 transition-colors hover:text-base-content"
                >
                  auni4040@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-base-200">
          <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-base-content/50 sm:px-6">
            {t('landing.rights')}
          </p>
        </div>
      </footer>
    </>
  )
}

export default LandingFooter
