function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-base-content/60">{subtitle}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </header>
  )
}

export default PageHeader