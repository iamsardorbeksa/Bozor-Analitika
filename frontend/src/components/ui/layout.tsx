import { ChevronLeft, ChevronRight } from 'lucide-react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function PageHeader({ title, description, actions, eyebrow, className }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div>
        {eyebrow && <div className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-brand-600 uppercase">{eyebrow}</div>}
        <h1 className="text-[28px] leading-[1.08] font-extrabold tracking-[-0.035em] text-ink md:text-[34px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Counts up from 0 when scrolled into view. */
export function AnimatedNumber({ value, format = (v) => formatNumber(v), className, duration = 1.1 }: {
  value: number; format?: (v: number) => string; className?: string; duration?: number
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => format(v))
  React.useEffect(() => {
    if (!inView) return
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [inView, value, mv, duration])
  return <motion.span ref={ref} className={cn('tabular', className)}>{text}</motion.span>
}

export function StatCard({ label, value, hint, icon, tone = 'default', trend, className, delay = 0 }: {
  label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode
  tone?: 'default' | 'brand' | 'dark' | 'saffron'; trend?: React.ReactNode; className?: string; delay?: number
}) {
  const tones = {
    default: 'bg-white/[0.78] border-line backdrop-blur-xl',
    brand: 'bg-mint-50/90 border-[#ffd6c4]',
    dark: 'bg-ink border-ink text-white',
    saffron: 'bg-saffron-50/90 border-[#f0d7b6]',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group relative overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)] md:p-5', tones[tone], className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[13px] font-medium', tone === 'dark' ? 'text-white/70' : 'text-muted')}>{label}</p>
        {icon && <span className={cn('grid size-8 place-items-center rounded-lg [&_svg]:size-4', tone === 'dark' ? 'bg-white/10 text-brand' : 'bg-mint text-brand-600')}>{icon}</span>}
      </div>
      <div className="mt-3 font-mono text-[26px] leading-none font-bold tracking-[-0.03em] tabular">{value}</div>
      {(hint || trend) && (
        <div className={cn('mt-2.5 flex items-center gap-2 text-xs', tone === 'dark' ? 'text-white/60' : 'text-muted')}>{trend}{hint}</div>
      )}
    </motion.div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md', id = 'seg' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: 'sm' | 'md'; id?: string
}) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-full border border-line bg-ink/5 p-1', className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn('relative rounded-full font-semibold transition-colors', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            value === o.value ? 'text-white' : 'text-muted hover:text-ink')}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-ink shadow-[0_4px_14px_rgba(17,19,23,.2)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Pagination({ page, pages, total, pageSize, onChange }: { page: number; pages: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const { t } = useTranslation()
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted">
      <span className="tabular">{t('table.showing', { from, to, total })}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('actions.previous')}><ChevronLeft /></Button>
        <span className="min-w-[64px] text-center tabular">{page} / {pages}</span>
        <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t('actions.next')}><ChevronRight /></Button>
      </div>
    </div>
  )
}
