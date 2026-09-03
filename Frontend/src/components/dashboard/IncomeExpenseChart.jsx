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

function IncomeExpenseChart({ series }) {
  const { t } = useLanguage()
  const data = series.map((entry) => ({
    label: formatMonth(entry.month),
    income: Number(entry.income),
    expense: Number(entry.expense),
  }))
  const hasData = data.some((entry) => entry.income > 0 || entry.expense > 0)

  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('dash.incomeExpense')}</h2>
        {hasData ? (
          <div role="img" aria-label={t('dash.incomeExpenseAria')}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-base-300)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-base-content)"
                  tick={{ fill: 'var(--color-base-content)', opacity: 0.6 }}
                />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  fontSize={12}
                  tick={{ fill: 'var(--color-base-content)', opacity: 0.6 }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    background: 'var(--color-base-100)',
                    border: '1px solid var(--color-base-300)',
                    borderRadius: 'var(--radius-field)',
                    color: 'var(--color-base-content)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, opacity: 0.8 }} />
                <Bar dataKey="income" name={t('common.income')} fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t('common.expense')} fill="var(--color-error)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title={t('chart.noData')}
            message={t('chart.noDataMsg')}
          />
        )}
      </div>
    </div>
  )
}

export default IncomeExpenseChart