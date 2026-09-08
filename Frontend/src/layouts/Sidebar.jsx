import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { NAV_ITEMS } from '../constants/navigation'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { UserIcon, LogoutIcon } from '../components/common/Icons'
import { clearCache } from '../services/api'

export function BrandMark({ className = 'h-6 w-6' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.3c0-1.3-1.34-2.3-3-2.3s-3 1-3 2.3c0 2.4 6 1.6 6 4.7 0 1.3-1.34 2.3-3 2.3s-3-1-3-2.3" />
    </svg>
  )
}

function SidebarNav({ onNavigate }) {
  const { t } = useLanguage()
  return (
    <ul className="menu w-full gap-1 p-2">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive
                ? 'active bg-primary/10 font-semibold text-primary'
                : 'font-medium text-base-content/70 hover:text-base-content'
            }
          >
            {item.icon}
            {t(item.labelKey)}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2.5 px-6">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content">
        <BrandMark className="h-5 w-5" />
      </span>
      <span className="text-base font-bold tracking-tight text-base-content">FinTrack</span>
    </div>
  )
}

function Sidebar() {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  return (
    <aside className="surface fixed inset-y-0 left-0 z-20 hidden w-64 flex-col rounded-none border-r border-base-200 lg:flex">
      <div className="border-b border-base-200">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label={t('app.mainNavAria')}>
        <SidebarNav />
      </nav>
      <div className="border-t border-base-200 px-3 py-3">
        {user && (
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
              <UserIcon className="h-10 w-10 text-primary-content" />
            </div>
            <span className="truncate text-xs text-base-content/60">{user.email}</span>
          </div>
        )}
        <button
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-error/80 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-error"
          onClick={() => setConfirmLogout(true)}
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          {t('auth.logoutButton')}
        </button>
      </div>
      {confirmLogout && (
        <ConfirmDialog
          title={t('auth.logoutTitle')}
          message={t('auth.logoutDesc')}
          confirmLabel={t('auth.logoutButton')}
          loading={loggingOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={async () => {
            setLoggingOut(true)
            await logout()
            clearCache()
            navigate('/login')
          }}
        />
      )}
    </aside>
  )
}

export default Sidebar
export { SidebarNav, Brand }