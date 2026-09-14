function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-28 rounded-box" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-box" />
    </div>
  )
}

export default CalendarSkeleton