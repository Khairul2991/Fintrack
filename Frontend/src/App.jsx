import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import LanguageProvider from './components/common/LanguageProvider'
import ToastProvider from './components/common/ToastProvider'
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

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <Routes>
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
        </Routes>
      </ToastProvider>
    </LanguageProvider>
  )
}

export default App