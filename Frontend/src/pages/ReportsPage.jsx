import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import MonthlyChart from '../components/reports/MonthlyChart'
import CategoryReportChart from '../components/reports/CategoryReportChart'
import MonthlyComparison from '../components/reports/MonthlyComparison'
import HighestCategory from '../components/reports/HighestCategory'
import { getCategoryReport, getMonthlyReport } from '../services/reportsApi'

function ReportsPage() {
  const [months, setMonths] = useState([])
  const [categories, setCategories] = useState([])
  const [highest, setHighest] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([getMonthlyReport(), getCategoryReport()])
      .then(([monthly, categoryReport]) => {
        if (!active) return
        setMonths(monthly.data.months)
        setCategories(categoryReport.data.categories)
        setHighest(categoryReport.data.highest)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message)
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  function retry() {
    setStatus('loading')
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reports" subtitle="Analyze your spending patterns." />

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-96 rounded-box sm:col-span-1 lg:col-span-2" />
          <div className="skeleton h-96 rounded-box" />
          <div className="skeleton h-96 rounded-box" />
        </div>
      ) : status === 'error' ? (
        <div className="card bg-base-100 shadow">
          <div role="alert" className="card-body">
            <div className="flex items-center justify-between gap-2">
              <span>Unable to load reports. {loadError}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={retry}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MonthlyChart months={months} />
          <CategoryReportChart categories={categories} />
          <MonthlyComparison months={months} />
          <HighestCategory highest={highest} />
        </div>
      )}
    </div>
  )
}

export default ReportsPage