import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand, BrandMark, SidebarNav } from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

function MobileNavigation() {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-base-200 bg-base-200/90 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content">
            <BrandMark className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight">FinTrack</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm"
          aria-label={t('app.openMenuAria')}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <nav
        className={`surface fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-elevated transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('app.mobileNavAria')}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-base-200 pr-2">
          <Brand />
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            aria-label={t('app.closeMenuAria')}
            onClick={() => setOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-base-200 px-4 py-3">
          {user && (
            <div className="flex items-center gap-2 mb-2">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-8">
                  <span className="text-xs">{(user.email || '?')[0].toUpperCase()}</span>
                </div>
              </div>
              <span className="truncate text-xs text-base-content/60">{user.email}</span>
            </div>
          )}
          <button
            className="btn btn-ghost btn-xs w-full justify-start text-error/80 hover:text-error"
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate('/login')
            }}
          >
            {t('auth.logoutButton')}
          </button>
        </div>
      </nav>
    </>
  )
}

export default MobileNavigation