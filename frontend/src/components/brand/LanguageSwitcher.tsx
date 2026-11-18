import { ChevronDown, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { LANGS } from '@/i18n'
import { cn } from '@/lib/utils'

/** BuyAI language pill: white round pill with the short code and a chevron. */
export function LanguageSwitcher({ dark, className }: { dark?: boolean; className?: string }) {
  const { i18n, t } = useTranslation()
  const { user, setUser } = useAuth()
  const current = LANGS.find((l) => l.code === i18n.resolvedLanguage) ?? LANGS[0]

  const change = (code: 'uz' | 'ru' | 'en') => {
    void i18n.changeLanguage(code)
    if (user && user.language !== code) Api.updateMe({ language: code }).then(setUser).catch(() => {})
  }

  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={t('lang.label')}
        className={cn('inline-flex h-[38px] items-center gap-1 rounded-full border pr-2.5 pl-3 text-[13px] font-bold transition-colors',
          dark ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-line bg-white text-ink hover:border-line-strong', className)}>
        <Globe className="size-3.5 opacity-60 max-sm:hidden" />
        <span className="tracking-wide">{current.short}</span>
        <ChevronDown className="size-3.5" strokeWidth={2.4} />
      </DropdownTrigger>
      <DropdownContent className="min-w-[160px]">
        {LANGS.map((l) => (
          <DropdownItem key={l.code} onSelect={() => change(l.code)} className={cn('justify-between', l.code === current.code && 'bg-ink/5 text-ink')}>
            {l.label}<span className="font-mono text-[11px] font-bold text-muted">{l.short}</span>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}
