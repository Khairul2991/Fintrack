import EmptyState from '../common/EmptyState'

function SpendingInsights({ insights }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Spending Insight</h2>
        {insights.length === 0 ? (
          <EmptyState
            title="No insights yet"
            message="Insights will appear as you record more financial activity."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <span className="badge badge-info badge-lg">i</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SpendingInsights