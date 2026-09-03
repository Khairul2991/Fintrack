import { useCallback, useMemo, useState } from 'react'
import { LanguageContext } from '../../context/LanguageContext'
import { LANGUAGES, DEFAULT_LANG, messages } from '../../l10n/messages'
import { readLanguage, applyLanguage } from '../../hooks/useLanguage'
import { translateError } from '../../l10n/serverMessages'
import { translateInsight } from '../../l10n/insights'
import { localizeCategory } from '../../l10n/categories'

const STORAGE_KEY = 'fintrack-language'

function interpolate(template, vars) {
  if (!vars) return template
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(String(value))
  }
  return result
}

function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readLanguage)

  const setLang = useCallback((next) => {
    if (!LANGUAGES.some((lang) => lang.value === next)) return
    applyLanguage(next)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
    setLangState(next)
  }, [])

  const t = useCallback(
    (key, vars) => {
      const catalogue = messages[lang] || messages[DEFAULT_LANG]
      const value = catalogue[key] ?? messages[DEFAULT_LANG][key] ?? key
      return interpolate(value, vars)
    },
    [lang],
  )

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      translateError: (message) => translateError(message, lang),
      translateInsight: (text) => translateInsight(text, lang),
      localizeCategory: (category) => localizeCategory(category, lang),
    }),
    [lang, setLang, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export default LanguageProvider