import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'

function NotFoundPage() {
  return (
    <div>
      <PageHeader title="404" subtitle="The page you are looking for does not exist." />
      <Link to="/" className="btn btn-primary btn-sm">
        Back to Dashboard
      </Link>
    </div>
  )
}

export default NotFoundPage