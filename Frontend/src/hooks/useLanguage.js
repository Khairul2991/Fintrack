import { LANGUAGES, DEFAULT_LANG } from '../l10n/messages'

const STORAGE_KEY = 'fintrack-language'

export function readLanguage() {
  if (typeof localStorage === 'undefined') return DEFAULT_LANG
  const stored = localStorage.getItem(STORAGE_KEY)
  return LANGUAGES.some((lang) => lang.value === stored) ? stored : DEFAULT_LANG
}

export function applyLanguage(lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
}

export { LANGUAGES }