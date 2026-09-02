import { useCallback, useState } from 'react'

const STORAGE_KEY = 'fintrack-theme'
const VALID_THEMES = ['system', 'light', 'dark']

export function readTheme() {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  return VALID_THEMES.includes(stored) ? stored : 'system'
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  const changeTheme = useCallback((next) => {
    applyTheme(next)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
    setTheme(next)
  }, [])

  return [theme, changeTheme]
}