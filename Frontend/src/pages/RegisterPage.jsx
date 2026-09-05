import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

function RegisterPage() {
  const { register } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(email, password, name)
      navigate('/')
    } catch (err) {
      setError(err.message || t('auth.registerError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-md">
        <div className="card-body">
          <h1 className="card-title text-2xl">{t('auth.registerTitle')}</h1>
          <p className="text-base-content/60 mb-2">{t('auth.registerSubtitle')}</p>

          {error && (
            <div className="alert alert-error mb-2">
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
              <span>{t('auth.email')}</span>
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
              <span>{t('auth.password')}</span>
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
