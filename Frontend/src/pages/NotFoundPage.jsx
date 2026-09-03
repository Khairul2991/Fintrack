import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useLanguage } from '../context/LanguageContext'

function NotFoundPage() {
  const { t } = useLanguage()
  return (
    <div>
      <PageHeader title={t('nf.title')} subtitle={t('nf.subtitle')} />
      <Link to="/" className="btn btn-primary btn-sm">
        {t('nf.back')}
      </Link>
    </div>
  )
}

export default NotFoundPage