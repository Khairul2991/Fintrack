import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import GoogleSignInButton from '../components/common/GoogleSignInButton'
import { BrandMark } from '../layouts/Sidebar'
import { ArrowRightIcon } from '../components/common/Icons'

function BackIcon() {
  const { t } = useLanguage()
  return (
    <Link
      to="/"
      aria-label={t('landing.backToFintrack')}
      className="btn btn-ghost btn-square self-start"
    >
      <ArrowRightIcon className="h-5 w-5 rotate-180" />
    </Link>
  )
}

function Branding() {
  return (
    <div className="flex justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-content">
        <BrandMark className="h-6 w-6" />
      </span>
    </div>
  )
}

function loginErrorMessage(error, t) {
  const message = String((error && error.message) || '').toLowerCase()
  if (error instanceof TypeError || message.includes('failed to fetch') || message.includes('network request failed')) {
    return t('auth.loginNetworkError')
  }
  if ((error && error.status === 429) || message.includes('rate limit') || message.includes('too many')) {
    return t('auth.loginRateLimited')
  }
  if (message.includes('email not confirmed')) {
    return t('auth.loginEmailNotConfirmed')
  }
  return t('auth.loginError')
}

function LoginPage() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(loginErrorMessage(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-8">
      <div className="card w-full max-w-sm bg-base-100 shadow-md">
        <div className="card-body gap-1.5 p-5 sm:p-6">
          <BackIcon />

          <Branding />

          <h1 className="card-title mt-1 justify-center text-2xl">{t('auth.loginTitle')}</h1>
          <p className="text-base-content/60 mb-1 text-center">{t('auth.loginSubtitle')}</p>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <label className="floating-label">
              <span>{t('auth.email')} <span className="text-error">*</span></span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="floating-label">
              <span>{t('auth.password')} <span className="text-error">*</span></span>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary mt-1"
              disabled={submitting}
            >
              {submitting ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <div className="divider text-sm my-1.5">{t('auth.or')}</div>

          <GoogleSignInButton />

          <div className="divider text-sm my-1.5">{t('auth.noAccount')}</div>

          <Link to="/register" className="btn btn-outline btn-primary w-full">
            {t('auth.registerLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
