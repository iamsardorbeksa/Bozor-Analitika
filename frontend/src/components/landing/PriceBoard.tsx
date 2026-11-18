import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { Mover } from '@/api/types'
import { formatNumber, formatPct, ln } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Odometer-style number: each digit rolls when it changes. */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  const chars = value.split('')
  return (
    <span className={cn('inline-flex tabular', className)} aria-label={value}>
      {chars.map((ch, i) => (
        <span key={chars.length - i} className="relative inline-block h-[1.2em] overflow-hidden leading-[1.2em]" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={ch} className="inline-block"
              initial={{ y: '-105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '105%', opacity: 0 }}
              transition={{ duration: 0.45, delay: i * 0.035, ease: [0.2, 0.9, 0.25, 1] }}>
              {ch === ' ' || ch === ' ' ? ' ' : ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

const ROWS = 6

/**
 * Bazaar-style departure board. Rows flip through the real 7-day movers from
 * the demo dataset every few seconds.
 */
export function PriceBoard({ movers, className }: { movers: Mover[]; className?: string }) {
  const { t } = useTranslation('landing')
  const [page, setPage] = React.useState(0)
  const pages = Math.max(1, Math.ceil(movers.length / ROWS))
  React.useEffect(() => {
    if (pages < 2) return
    const id = setInterval(() => setPage((p) => (p + 1) % pages), 4200)
    return () => clearInterval(id)
  }, [pages])
  const rows = Array.from({ length: ROWS }, (_, i) => movers[(page * ROWS + i) % Math.max(movers.length, 1)])

  return (
    <div className={cn('relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-white/[0.82] shadow-[var(--shadow-lift)] backdrop-blur-xl', className)}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <p className="text-[13px] font-bold text-ink">{t('hero.boardTitle')}</p>
          <p className="text-[11px] text-muted">{t('hero.boardSub')}</p>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all duration-500', i === page ? 'w-5 bg-brand' : 'w-1.5 bg-ink/15')} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line px-2 py-1">
        {rows.map((m, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-[11px]">
            <span className="relative h-5 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={m?.slug ?? i} className="block truncate text-[14px] font-medium text-ink"
                  initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}>
                  {m ? ln(m, 'name') : '—'}
                  {m && <span className="ml-1.5 text-[11px] text-muted">/{t(`common:units.${m.unit}`, m.unit)}</span>}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="font-mono text-[17px] font-semibold text-ink">
              <RollingNumber value={m ? formatNumber(m.current_avg) : '—'} />
            </span>
            <span className={cn('w-[64px] rounded-full px-2 py-0.5 text-right font-mono text-[12px] font-semibold',
              !m ? 'text-muted' : m.change_pct > 0 ? 'bg-danger-50 text-up' : m.change_pct < 0 ? 'bg-good-50 text-down' : 'text-muted')}>
              {m ? formatPct(m.change_pct) : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[10.5px] text-muted">
        <span className="font-mono tracking-wider">UZS · 7D</span>
        <span className="rounded-full border border-dashed border-brand/50 px-2 font-mono text-brand-600">{t('hero.boardFoot')}</span>
      </div>
    </div>
  )
}

export function Ticker({ movers }: { movers: Mover[] }) {
  const { t } = useTranslation('landing')
  if (!movers.length) return null
  const items = [...movers, ...movers]
  return (
    <div className="relative overflow-hidden border-y border-line bg-white/70 py-3 text-[13px] backdrop-blur" aria-label={t('hero.boardTitle')}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white/90 to-transparent" />
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {items.map((m, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap text-muted">
            <span className="font-medium text-ink">{ln(m, 'name')}</span>
            <span className="font-mono font-semibold text-ink">{formatNumber(m.current_avg)}</span>
            <span className={cn('font-mono text-xs', m.change_pct > 0 ? 'text-up' : m.change_pct < 0 ? 'text-down' : 'text-muted')}>
              {m.change_pct > 0 ? '▲' : m.change_pct < 0 ? '▼' : '•'} {formatPct(m.change_pct)}
            </span>
            <span className="text-ink/15">/</span>
          </span>
        ))}
      </div>
    </div>
  )
}
