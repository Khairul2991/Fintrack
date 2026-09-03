import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function CategoryChart({ categories }) {
  const { t, localizeCategory } = useLanguage()
  const data = categories.map((category) => ({
    name: localizeCategory(category),
    value: Number(category.total),
    fill: category.color,
  }))

  return (
    <div className="card surface card-border">
      <div className="card-body">
        <h2 className="card-title text-base font-semibold">{t('dash.spendingCat')}</h2>
        {data.length === 0 ? (
          <EmptyState
            title={t('chart.noExpense')}
            message={t('chart.noExpenseMsg')}
          />
        ) : (
          <div role="img" aria-label={t('dash.spendingCatAria')}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
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
        )}
      </div>
    </div>
  )
}

export default CategoryChart