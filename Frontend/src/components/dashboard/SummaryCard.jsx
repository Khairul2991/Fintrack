const TONES = {
  default: { chip: 'text-base-content/50', value: '' },
  success: { chip: 'text-success', value: 'text-success' },
  error: { chip: 'text-error', value: 'text-error' },
}

function SummaryCard({ label, value, tone = 'default', icon }) {
  const t = TONES[tone] || TONES.default
  return (
    <div className="card surface card-border min-w-0">
      <div className="card-body gap-3 p-5">
        <div className="flex items-center gap-2 text-sm text-base-content/60">
          {icon ? <span className={t.chip}>{icon}</span> : null}
          <span>{label}</span>
        </div>
        <p className={`financial-value text-2xl font-bold tabular-nums tracking-tight ${t.value}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default SummaryCard