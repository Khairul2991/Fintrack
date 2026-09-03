import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/layout/PageHeader'
import MonthlyChart from '../components/reports/MonthlyChart'
import CategoryReportChart from '../components/reports/CategoryReportChart'
import MonthlyComparison from '../components/reports/MonthlyComparison'
import HighestCategory from '../components/reports/HighestCategory'
import AnalyticsSection from '../components/analytics/AnalyticsSection'
import { getCategoryReport, getMonthlyReport } from '../services/reportsApi'
import { listCategories } from '../services/categoryApi'
import { fetchReportPdf, downloadBlob } from '../services/exportApi'
import { useLanguage } from '../context/LanguageContext'

function ReportsPage() {
  const toast = useToast()
  const { t, translateError, lang } = useLanguage()
  const [months, setMonths] = useState([])
  const [categories, setCategories] = useState([])
  const [highest, setHighest] = useState(null)
  const [categoryById, setCategoryById] = useState({})
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([getMonthlyReport(), getCategoryReport(), listCategories()])
      .then(([monthly, categoryReport, allCategories]) => {
        if (!active) return
        setMonths(monthly.data.months)
        setCategories(categoryReport.data.categories)
        setHighest(categoryReport.data.highest)
        setCategoryById(
          Object.fromEntries(allCategories.data.map((category) => [category.id, category])),
        )
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        if (active) {
          setLoadError(translateError(error.message))
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [refreshKey, translateError])

  function retry() {
    setStatus('loading')
    setRefreshKey((key) => key + 1)
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  async function handlePdf() {
    if (downloadingPdf) return
    setDownloadingPdf(true)
    try {
      const blob = await fetchReportPdf(lang)
      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `Fintrack-report-${stamp}.pdf`)
      toast.success(t('exp.pdfStarted'))
    } catch (error) {
      toast.error(translateError(error.message) || t('exp.downloadError'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('rep.title')} subtitle={t('rep.subtitle')}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handlePdf}
          disabled={downloadingPdf}
          aria-label={t('exp.pdfAria')}
        >
          {downloadingPdf ? <span className="loading loading-spinner loading-sm" /> : null}
          {t('exp.exportPdf')}
        </button>
      </PageHeader>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-96 rounded-box sm:col-span-1 lg:col-span-2" />
          <div className="skeleton h-96 rounded-box" />
          <div className="skeleton h-96 rounded-box" />
        </div>
      ) : status === 'error' ? (
        <div className="card surface card-border">
          <div role="alert" className="card-body">
            <div className="flex items-center justify-between gap-2">
              <span>{t('rep.loadError')} {loadError}</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={retry}>
                {t('common.retry')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MonthlyChart months={months} />
            <CategoryReportChart categories={categories} />
            <MonthlyComparison months={months} />
            <HighestCategory highest={highest} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <h2 className="text-lg font-bold">{t('an.title')}</h2>
            <span className="text-sm text-base-content/50">{t('an.subtitle')}</span>
          </div>
          <AnalyticsSection categoryById={categoryById} />
        </>
      )}
    </div>
  )
}

export default ReportsPage