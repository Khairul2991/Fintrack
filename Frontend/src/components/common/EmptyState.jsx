function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-base-content/60">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export default EmptyState