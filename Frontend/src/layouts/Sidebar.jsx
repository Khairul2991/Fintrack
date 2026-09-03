import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../constants/navigation'
import { useLanguage } from '../context/LanguageContext'

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
  return (
    <aside className="surface fixed inset-y-0 left-0 z-20 hidden w-64 flex-col rounded-none border-r border-base-200 lg:flex">
      <div className="border-b border-base-200">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label={t('app.mainNavAria')}>
        <SidebarNav />
      </nav>
      <div className="border-t border-base-200 px-6 py-4">
        <p className="text-xs leading-relaxed text-base-content/50">{t('app.tagline')}</p>
      </div>
    </aside>
  )
}

export default Sidebar
export { SidebarNav, Brand }