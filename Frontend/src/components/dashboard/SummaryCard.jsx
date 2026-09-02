const TONES = {
  default: 'border-base-300',
  success: 'border-success/40',
  error: 'border-error/40',
}

function SummaryCard({ label, value, tone = 'default' }) {
  return (
    <div className={`card bg-base-100 shadow border-t-4 ${TONES[tone] || TONES.default}`}>
      <div className="card-body gap-1">
        <p className="text-sm text-base-content/60">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export default SummaryCard