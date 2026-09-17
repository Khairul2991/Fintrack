import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../../layouts/Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../hooks/useTheme'

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

function useEffectiveDark(theme) {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return theme === 'dark' || (theme === 'system' && systemDark)
}

function ThemeToggle({ id }) {
  const { t } = useLanguage()
  const [theme, changeTheme] = useTheme()
  const isDark = useEffectiveDark(theme)

  return (
    <button
      id={id}
      type="button"
      className="btn btn-ghost btn-square btn-sm"
      aria-label={isDark ? t('landing.themeToLight') : t('landing.themeToDark')}
      title={isDark ? t('landing.themeToLight') : t('landing.themeToDark')}
      onClick={() => changeTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function LanguageToggle({ id, className = '' }) {
  const { t, lang, setLang } = useLanguage()
  const next = lang === 'id' ? 'en' : 'id'

  return (
    <button
      id={id}
      type="button"
      className={`btn btn-ghost btn-sm font-bold tracking-wide ${className}`}
      aria-label={next === 'en' ? t('landing.langToEn') : t('landing.langToId')}
      title={next === 'en' ? t('landing.langToEn') : t('landing.langToId')}
      onClick={() => setLang(next)}
    >
      {lang.toUpperCase()}
    </button>
  )
}

function LandingNavbar() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const links = [
    { href: '#why-fintrack', label: t('landing.navWhy') },
    { href: '#features', label: t('landing.navFeatures') },
    { href: '#how-it-works', label: t('landing.navHow') },
    { href: '#budgets-goals', label: t('landing.navBudgets') },
    { href: '#reports', label: t('nav.reports') },
    { href: '#contact', label: t('landing.navContact') },
  ]

  return (
    <>
      {/* Independent navbar surface: its own fixed h-16 backdrop (own
          stacking context at z-10), a sibling of <header> rather than paint
          attached to it — so it always covers section content on its own tier
          while the global bubble layer (z-20) paints above it. Fixed (not
          sticky) so it takes no in-flow space and <header> starts at the very
          top of the viewport on initial load. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-10 h-16 bg-base-200 transition-[box-shadow] duration-200 ${
          scrolled ? 'shadow-md' : ''
        }`}
      />
      <header className="sticky top-0 z-40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content">
        {t('landing.skip')}
      </a>
      {/* <header> stays transparent on its own tier (z-30, above section
          content and the navbar surface z-10): navbar content (z-50)
          paints above the global bubble layer (z-20). */}
      <div className="relative z-50 mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="FinTrack">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-content">
            <BrandMark className="h-5 w-5" />
          </span>
          <span className="truncate text-base font-bold tracking-tight text-base-content">FinTrack</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label={t('app.mainNavAria')}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-base-content/70 transition-colors hover:bg-base-300/60 hover:text-base-content"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1 xl:flex">
          <LanguageToggle id="landing-lang" />
          <ThemeToggle id="landing-theme" />
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm ml-1">
              {t('landing.openDashboard')}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                {t('auth.loginButton')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                {t('landing.getStarted')}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 xl:hidden">
          <LanguageToggle id="landing-lang-compact" />
          <ThemeToggle id="landing-theme-compact" />
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            aria-label={open ? t('app.closeMenuAria') : t('app.openMenuAria')}
            aria-expanded={open}
            aria-controls="landing-menu"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        id="landing-menu"
        inert={!open}
        className={`relative z-50 overflow-hidden transition-[max-height,opacity] duration-200 xl:hidden ${
          open ? 'max-h-135 border-t border-base-200 bg-base-200 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6" aria-label={t('app.mobileNavAria')}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-base-content/80 transition-colors hover:bg-base-300/60 hover:text-base-content"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                {t('landing.openDashboard')}
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                  {t('landing.getStarted')}
                </Link>
                <Link to="/login" className="btn btn-outline w-full" onClick={() => setOpen(false)}>
                  {t('auth.loginButton')}
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
    </>
  )
}

export default LandingNavbar
