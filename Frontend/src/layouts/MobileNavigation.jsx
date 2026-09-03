import { useEffect, useState } from 'react'
import { Brand, SidebarNav } from './Sidebar'
import { useLanguage } from '../context/LanguageContext'

function MobileNavigation() {
  const { t } = useLanguage()
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-base-300 bg-base-100/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          className="btn btn-ghost btn-square"
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-base-100 shadow-xl transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('app.mobileNavAria')}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between pr-2">
          <Brand />
          <button
            type="button"
            className="btn btn-ghost btn-square"
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
      </nav>
    </>
  )
}

export default MobileNavigation