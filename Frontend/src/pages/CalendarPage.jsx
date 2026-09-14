import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import MonthHeader from '../components/calendar/MonthHeader'
import MonthSummary from '../components/calendar/MonthSummary'
import CalendarGrid from '../components/calendar/CalendarGrid'
import DayDetailPanel from '../components/calendar/DayDetailPanel'
import CalendarSkeleton from '../components/calendar/CalendarSkeleton'
import CalendarAccountSelect from '../components/calendar/CalendarAccountSelect'
import { listTransactions } from '../services/transactionApi'
import { listAccounts } from '../services/accountApi'
import { useLanguage } from '../context/LanguageContext'
import {
  endDateOfMonth,
  groupTransactionsByDay,
  sameMonth,
  shiftMonth,
  startDateOfMonth,
  summarizeMonth,
  todayKey,
  viewForDateKey,
  viewKey,
} from '../utils/calendarView'

const STORAGE_KEY = 'fintrack-calendar-view'
const PAGE_LIMIT = 100

function currentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function readInitialSelectedDay(view) {
  const today = todayKey()
  return sameMonth(view, viewForDateKey(today)) ? today : null
}

function parseMonthInput(value) {
  const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{1,2})$/) : null
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null
  return { month, year }
}

function readInitialView(searchParams) {
  const current = currentMonthYear()
  const fromUrl = searchParams.get('month')
  if (fromUrl) {
    const parsed = parseMonthInput(fromUrl)
    if (parsed) return parsed
  }
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = parseMonthInput(stored)
      if (parsed) return parsed
    }
  }
  return current
}

function CalendarPage() {
  const { t, translateError } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = useMemo(() => readInitialView(searchParams), [searchParams])
  const [view, setView] = useState(initialView)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [selectedDay, setSelectedDay] = useState(() => readInitialSelectedDay(initialView))
  const [refreshKey, setRefreshKey] = useState(0)
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    let cancelled = false
    listAccounts()
      .then((response) => {
        if (!cancelled) setAccounts(response.data || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      const all = []
      const params = {
        startDate: startDateOfMonth(view),
        endDate: endDateOfMonth(view),
        limit: PAGE_LIMIT,
        ...(accountId ? { accountId } : {}),
      }
      try {
        let page = 1
        let totalPages = 1
        do {
          const response = await listTransactions({ ...params, page })
          if (cancelled) return
          all.push(...(response.data || []))
          totalPages = response.meta?.totalPages || 1
          page += 1
        } while (page <= totalPages)
        if (cancelled) return
        setTransactions(all)
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        setLoadError(translateError(error.message))
        setStatus('error')
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [view, accountId, translateError, refreshKey])

  const byDay = useMemo(() => groupTransactionsByDay(transactions), [transactions])
  const summary = useMemo(() => summarizeMonth(transactions, view), [transactions, view])
  const selectedTransactions = selectedDay ? byDay.get(selectedDay) || [] : []

  function changeView(next, dayToSelect = null) {
    setSelectedDay(dayToSelect)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, viewKey(next))
    }
    setSearchParams({ month: viewKey(next) }, { replace: true })
    setStatus('loading')
    setLoadError('')
    setView(next)
  }

  function retry() {
    setStatus('loading')
    setLoadError('')
    setRefreshKey((key) => key + 1)
  }

  function handleAccountChange(value) {
    setAccountId(value)
    setStatus('loading')
    setLoadError('')
  }

  const isCurrent =
    view.month === currentMonthYear().month && view.year === currentMonthYear().year

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('cal.title')} subtitle={t('cal.subtitle')} />

      <MonthHeader
        view={view}
        isCurrent={isCurrent}
        onPrev={() => changeView(shiftMonth(view, -1))}
        onNext={() => changeView(shiftMonth(view, 1))}
        onToday={() => changeView(currentMonthYear(), todayKey())}
      >
        <CalendarAccountSelect accounts={accounts} value={accountId} onChange={handleAccountChange} />
      </MonthHeader>

      {status === 'loading' ? (
        <CalendarSkeleton />
      ) : status === 'error' ? (
        <div role="alert" className="alert alert-error flex items-center justify-between gap-2">
          <span>
            {t('cal.loadError')} {loadError}
          </span>
          <button type="button" className="btn btn-sm" onClick={retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card surface card-border">
          <EmptyState title={t('cal.noActivityMonth')} message={t('cal.noActivityMonthMsg')} />
        </div>
      ) : (
        <>
          <MonthSummary summary={summary} />
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="card surface card-border overflow-x-auto">
              <div className="card-body p-3 sm:p-4">
                <CalendarGrid
                  view={view}
                  byDay={byDay}
                  selectedDay={selectedDay}
                  onSelect={setSelectedDay}
                />
              </div>
            </div>
            <DayDetailPanel
              dayKey={selectedDay}
              transactions={selectedTransactions}
              onClear={() => setSelectedDay(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default CalendarPage