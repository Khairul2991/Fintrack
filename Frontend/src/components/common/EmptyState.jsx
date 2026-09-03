function EmptyState({ title, message, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      {icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-base-200 text-base-content/50">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-base-content">{title}</p>
      <p className="max-w-sm text-sm text-base-content/60">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export default EmptyState