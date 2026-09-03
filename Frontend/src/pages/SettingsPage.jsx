import PageHeader from '../components/layout/PageHeader'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../context/LanguageContext'
import { LANGUAGES } from '../l10n/messages'

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'set.optionSystem', descriptionKey: 'set.optionSystemDesc' },
  { value: 'light', labelKey: 'set.optionLight', descriptionKey: 'set.optionLightDesc' },
  { value: 'dark', labelKey: 'set.optionDark', descriptionKey: 'set.optionDarkDesc' },
]

function SettingsPage() {
  const toast = useToast()
  const { t, lang, setLang } = useLanguage()
  const [theme, changeTheme] = useTheme()

  function handleThemeChange(value) {
    if (value === theme) return
    changeTheme(value)
    toast.success(t('set.themeUpdated'))
  }

  function handleLanguageChange(value) {
    if (value === lang) return
    setLang(value)
    toast.success(t('set.languageUpdated'))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('set.title')} subtitle={t('set.subtitle')} />

      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('set.theme')}</h2>
          <p className="text-sm text-base-content/60">{t('set.themeDesc')}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`btn btn-outline w-full sm:w-40 flex-col items-start gap-0 p-3 h-auto ${
                  theme === option.value ? 'btn-primary' : ''
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  checked={theme === option.value}
                  onChange={() => handleThemeChange(option.value)}
                />
                <span className="text-sm font-semibold">{t(option.labelKey)}</span>
                <span className="text-xs font-normal opacity-70">{t(option.descriptionKey)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('set.language')}</h2>
          <p className="text-sm text-base-content/60">{t('set.languageDesc')}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {LANGUAGES.map((language) => (
              <label
                key={language.value}
                className={`btn btn-outline flex-1 sm:flex-none ${
                  lang === language.value ? 'btn-primary' : ''
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  className="sr-only"
                  checked={lang === language.value}
                  onChange={() => handleLanguageChange(language.value)}
                />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('set.currency')}</h2>
          <p className="text-sm text-base-content/60">{t('set.currencyDesc')}</p>
          <p className="text-sm font-semibold tabular-nums">{t('set.currencyExample')}</p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage