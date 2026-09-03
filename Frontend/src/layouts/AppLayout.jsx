import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNavigation from './MobileNavigation'

function AppLayout() {
  return (
    <div className="min-h-dvh bg-base-200 text-base-content">
      <Sidebar />
      <MobileNavigation />
      <main className="flex flex-col px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-5xl flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout