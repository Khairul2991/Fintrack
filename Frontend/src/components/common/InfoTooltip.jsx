import { useId, useState } from 'react'
import { InfoIcon } from './Icons'

function InfoTooltip({ label, text }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-base-content/50 transition-colors hover:text-base-content"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-field border border-base-300 bg-base-100 p-2 text-left text-xs font-normal leading-relaxed text-base-content/80 shadow-elevated"
        >
          {text}
        </span>
      ) : null}
    </span>
  )
}

export default InfoTooltip
