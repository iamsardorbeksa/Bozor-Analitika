import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <LogoMark size={44} className="mx-auto" />
        <p className="serif-italic mt-6 text-[96px] leading-none">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t('states.notFound')}</h1>
        <p className="mt-2 text-muted">{t('states.notFoundBody')}</p>
        <Button asChild className="mt-6"><Link to="/">{t('states.goHome')}</Link></Button>
      </div>
    </div>
  )
}
