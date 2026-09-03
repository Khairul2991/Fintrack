import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function CategoryReportChart({ categories }) {
  const { t, localizeCategory } = useLanguage()
  const data = categories.map((category) => ({
    name: localizeCategory(category),
    value: Number(category.total),
    fill: category.color,
  }))

  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('rep.expenseCat')}</h2>
        {data.length === 0 ? (
          <EmptyState title={t('chart.noExpense')} message={t('chart.noExpenseMsg')} />
        ) : (
          <>
            <div role="img" aria-label={t('rep.expenseCatAria')}>
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
                    stroke="var(--color-base-100)"
                    strokeWidth={2}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
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
                  <span className="whitespace-nowrap font-semibold tabular-nums">
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