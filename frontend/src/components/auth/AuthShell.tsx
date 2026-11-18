import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import { Background } from '@/components/brand/Background'
import { LanguageSwitcher } from '@/components/brand/LanguageSwitcher'
import { Logo } from '@/components/brand/Logo'
import { RollingNumber } from '@/components/landing/PriceBoard'
import { formatNumber, formatPct, ln } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductSymbol } from '@/components/market'

/** Split-screen frame for login / register / reset: form on the left, live market panel on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('auth')
  const { data } = useQuery({ queryKey: ['overview'], queryFn: Api.overview, staleTime: 60_000 })
  const movers = data?.movers ?? []
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (movers.length < 2) return
    const id = setInterval(() => setI((x) => (x + 1) % movers.length), 2600)
    return () => clearInterval(id)
  }, [movers.length])
  const m = movers[i]
  const points = t('side.points', { returnObjects: true }) as string[]

  return (
    <div className="relative grid min-h-screen gap-4 p-3 md:p-4 lg:grid-cols-[1fr_1.05fr]">
      <Background />
      <div className="flex flex-col rounded-[28px] border border-white/80 bg-white/[0.82] px-5 py-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[420px]">
            {children}
          </motion.div>
        </div>
      </div>

      <div className="glass-panel hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="relative">
          <span className="kicker"><span className="size-2 rounded-full bg-brand animate-pulse-dot" />Bozor·Analitika</span>
          <h2 className="headline mt-5 max-w-md text-[44px] text-ink">
            {t('side.title')}<span className="serif-italic mt-1 block">{t('side.titleAccent')}</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((p, k) => (
              <motion.li key={p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.1 }} className="flex items-center gap-3 text-ink-soft">
                <span className="grid size-5 place-items-center rounded-full bg-good-50 text-good"><Check className="size-3" strokeWidth={3} /></span>{p}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-mono tracking-wider">UZS · 7D</span>
          </div>
          <div className="mt-3 flex h-6 items-center gap-2 text-[15px] font-semibold text-ink">{m && <ProductSymbol emoji={m.emoji} size={18} />}{m ? ln(m, 'name') : '—'}</div>
          <div className="mt-1 flex items-end justify-between">
            <span className="font-mono text-[34px] leading-none font-bold tracking-[-0.03em] text-ink"><RollingNumber value={m ? formatNumber(m.current_avg) : '—'} /></span>
            <span className={cn('font-mono text-sm font-bold', !m ? '' : m.change_pct > 0 ? 'text-up' : 'text-down')}>{m ? formatPct(m.change_pct) : ''}</span>
          </div>
        </div>

        <blockquote className="relative max-w-md">
          <p className="text-[22px] leading-snug font-light tracking-[-0.02em] text-ink">“{t('side.quote')}”</p>
          <footer className="mt-3 text-sm text-muted">— {t('side.quoteBy')}</footer>
        </blockquote>
      </div>
    </div>
  )
}
