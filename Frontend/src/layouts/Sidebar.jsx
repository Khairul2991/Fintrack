import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../constants/navigation'

function SidebarNav({ onNavigate }) {
  return (
    <ul className="menu w-full gap-1 p-2">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive ? 'active bg-base-200 font-semibold' : 'font-medium'
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 px-6">
      <span className="text-xl" aria-hidden="true">
        💰
      </span>
      <span className="text-lg font-bold tracking-tight text-base-content">FinTrack</span>
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-base-300 bg-base-100 lg:flex">
      <Brand />
      <nav className="flex-1 overflow-y-auto px-2" aria-label="Main navigation">
        <SidebarNav />
      </nav>
      <p className="px-6 py-4 text-xs leading-relaxed text-base-content/50">
        Personal finance manager
      </p>
    </aside>
  )
}

export default Sidebar
export { SidebarNav, Brand }