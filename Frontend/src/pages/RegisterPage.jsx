import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import GoogleSignInButton from '../components/common/GoogleSignInButton'

function registerErrorMessage(error, t) {
  const message = String((error && error.message) || '').toLowerCase()
  if (error && error.status === 429 || message.includes('rate limit')) {
    return t('auth.registerRateLimited')
  }
  if (
    (error && error.code === 'user_already_exists') ||
    message.includes('already been registered') ||
    message.includes('already registered')
  ) {
    return t('auth.registerEmailTaken')
  }
  if (
    error instanceof TypeError ||
    message.includes('failed to fetch') ||
    message.includes('network request failed')
  ) {
    return t('auth.registerNetworkError')
  }
  return t('auth.registerError')
}

function RegisterPage() {
  const { register } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [verifyPending, setVerifyPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setSubmitting(true)
    try {
      const data = await register(email, password, name)
      if (data && data.session) {
        navigate('/')
      } else {
        setVerifyPending(true)
      }
    } catch (error) {
      setError(registerErrorMessage(error, t))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (verifyPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4">
        <div className="card w-full max-w-sm bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <h1 className="card-title text-2xl">{t('auth.registerVerifyTitle')}</h1>
              <p className="text-base-content/60">
                {t('auth.registerSuccess')} {t('auth.registerVerify')}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/login" className="btn btn-primary w-full">
                {t('auth.loginLink')}
              </Link>
              <button
                type="button"
                className="btn btn-outline w-full"
                onClick={() => {
                  setVerifyPending(false)
                  setError('')
                  setEmail('')
                  setPassword('')
                }}
              >
                {t('auth.tryAnotherEmail')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-md">
        <div className="card-body">
          <h1 className="card-title text-2xl">{t('auth.registerTitle')}</h1>
          <p className="text-base-content/60 mb-2">{t('auth.registerSubtitle')}</p>

          {error && (
            <div role="alert" className="alert alert-error mb-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="floating-label">
              <span>{t('auth.name')}</span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>

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
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={submitting}
            >
              {submitting ? t('auth.registering') : t('auth.registerButton')}
            </button>
          </form>

          <div className="divider text-sm mt-4">{t('auth.or')}</div>

          <GoogleSignInButton />

          <div className="divider text-sm">{t('auth.hasAccount')}</div>

          <Link to="/login" className="btn btn-outline btn-primary w-full">
            {t('auth.loginLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage