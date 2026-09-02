function LoadingSkeleton({ rows = 5 }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-base-200 px-4 py-3"
        >
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton ml-auto h-4 w-1/6" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton