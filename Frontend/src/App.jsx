import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, Routes, Route, useNavigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import LanguageProvider from './components/common/LanguageProvider'
import ToastProvider from './components/common/ToastProvider'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useLanguage } from './context/LanguageContext'
import { setTokenProvider } from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage'
import ReportsPage from './pages/ReportsPage'
import BudgetsPage from './pages/BudgetsPage'
import SettingsPage from './pages/SettingsPage'
import AccountsPage from './pages/AccountsPage'
import RecurringTransactionsPage from './pages/RecurringTransactionsPage'
import RecurringBudgetsPage from './pages/RecurringBudgetsPage'
import GoalsPage from './pages/GoalsPage'
import AiInsightsPage from './pages/AiInsightsPage'
import NotificationsPage from './pages/NotificationsPage'
import NotFoundPage from './pages/NotFoundPage'

function TokenBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])
  return null
}

function ProtectedRoute() {
  const { user, loading, authFailed, logout, retryProvision } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)
  const exitingRef = useRef(false)

  const handleExit = async () => {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    try {
      await logout()
    } catch {
      // local state/cache already cleared by logout(); ignore signOut failure
    }
    navigate('/login', { replace: true })
    setExiting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (authFailed) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="card w-full max-w-sm bg-base-100 shadow-md">
          <div className="card-body">
            <div role="alert" className="alert alert-error">
              <span>{t('auth.initError')}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <button type="button" className="btn btn-primary" disabled={exiting} onClick={retryProvision}>
                {t('common.retry')}
              </button>
              <button type="button" className="btn btn-outline btn-error" disabled={exiting} onClick={handleExit}>
                {t('common.exit')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return <Outlet />
}

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }
  return user ? <Navigate to="/" replace /> : <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <TokenBridge />
      <LanguageProvider>
        <ToastProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/recurring-transactions" element={<RecurringTransactionsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/recurring-budgets" element={<RecurringBudgetsPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/ai-insights" element={<AiInsightsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
