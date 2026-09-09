import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { ArrowRightIcon } from './Icons'

function BackLink({ to }) {
  const { t } = useLanguage()
  return (
    <Link
      to={to}
      aria-label={t('common.back')}
      className="-ml-2 inline-flex items-center gap-1 text-sm font-medium text-base-content/70 transition hover:text-base-content"
    >
      <ArrowRightIcon className="h-4 w-4 rotate-180" aria-hidden="true" />
      {t('common.back')}
    </Link>
  )
}

export default BackLink