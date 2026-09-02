function progressBarClass(status) {
  if (status === 'Over Budget') return 'bg-error'
  if (status === 'Near Limit') return 'bg-warning'
  return 'bg-success'
}

function BudgetProgress({ progress, status }) {
  const percent = Number(progress)
  const shown = Number.isFinite(percent) ? percent : 0
  const capped = Math.min(shown, 100)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs text-base-content/70">
        <span>Progress</span>
        <span className="font-semibold text-base-content">{Math.round(shown)}%</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-base-300"
        role="progressbar"
        aria-valuenow={Math.round(shown)}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Budget progress ${Math.round(shown)} percent`}
      >
        <div
          className={`h-full rounded-full transition-all ${progressBarClass(status)}`}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  )
}

export default BudgetProgress