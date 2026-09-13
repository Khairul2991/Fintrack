function normalize(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits === '') return ''
  const hourDigits = digits.length <= 2 ? digits : digits.slice(0, digits.length - 2)
  const minuteDigits = digits.length > 2 ? digits.slice(-2) : ''
  return minuteDigits ? `${hourDigits}:${minuteDigits}` : hourDigits
}

function TimeInput({ id, value, onChange, error, disabled }) {
  function handleChange(event) {
    onChange(normalize(event.target.value))
  }

  function handleBlur(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    if (digits === '') {
      if (value !== '00:00') onChange('00:00')
      return
    }
    let hour = Number(digits.length <= 2 ? digits : digits.slice(0, digits.length - 2))
    let minute = digits.length > 2 ? Number(digits.slice(-2)) : 0
    if (hour > 23) hour = 23
    if (minute > 59) minute = 59
    const normalized = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    if (normalized !== value) onChange(normalized)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      placeholder="14:30"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={`input input-bordered w-full tabular-nums ${error ? 'input-error' : ''}`}
      aria-label="time"
    />
  )
}

export default TimeInput