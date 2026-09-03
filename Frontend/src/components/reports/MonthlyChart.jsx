import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from '../common/EmptyState'
import { formatCurrency, formatCurrencyCompact, formatMonth } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function MonthlyChart({ months }) {
  const { t } = useLanguage()
  const data = months.map((month) => ({
    label: formatMonth(month.month),
    income: Number(month.income),
    expense: Number(month.expense),
  }))
  const hasData = data.some((entry) => entry.income > 0 || entry.expense > 0)

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">{t('rep.monthly')}</h2>
        {hasData ? (
          <div role="img" aria-label={t('rep.monthlyAria')}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  fontSize={12}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" name={t('common.income')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t('common.expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title={t('chart.noData')} message={t('chart.noDataMsg')} />
        )}
      </div>
    </div>
  )
}

export default MonthlyChart