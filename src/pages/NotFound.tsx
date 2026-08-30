import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/useTranslation'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-4xl font-semibold text-slate-700">404</p>
      <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-100">
        {t('notFound.title')}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {t('notFound.body')}
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base-900 transition-colors hover:bg-accent-soft"
      >
        {t('notFound.back')}
      </Link>
    </div>
  )
}
