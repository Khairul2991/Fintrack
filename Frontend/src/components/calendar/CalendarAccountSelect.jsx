import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { FilterIcon } from '../common/Icons'
import { accountDisplayName } from '../../utils/accountDisplay'

function ChevronIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

const MAX_VISIBLE_OPTIONS = 7

function CalendarAccountSelect({ accounts = [], value = '', onChange }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)

  const options = [
    { id: '', label: t('tx.allAccounts') },
    ...accounts.map((account) => ({ id: account.id, label: accountDisplayName(account, t) })),
  ]
  const selectedLabel =
    options.find((option) => option.id === value)?.label ?? t('tx.allAccounts')

  useEffect(() => {
    if (!open) return
    function closeOnOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const items = Array.from(listRef.current.querySelectorAll('[role="option"]'))
    const selected = items.find((item) => item.dataset.value === value)
    ;(selected ?? items[0])?.focus()
  }, [open, value])

  function selectOption(id) {
    setOpen(false)
    triggerRef.current?.focus()
    if (id !== value) onChange(id)
  }

  function handleListKeyDown(event) {
    const items = Array.from(listRef.current.querySelectorAll('[role="option"]'))
    const index = items.indexOf(document.activeElement)
    let next = -1

    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (document.activeElement?.dataset?.value !== undefined) {
        selectOption(document.activeElement.dataset.value)
      }
      return
    } else {
      return
    }

    event.preventDefault()
    items[next]?.focus()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-base-content/60">{t('cal.filterLabel')}</span>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen((current) => !current)}
          aria-label={t('cal.filterAria')}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-10 min-w-36 max-w-56 items-center gap-2 rounded-field border border-base-300 bg-base-100 pl-3 pr-2.5 text-left transition-colors duration-200 hover:border-base-content/40"
        >
          <FilterIcon className="h-4 w-4 shrink-0 text-base-content/50" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-base-content">
            {selectedLabel}
          </span>
          <ChevronIcon open={open} />
        </button>
        {open ? (
          <ul
            ref={listRef}
            role="listbox"
            aria-label={t('cal.filterAria')}
            onKeyDown={handleListKeyDown}
            className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-1 shadow-elevated ${
              options.length > MAX_VISIBLE_OPTIONS ? 'max-h-[17rem] overflow-y-auto' : ''
            }`}
          >
            {options.map((option) => {
              const isSelected = option.id === value
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  data-value={option.id}
                  onClick={() => selectOption(option.id)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-field px-3 py-2 text-sm transition-colors hover:bg-base-200 ${
                    isSelected ? 'font-semibold text-base-content' : 'text-base-content/75'
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  <span className="flex w-4 shrink-0 justify-end text-primary">
                    {isSelected ? <CheckIcon /> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export default CalendarAccountSelect