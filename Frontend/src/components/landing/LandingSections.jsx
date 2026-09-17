import { useLanguage } from '../../context/LanguageContext'
import BudgetProgress from '../budgets/BudgetProgress'
import { formatCurrency } from '../../utils/format'
import Reveal from './Reveal'

function Eyebrow({ children }) {
  return (
    <p className="text-sm font-semibold tracking-wide text-primary">{children}</p>
  )
}

function SectionHeading({ id, eyebrow, title, sub }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-2 text-2xl font-bold tracking-tight text-balance text-base-content sm:text-3xl">
        {title}
      </h2>
      {sub ? <p className="mt-3 text-base leading-relaxed text-pretty text-base-content/70">{sub}</p> : null}
    </div>
  )
}

function FeatureIcon({ children }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-selector bg-primary/10 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  )
}

function WhySection() {
  const { t } = useLanguage()
  const items = [
    { title: t('landing.why1Title'), desc: t('landing.why1Desc') },
    { title: t('landing.why2Title'), desc: t('landing.why2Desc') },
    { title: t('landing.why3Title'), desc: t('landing.why3Desc') },
  ]
  return (
    <section id="why-fintrack" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-why-title">
      <Reveal className="relative z-8 mx-auto w-full max-w-6xl">
        <SectionHeading id="landing-why-title" eyebrow={t('landing.whyEyebrow')} title={t('landing.whyTitle')} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="card surface card-border min-w-0">
              <div className="card-body gap-2 p-5 sm:p-6">
                <h3 className="font-semibold text-base-content">{item.title}</h3>
                <p className="text-sm leading-relaxed text-base-content/70">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function FeaturesSection() {
  const { t } = useLanguage()
  const features = [
    {
      title: t('landing.featTxTitle'),
      desc: t('landing.featTxDesc'),
      icon: (<><path d="M3 12h14" /><path d="M13 6l6 6-6 6" /></>),
    },
    {
      title: t('landing.featAccTitle'),
      desc: t('landing.featAccDesc'),
      icon: (<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 10h18" /><path d="M7 15h4" /></>),
    },
    {
      title: t('landing.featBudTitle'),
      desc: t('landing.featBudDesc'),
      icon: (<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>),
    },
    {
      title: t('landing.featGoalTitle'),
      desc: t('landing.featGoalDesc'),
      icon: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
    },
    {
      title: t('landing.featRepTitle'),
      desc: t('landing.featRepDesc'),
      icon: (<><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>),
    },
    {
      title: t('landing.featRecTitle'),
      desc: t('landing.featRecDesc'),
      icon: (<><path d="M4 7V4m0 3h14a4 4 0 0 1 0 8H8" /><path d="M4 4h3m-3 3 3-3" /><path d="M20 17v3m0-3H6a4 4 0 0 1 0-8h10" /><path d="M20 20h-3m3-3-3 3" /></>),
    },
  ]
  return (
    <section id="features" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-features-title">
      <Reveal className="relative z-8 mx-auto w-full max-w-6xl">
        <SectionHeading
          id="landing-features-title"
          eyebrow={t('landing.featEyebrow')}
          title={t('landing.featTitle')}
          sub={t('landing.featSub')}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card surface card-border fintrack-lift min-w-0">
              <div className="card-body gap-3 p-5 sm:p-6">
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <h3 className="font-semibold text-base-content">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-base-content/70">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function HowItWorksSection() {
  const { t } = useLanguage()
  const steps = [
    { number: '01', title: t('landing.how1Title'), desc: t('landing.how1Desc') },
    { number: '02', title: t('landing.how2Title'), desc: t('landing.how2Desc') },
    { number: '03', title: t('landing.how3Title'), desc: t('landing.how3Desc') },
  ]
  return (
    <section id="how-it-works" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-how-title">
      <Reveal className="relative z-8 mx-auto w-full max-w-6xl">
      <SectionHeading id="landing-how-title" eyebrow={t('landing.howEyebrow')} title={t('landing.howTitle')} />
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.number} className="card surface card-border min-w-0">
            <div className="card-body gap-2 p-5 sm:p-6">
              <p className="text-sm font-bold tracking-widest text-primary tabular-nums" aria-hidden="true">{step.number}</p>
              <h3 className="font-semibold text-base-content">{step.title}</h3>
              <p className="text-sm leading-relaxed text-base-content/70">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      </Reveal>
    </section>
  )
}

function PlanningSection() {
  const { t } = useLanguage()
  return (
    <section id="budgets-goals" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-plan-title">
      <Reveal className="relative z-8 mx-auto w-full max-w-6xl">
        <SectionHeading
          id="landing-plan-title"
          eyebrow={t('landing.planEyebrow')}
          title={t('landing.planTitle')}
          sub={t('landing.planDesc')}
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="card surface card-border fintrack-lift min-w-0">
            <div className="card-body gap-3 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50">{t('landing.planBudgetLabel')}</p>
                  <h3 className="truncate font-semibold text-base-content">{t('landing.planFood')}</h3>
                  <p className="financial-value text-xs tabular-nums text-base-content/50">
                    {formatCurrency(1200000)} / {formatCurrency(1500000)}
                  </p>
                </div>
                <span className="badge badge-sm border-0 bg-warning/12 text-warning">
                  {t('status.nearLimit')}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
                <span className="text-base-content/70">
                  {t('bud.spent')}{' '}
                  <span className="financial-value font-semibold tabular-nums text-base-content">
                    {formatCurrency(1200000)}
                  </span>
                </span>
                <span className="text-base-content/70">
                  {t('bud.remaining')}{' '}
                  <span className="financial-value font-semibold tabular-nums text-base-content">
                    {formatCurrency(300000)}
                  </span>
                </span>
              </div>
              <BudgetProgress progress={80} status="Near Limit" />
            </div>
          </div>

          <div className="card surface card-border fintrack-lift min-w-0">
            <div className="card-body gap-3 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50">{t('landing.planGoalLabel')}</p>
                  <h3 className="truncate font-semibold text-base-content">{t('landing.planEmergency')}</h3>
                  <p className="financial-value text-xs tabular-nums text-base-content/50">
                    {formatCurrency(7000000)} / {formatCurrency(10000000)}
                  </p>
                </div>
                <span className="badge badge-sm border-0 bg-success/12 text-success">
                  {t('goal.statusInProgress')}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
                <span className="text-base-content/70">
                  {t('goal.colCurrent')}{' '}
                  <span className="financial-value font-semibold tabular-nums text-base-content">
                    {formatCurrency(7000000)}
                  </span>
                </span>
                <span className="text-base-content/70">
                  {t('goal.remaining')}{' '}
                  <span className="financial-value font-semibold tabular-nums text-base-content">
                    {formatCurrency(3000000)}
                  </span>
                </span>
              </div>
              <BudgetProgress progress={70} />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function ReportsSection() {
  const { t } = useLanguage()
  return (
    <section id="reports" className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center px-4 sm:px-6" aria-labelledby="landing-rep-title">
      <Reveal className="relative z-8 mx-auto w-full max-w-6xl">
      <SectionHeading
        id="landing-rep-title"
        eyebrow={t('landing.repEyebrow')}
        title={t('landing.repTitle')}
        sub={t('landing.repDesc')}
      />
      <div className="card surface card-border shadow-elevated fintrack-lift mx-auto mt-10 max-w-4xl min-w-0">
        <div className="card-body gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-base-content/70">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
              {t('common.income')}
            </span>
            <span className="flex items-center gap-2 text-base-content/70">
              <span className="h-2.5 w-2.5 rounded-full bg-error" aria-hidden="true" />
              {t('common.expense')}
            </span>
          </div>
          <svg
            viewBox="0 0 560 220"
            className="h-auto w-full"
            role="img"
            aria-label={t('landing.repChartAria')}
          >
            <g stroke="currentColor" opacity="0.12" aria-hidden="true">
              <line x1="0" y1="40" x2="560" y2="40" />
              <line x1="0" y1="90" x2="560" y2="90" />
              <line x1="0" y1="140" x2="560" y2="140" />
              <line x1="0" y1="190" x2="560" y2="190" />
            </g>
            <path
              d="M0 150 C60 140 90 100 140 105 C190 110 210 70 260 75 C310 80 330 110 380 95 C430 80 470 45 560 40 L560 220 L0 220 Z"
              fill="currentColor"
              opacity="0.08"
              className="text-primary"
              aria-hidden="true"
            />
            <path
              d="M0 150 C60 140 90 100 140 105 C190 110 210 70 260 75 C310 80 330 110 380 95 C430 80 470 45 560 40"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-primary"
              aria-hidden="true"
            />
            <path
              d="M0 175 C60 170 100 150 150 155 C200 160 230 130 280 135 C330 140 360 160 410 150 C460 140 510 125 560 120"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1 6"
              className="stroke-error"
              aria-hidden="true"
            />
          </svg>
        </div>
      </div>
      </Reveal>
    </section>
  )
}

function LandingSections() {
  return (
    <>
      <WhySection />
      <FeaturesSection />
      <HowItWorksSection />
      <PlanningSection />
      <ReportsSection />
    </>
  )
}

export default LandingSections
