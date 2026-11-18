/* Building blocks shared by the seller (and admin) workspace pages. */
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplyDemand } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, Tooltip } from '@/components/ui/primitives'
import { Badge } from '@/components/market'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export const EASE = [0.16, 1, 0.3, 1] as const

/** Fade/slide-in wrapper with a stagger index. */
export function Reveal({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 14) * 0.04, duration: 0.4, ease: EASE }} className={className}>
      {children}
    </motion.div>
  )
}

/** Card with a compact header row — the standard dashboard panel. */
export function Panel({ title, description, actions, children, className, bodyClassName, i = 0 }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode
  className?: string; bodyClassName?: string; i?: number
}) {
  return (
    <Reveal i={i} className={cn('flex flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)]', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className={cn('flex-1 px-5 pb-5', bodyClassName)}>{children}</div>
    </Reveal>
  )
}

/** Small uppercase label used above numbers / groups. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-[11px] font-medium tracking-[0.06em] text-muted uppercase', className)}>{children}</div>
}

/** Confirmation dialog for destructive or important actions. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, loading, tone = 'danger', children, disabled }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode
  confirmLabel: React.ReactNode; onConfirm: () => void; loading?: boolean; tone?: 'danger' | 'primary'; children?: React.ReactNode; disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {children}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} disabled={disabled} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Horizontal market range: min ─── avg ─── max, with the seller's price as a marker.
 * Values outside the range are clamped to the ends and flagged.
 */
export function RangeBar({ min, max, avg, value, className, showLabels = true }: {
  min: number | null; max: number | null; avg: number | null; value: number; className?: string; showLabels?: boolean
}) {
  const { t } = useTranslation('seller')
  if (min == null || max == null) {
    return <div className={cn('text-xs text-muted', className)}>{t('range.noMarket')}</div>
  }
  const lo = Math.min(min, value), hi = Math.max(max, value)
  const span = hi - lo || 1
  const pos = (v: number) => ((v - lo) / span) * 100
  const tone = avg == null ? 'bg-ink' : value <= min ? 'bg-good' : value <= avg ? 'bg-good/70' : 'bg-saffron'
  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-6">
        <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-ink/[0.06]" />
        <motion.div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-mint"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: EASE }}
          style={{ left: `${pos(min)}%`, width: `${pos(max) - pos(min)}%`, transformOrigin: 'left' }} />
        {avg != null && (
          <Tooltip content={`${t('range.avg')}: ${formatNumber(avg)}`}>
            <span className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-ink-soft/60" style={{ left: `${pos(avg)}%` }} />
          </Tooltip>
        )}
        <Tooltip content={`${t('range.you')}: ${formatNumber(value)}`}>
          <motion.span initial={{ left: '0%', opacity: 0 }} animate={{ left: `${pos(value)}%`, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}
            className={cn('absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-white shadow', tone)} />
        </Tooltip>
      </div>
      {showLabels && (
        <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-muted tabular">
          <span>{formatNumber(min)}</span>
          {avg != null && <span className="text-ink-soft">⌀ {formatNumber(avg)}</span>}
          <span>{formatNumber(max)}</span>
        </div>
      )}
    </div>
  )
}

export function PositionBadge({ position }: { position: 'cheapest' | 'below_avg' | 'above_avg' }) {
  const { t } = useTranslation('seller')
  const tone = { cheapest: 'dark', below_avg: 'brand', above_avg: 'saffron' } as const
  return <Badge tone={tone[position]}>{t(`position.${position}`)}</Badge>
}

type Est = SupplyDemand['estimated']
export function SignalBadge({ signal }: { signal: Est['signal'] }) {
  const { t } = useTranslation('seller')
  const tone = { demand_gap: 'danger', undersupplied: 'saffron', oversupplied: 'info', balanced: 'brand' } as const
  return <Badge tone={tone[signal]}>{t(`signal.${signal}`)}</Badge>
}

export function SupplyLevel({ level }: { level: Est['supply_level'] }) {
  const { t } = useTranslation('seller')
  const n = { none: 0, low: 1, medium: 2, high: 3 }[level]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={cn('w-[3px] rounded-sm', i < n ? 'bg-brand' : 'bg-line-strong')} style={{ height: 5 + i * 3 }} />)}
      </span>
      {t(`supply.${level}`)}
    </span>
  )
}

/** 0–100 estimated interest meter (clearly an index, not a measurement). */
export function InterestMeter({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
        <motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.7, ease: EASE }} />
      </div>
      <span className="w-7 text-right font-mono text-xs tabular text-ink-soft">{Math.round(v)}</span>
    </div>
  )
}

/** Notice that estimated indicators are derived from platform activity only. */
export function EstimateNote({ className }: { className?: string }) {
  const { t } = useTranslation('seller')
  return (
    <p className={cn('rounded-lg border border-dashed border-[#e0a868] bg-saffron-50/70 px-3 py-2 text-xs leading-relaxed text-[#8a4a00]', className)}>
      {t('estimate.disclaimer')}
    </p>
  )
}

/** Horizontal bar list: label + value with proportional bar. */
export function BarList({ rows, format = (v) => formatNumber(v), color = 'bg-brand', className }: {
  rows: { key: string; label: React.ReactNode; value: number; sub?: React.ReactNode }[]
  format?: (v: number) => string; color?: string; className?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className={cn('space-y-2.5', className)}>
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink-soft">{r.label}</span>
            <span className="shrink-0 font-mono text-[12.5px] font-medium tabular">{format(r.value)}{r.sub && <span className="ml-1.5 font-sans text-muted">{r.sub}</span>}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.6, ease: EASE }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
