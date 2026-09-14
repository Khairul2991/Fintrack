import { Children, forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MAX_VISIBLE_OPTIONS = 7
const ROW_PX = 36
const MENU_GAP_PX = 12
const MENU_OFFSET_PX = 4
const VIEWPORT_MARGIN_PX = 8

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

export function FormSelectOption() {
  return null
}

const FormSelect = forwardRef(function FormSelect(
  {
    id,
    children,
    value = '',
    onChange,
    disabled = false,
    invalid = false,
    warning = false,
    autoFocus = false,
    ariaLabel,
  },
  ref,
) {
  const uniqueId = useId()
  const buttonId = id ?? `${uniqueId}-button`
  const listboxId = id ? `${id}-listbox` : `${uniqueId}-listbox`
  const [open, setOpen] = useState(false)
  const [menuTarget, setMenuTarget] = useState(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const menuRef = useRef(null)

  const options = Children.toArray(children)
    .filter((child) => child.type === FormSelectOption)
    .map((child) => ({
      value: child.props.value == null ? '' : String(child.props.value),
      disabled: Boolean(child.props.disabled),
      label: child.props.children,
    }))

  const selectedIndex = options.findIndex((option) => option.value === String(value))
  const selectedLabel = selectedIndex !== -1 ? options[selectedIndex].label : ''

  const measureMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger || typeof window === 'undefined') return null
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const width = Math.min(Math.max(rect.width, 0), viewportWidth - VIEWPORT_MARGIN_PX * 2)
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN_PX),
      Math.max(VIEWPORT_MARGIN_PX, viewportWidth - width - VIEWPORT_MARGIN_PX),
    )
    const estimate = Math.min(options.length, MAX_VISIBLE_OPTIONS) * ROW_PX + MENU_GAP_PX
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const nextOpenUp = spaceBelow < estimate && spaceAbove > spaceBelow
    if (nextOpenUp) {
      return {
        left,
        width,
        bottom: Math.max(viewportHeight - rect.top + MENU_OFFSET_PX, VIEWPORT_MARGIN_PX),
      }
    }
    return { left, width, top: rect.bottom + MENU_OFFSET_PX }
  }, [options.length])

  function openMenu() {
    if (disabled) return
    if (typeof document !== 'undefined') {
      setMenuTarget(triggerRef.current?.closest('dialog') ?? document.body)
    }
    const next = measureMenu()
    if (next) setMenuStyle(next)
    setOpen(true)
  }

  function closeMenu(refocusTrigger = false) {
    setOpen(false)
    setMenuTarget(null)
    setMenuStyle(null)
    if (refocusTrigger) triggerRef.current?.focus()
  }

  useImperativeHandle(ref, () => ({
    focus: () => triggerRef.current?.focus(),
  }))

  useEffect(() => {
    if (!open) return
    function closeOnOutsidePointer(event) {
      if (rootRef.current?.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      closeMenu()
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeMenu(true)
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
    const selected = items.find((item) => item.dataset.value === String(value))
    ;(selected ?? items[0])?.focus()
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function refreshMenuPosition() {
      const next = measureMenu()
      if (!next) return
      setMenuStyle((current) => {
        if (
          current &&
          current.left === next.left &&
          current.width === next.width &&
          current.top === next.top &&
          current.bottom === next.bottom
        ) {
          return current
        }
        return next
      })
    }
    window.addEventListener('resize', refreshMenuPosition)
    document.addEventListener('scroll', refreshMenuPosition, true)
    return () => {
      window.removeEventListener('resize', refreshMenuPosition)
      document.removeEventListener('scroll', refreshMenuPosition, true)
    }
  }, [open, measureMenu])

  function selectOption(optionValue) {
    closeMenu(true)
    if (optionValue !== String(value)) onChange(optionValue)
  }

  function handleListKeyDown(event) {
    if (!listRef.current) return
    const items = Array.from(listRef.current.querySelectorAll('[role="option"]'))
    const index = items.indexOf(document.activeElement)
    let next = -1

    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const active = document.activeElement
      if (active && active.dataset?.value !== undefined) {
        selectOption(active.dataset.value)
      }
      return
    } else if (event.key === 'Tab') {
      closeMenu()
      return
    } else {
      return
    }

    event.preventDefault()
    items[next]?.focus()
  }

  function handleTriggerKeyDown(event) {
    if (disabled || open) return
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      openMenu()
    }
  }

  function handleTriggerClick() {
    if (disabled) return
    if (open) closeMenu()
    else openMenu()
  }

  const scrollable = options.length > MAX_VISIBLE_OPTIONS

  return (
    <div ref={rootRef}>
      <button
        type="button"
        id={buttonId}
        ref={triggerRef}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-field border bg-base-100 pl-3 pr-2.5 text-left text-sm transition-colors duration-200 hover:border-base-content/40 focus:border-base-content focus:outline-none ${
          invalid ? 'border-error hover:border-error focus:border-error' : ''
        } ${
          warning ? 'border-warning hover:border-warning focus:border-warning' : ''
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="min-w-0 flex-1 truncate text-base-content">{selectedLabel ?? ''}</span>
        <ChevronIcon open={open} />
      </button>
      {open && menuTarget && menuStyle
        ? createPortal(
          <ul
            ref={(node) => {
              listRef.current = node
              menuRef.current = node
            }}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            onKeyDown={handleListKeyDown}
            style={menuStyle}
            className={`fixed z-50 min-w-0 rounded-box border border-base-200 bg-base-100 p-1 shadow-elevated ${
              scrollable ? 'max-h-[17rem] overflow-y-auto' : ''
            }`}
          >
          {options.map((option) => {
            const isSelected = option.value === String(value)
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                tabIndex={isSelected ? 0 : -1}
                data-value={option.value}
                onClick={() => {
                  if (!option.disabled) selectOption(option.value)
                }}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-field px-3 py-2 text-sm transition-colors hover:bg-base-200 ${
                  option.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'font-semibold text-base-content'
                      : 'text-base-content/75'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <span className="flex w-4 shrink-0 justify-end text-primary">
                  {isSelected ? <CheckIcon /> : null}
                </span>
              </li>
            )
          })}
          </ul>,
          menuTarget,
        )
        : null}
    </div>
  )
})

export default FormSelect