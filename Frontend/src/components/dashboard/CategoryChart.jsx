import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import EmptyState from '../common/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

function CategoryChart({ categories }) {
  const { t } = useLanguage()
  const data = categories.map((category) => ({
    name: category.name,
    value: Number(category.total),
    fill: category.color,
  }))

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">{t('dash.spendingCat')}</h2>
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
        )}
      </div>
    </div>
  )
}

export default CategoryChart