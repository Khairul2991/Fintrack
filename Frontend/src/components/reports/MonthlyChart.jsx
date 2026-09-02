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

function MonthlyChart({ months }) {
  const data = months.map((month) => ({
    label: formatMonth(month.month),
    income: Number(month.income),
    expense: Number(month.expense),
  }))
  const hasData = data.some((entry) => entry.income > 0 || entry.expense > 0)

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Monthly Income vs Expense</h2>
        {hasData ? (
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
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="No data available for this period"
            message="Add income and expenses to see your monthly trends."
          />
        )}
      </div>
    </div>
  )
}

export default MonthlyChart