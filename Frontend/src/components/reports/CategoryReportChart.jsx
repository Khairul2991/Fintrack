import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'

function CategoryReportChart({ categories }) {
  const data = categories.map((category) => ({
    name: category.name,
    value: Number(category.total),
    fill: category.color,
  }))

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Expense by Category</h2>
        {data.length === 0 ? (
          <EmptyState
            title="No expense data yet"
            message="Expenses will appear here once you record them."
          />
        ) : (
          <>
            <div role="img" aria-label="Pie chart of expenses by category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={1}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-col divide-y divide-base-200">
              {data.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: row.fill }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{row.name}</span>
                  </span>
                  <span className="whitespace-nowrap font-semibold">
                    {formatCurrency(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default CategoryReportChart