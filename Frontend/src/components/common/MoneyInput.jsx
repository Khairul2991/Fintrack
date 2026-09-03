import { useEffect, useRef } from 'react'
import { caretAfterMapping, formatNumberDisplay, toRawNumber } from '../../utils/numberFormat'

function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  error = false,
  ariaLabel,
  autoFocus = false,
  className = '',
  inputRef,
}) {
  const innerRef = useRef(null)
  const caretRef = useRef(null)
  const inputRefResolved = inputRef || innerRef

  const display = formatNumberDisplay(value)

  useEffect(() => {
    const input = inputRefResolved.current
    if (!input || caretRef.current == null) return
    input.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  })

  function handleChange(event) {
    const input = event.target
    const rawDom = input.value
    const start = input.selectionStart
    const raw = toRawNumber(rawDom)
    const next = formatNumberDisplay(raw)

    if (next !== rawDom && start !== input.selectionEnd) {
      // Selection is in progress: let the browser keep the selection as-is.
      caretRef.current = null
    } else if (next !== rawDom) {
      caretRef.current = caretAfterMapping(rawDom, start, next)
    }

    onChange(raw)
  }

  return (
    <input
      ref={inputRefResolved}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`input input-bordered w-full tabular-nums ${error ? 'input-error' : ''} ${className}`}
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error}
      autoFocus={autoFocus}
    />
  )
}

export default MoneyInput