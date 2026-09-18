import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'
import { NotificationProvider } from '../context/NotificationContext'

function AppLayout() {
  return (
    <NotificationProvider>
      <div className="min-h-dvh bg-base-200 text-base-content">
        <Sidebar />
        <MobileNavigation />
        <main className="flex flex-col px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </NotificationProvider>
  )
}

export default AppLayout