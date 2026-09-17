import { useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import Reveal from './Reveal'

const CONTACT_EMAIL = 'auni4040@gmail.com'
const MESSAGE_MIN = 10
const MESSAGE_MAX = 2000

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function ContactSection() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [opened, setOpened] = useState(false)
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const messageRef = useRef(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = t('landing.contactErrName')
    if (!isValidEmail(email.trim())) nextErrors.email = t('landing.contactErrEmail')
    if (message.trim().length < MESSAGE_MIN) nextErrors.message = t('landing.contactErrMessage')
    else if (message.trim().length > MESSAGE_MAX) nextErrors.message = t('landing.contactErrMessageLong')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const first = nextErrors.name ? nameRef : nextErrors.email ? emailRef : messageRef
      first.current?.focus()
      return
    }

    const subject = encodeURIComponent(`[FinTrack] Message from ${name.trim()}`)
    const body = encodeURIComponent(`${message.trim()}\n\n— ${name.trim()} (${email.trim()})`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setOpened(true)
  }

  const inputClass = (hasError) =>
    `input input-bordered w-full ${hasError ? 'input-error' : ''}`

  return (
    <section id="contact" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-contact-title">
      <Reveal className="relative z-8 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wide text-primary">{t('landing.contactEyebrow')}</p>
          <h2 id="landing-contact-title" className="mt-2 text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
            {t('landing.contactTitle')}
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-pretty text-base-content/70">
            {t('landing.contactSub')}
          </p>
          <p className="mt-4 text-sm text-base-content/60">
            {t('landing.contactDirect')}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="link link-primary font-medium">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="card surface card-border shadow-elevated min-w-0">
          <form className="card-body gap-4 p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
            {opened && (
              <div role="status" className="alert alert-info">
                <span>{t('landing.contactOpened')}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-base-content" htmlFor="contact-name">
                {t('auth.name')} <span className="text-error" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-name"
                ref={nameRef}
                type="text"
                autoComplete="name"
                className={inputClass(errors.name)}
                placeholder={t('landing.contactNamePh')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="contact-name-error" role="alert" className="mt-1 text-xs text-error">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-base-content" htmlFor="contact-email">
                {t('auth.email')} <span className="text-error" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                className={inputClass(errors.email)}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'contact-email-error' : undefined}
                required
              />
              {errors.email && (
                <p id="contact-email-error" role="alert" className="mt-1 text-xs text-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-base-content" htmlFor="contact-message">
                {t('landing.contactMessage')} <span className="text-error" aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                ref={messageRef}
                className={`textarea textarea-bordered w-full ${errors.message ? 'textarea-error' : ''}`}
                rows={5}
                maxLength={MESSAGE_MAX}
                placeholder={t('landing.contactMessagePh')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                required
              />
              {errors.message && (
                <p id="contact-message-error" role="alert" className="mt-1 text-xs text-error">
                  {errors.message}
                </p>
              )}
            </div>

            <div>
              <button type="submit" className="btn btn-primary fintrack-cta w-full sm:w-auto">
                {t('landing.contactSend')}
              </button>
              <p className="mt-3 text-xs leading-relaxed text-base-content/50">
                {t('landing.contactMailtoNote')}
              </p>
            </div>
          </form>
        </div>
      </Reveal>
    </section>
  )
}

export default ContactSection
