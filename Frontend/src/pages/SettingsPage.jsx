import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../context/LanguageContext'
import { getSupabase } from '../lib/supabaseClient'
import { resetMyData } from '../services/userApi'
import { confirmGoogleIdentity, isGoogleUser } from '../utils/googleReauth'
import { EyeIcon, EyeOffIcon } from '../components/common/Icons'
import { LANGUAGES } from '../l10n/messages'

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'set.optionSystem', descriptionKey: 'set.optionSystemDesc' },
  { value: 'light', labelKey: 'set.optionLight', descriptionKey: 'set.optionLightDesc' },
  { value: 'dark', labelKey: 'set.optionDark', descriptionKey: 'set.optionDarkDesc' },
]

function changePasswordErrorMessage(error, t) {
  const message = String((error && error.message) || '')
  if (error instanceof TypeError || /failed to fetch|network request failed/i.test(message)) {
    return t('auth.changePasswordNetworkError')
  }
  if ((error && error.status === 429) || /too many requests|rate limit/i.test(message)) {
    return t('auth.changePasswordRateLimited')
  }
  if ((error && error.code === 'weak_password') || /at least 6 characters|too weak|password should/i.test(message)) {
    return t('auth.changePasswordWeak')
  }
  if (/session/i.test(message)) {
    return t('auth.changePasswordNoSession')
  }
  return t('auth.changePasswordError')
}

function initialPasswordForm() {
  return { newPassword: '', confirmPassword: '' }
}

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="floating-label relative" htmlFor={id}>
        <span>{label}</span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`input input-bordered w-full pr-12 ${error ? 'input-error' : ''}`}
          value={value}
          onChange={onChange}
          minLength={6}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:text-base-content"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </label>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
    </div>
  )
}

function SettingsPage() {
  const toast = useToast()
  const { t, lang, setLang } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, changeTheme] = useTheme()

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [passwordError, setPasswordError] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const [resetStep, setResetStep] = useState(null)
  const [resetSecret, setResetSecret] = useState('')
  const [resetError, setResetError] = useState('')
  const [submittingReset, setSubmittingReset] = useState(false)

  const provider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || 'email'
  const canChangePassword = provider === 'email'
  const googleUser = isGoogleUser(user)

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

  function setPasswordField(name, value) {
    setPasswordForm((current) => ({ ...current, [name]: value }))
    setPasswordFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handlePasswordResetConfirm() {
    if (submittingReset || resetSecret.trim() === '') return
    setResetError('')
    setSubmittingReset(true)
    try {
      if (!user?.email) {
        setResetError(t('set.resetFailed'))
        return
      }
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: resetSecret,
      })
      if (error) {
        setResetError(t('set.wrongPassword'))
        return
      }
      await resetMyData()
      setResetSecret('')
      setResetStep('done')
    } catch {
      setResetError(t('set.resetFailed'))
    } finally {
      setSubmittingReset(false)
    }
  }

  async function handleGoogleResetConfirm() {
    if (submittingReset) return
    setResetError('')
    setSubmittingReset(true)
    let result
    try {
      result = await confirmGoogleIdentity(getSupabase(), user)
    } catch (err) {
      setResetError(err?.message === 'resetPopupBlocked' ? t('set.googlePopupBlocked') : t('set.googleReauthFail'))
      return
    } finally {
      setSubmittingReset(false)
    }

    if (result !== 'confirmed') {
      setResetError(result === 'mismatch' ? t('set.googleReauthMismatch') : t('set.googleReauthFail'))
      return
    }

    setSubmittingReset(true)
    try {
      await resetMyData()
      setResetStep('done')
    } catch {
      setResetError(t('set.resetFailed'))
    } finally {
      setSubmittingReset(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError('')
    const next = {}
    if (!passwordForm.newPassword) {
      next.newPassword = t('auth.passwordRequired')
    } else if (passwordForm.newPassword.length < 6) {
      next.newPassword = t('auth.passwordMin')
    }
    if (!passwordForm.confirmPassword) {
      next.confirmPassword = t('auth.confirmPasswordRequired')
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      next.confirmPassword = t('auth.passwordMismatch')
    }
    setPasswordFieldErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmittingPassword(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPasswordError(t('auth.changePasswordNoSession'))
        return
      }
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) {
        setPasswordError(changePasswordErrorMessage(error, t))
        return
      }
      toast.success(t('auth.passwordChanged'))
      setPasswordForm(initialPasswordForm())
      setPasswordFieldErrors({})
    } catch (err) {
      setPasswordError(changePasswordErrorMessage(err, t))
    } finally {
      setSubmittingPassword(false)
    }
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

      <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('set.securityTitle')}</h2>
          <p className="text-sm text-base-content/60">{t('set.securityDesc')}</p>
          {canChangePassword ? (
            <form onSubmit={handleChangePassword} className="mt-2 flex max-w-md flex-col gap-3">
              {passwordError ? (
                <div role="alert" className="alert alert-error text-sm">
                  <span>{passwordError}</span>
                </div>
              ) : null}
              <PasswordField
                id="new-password"
                label={t('auth.newPassword')}
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordField('newPassword', event.target.value)}
                error={passwordFieldErrors.newPassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label={t('auth.confirmPassword')}
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                error={passwordFieldErrors.confirmPassword}
                autoComplete="new-password"
              />
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingPassword}
                >
                  {submittingPassword ? <span className="loading loading-spinner loading-sm" /> : null}
                  {submittingPassword ? t('auth.changingPassword') : t('auth.changePasswordButton')}
                </button>
              </div>
            </form>
          ) : (
            <div role="note" className="mt-1 text-sm text-base-content/70">
              {t('auth.googlePasswordNotAvailable')}
            </div>
          )}
        </div>
      </div>

      <div className="card surface card-border border-error/30">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold text-error">{t('set.dangerTitle')}</h2>
          <p className="text-sm text-base-content/60">{t('set.dangerDesc')}</p>
          <div>
            <button
              type="button"
              className="btn btn-error mt-2"
              onClick={() => {
                setResetSecret('')
                setResetError('')
                setResetStep('warn')
              }}
            >
              {t('set.deleteAllData')}
            </button>
          </div>
        </div>
      </div>

            <div className="card surface card-border">
        <div className="card-body">
          <h2 className="card-title text-base font-semibold">{t('auth.logoutTitle')}</h2>
          <p className="text-sm text-base-content/60">{t('auth.logoutDesc')}</p>
          <button
            className="btn btn-outline btn-error mt-2"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
          >
            {t('auth.logoutButton')}
          </button>
        </div>
      </div>

      {resetStep ? (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md rounded-box">
            {resetStep === 'warn' ? (
              <>
                <h3 className="text-lg font-bold text-error">{t('set.deleteAllDataTitle')}</h3>
                <p className="mt-2 text-sm text-base-content/80">{t('set.deleteAllDataMsg')}</p>
                <div className="modal-action">
                  <button type="button" className="btn" onClick={() => setResetStep(null)}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-error"
                    onClick={() => {
                      setResetSecret('')
                      setResetError('')
                      setResetStep('confirm')
                    }}
                  >
                    {t('set.deleteAllData')}
                  </button>
                </div>
              </>
            ) : resetStep === 'confirm' ? (
              <>
                <h3 className="text-lg font-bold text-error">{t('set.deleteAllDataConfirmTitle')}</h3>
                <p className="mt-2 text-sm text-base-content/80">{t('set.deleteAllDataConfirmDesc')}</p>
                {resetError ? (
                  <div role="alert" className="alert alert-error mt-3 text-sm">
                    <span>{resetError}</span>
                  </div>
                ) : null}
                {canChangePassword ? (
                  <div className="mt-3">
                    <PasswordField
                      id="reset-password"
                      label={t('auth.password')}
                      value={resetSecret}
                      onChange={(event) => {
                        setResetSecret(event.target.value)
                        setResetError('')
                      }}
                      autoComplete="current-password"
                    />
                    <p className="mt-1 text-xs text-base-content/60">{t('set.deleteAllDataPasswordLabel')}</p>
                  </div>
                ) : googleUser ? (
                  <div className="mt-3">
                    <p className="text-sm text-base-content/70">{t('set.googleConfirmDesc')}</p>
                    <button
                      type="button"
                      className="btn btn-error mt-2 w-full"
                      disabled={submittingReset}
                      onClick={handleGoogleResetConfirm}
                    >
                      {submittingReset ? <span className="loading loading-spinner loading-sm" /> : null}
                      {submittingReset ? t('set.googleConfirming') : t('set.googleConfirmButton')}
                    </button>
                  </div>
                ) : (
                  <div role="note" className="mt-3 text-sm text-base-content/70">
                    {t('set.resetFailed')}
                  </div>
                )}
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setResetStep(null)}
                    disabled={submittingReset}
                  >
                    {t('common.cancel')}
                  </button>
                  {canChangePassword ? (
                    <button
                      type="button"
                      className="btn btn-error"
                      disabled={resetSecret.trim() === '' || submittingReset}
                      onClick={handlePasswordResetConfirm}
                    >
                      {submittingReset ? <span className="loading loading-spinner loading-sm" /> : null}
                      {t('set.deleteAllDataButton')}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-success">{t('set.resetDoneTitle')}</h3>
                <p className="mt-2 text-sm text-base-content/80">{t('set.resetDoneMsg')}</p>
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setResetStep(null)
                      navigate('/')
                      window.location.reload()
                    }}
                  >
                    {t('set.resetDoneButton')}
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label={t('common.closeDialog')}
            onClick={() => {
              if (!submittingReset) setResetStep(null)
            }}
          />
        </dialog>
      ) : null}
    </div>
  )
}

export default SettingsPage