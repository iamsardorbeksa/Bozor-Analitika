/* Domain components shared across buyer / seller / admin pages. */
import {
  Apple, ArrowDownRight, ArrowUpRight, BadgeCheck, Beef, BrickWall, Clock, Cpu, CupSoda, Flame, Minus, Nut, Package, Shirt,
  ShoppingBasket, SprayCan, Truck, Wheat, Carrot, Globe,
} from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { Offer, Quality, VerificationStatus } from '@/api/types'
import { Tooltip } from '@/components/ui/primitives'
import { formatNumber, formatPct, formatUZS, freshness, ln, timeAgo, currencyLabel } from '@/lib/format'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------- category look
export const CATEGORY_STYLE: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; fg: string; accent: string }> = {
  vegetables: { icon: Carrot, bg: '#e6f3ed', fg: '#12855a', accent: '#1f9e6d' },
  fruits: { icon: Apple, bg: '#fdeee4', fg: '#c2562b', accent: '#ef8a4c' },
  grains: { icon: Wheat, bg: '#fbf2dc', fg: '#a8741a', accent: '#e5a13a' },
  'meat-dairy': { icon: Beef, bg: '#fbe9e9', fg: '#b44545', accent: '#d95757' },
  construction: { icon: BrickWall, bg: '#ecebe7', fg: '#5b5a52', accent: '#8a877a' },
  textiles: { icon: Shirt, bg: '#ece9f8', fg: '#5b4bb0', accent: '#7f6fd6' },
  electronics: { icon: Cpu, bg: '#e4eef8', fg: '#3b5bdb', accent: '#4c8fd0' },
  other: { icon: Package, bg: '#eef0f3', fg: '#3c414b', accent: '#5d6370' },
  'dried-fruits-nuts': { icon: Nut, bg: '#f6ece0', fg: '#8a5a2b', accent: '#b9824a' },
  'oils-grocery': { icon: ShoppingBasket, bg: '#fbf4d9', fg: '#8c6d12', accent: '#d1a32a' },
  beverages: { icon: CupSoda, bg: '#e2f1f4', fg: '#24727f', accent: '#3aa0b0' },
  spices: { icon: Flame, bg: '#fbe8dc', fg: '#b04a1c', accent: '#e0703a' },
  household: { icon: SprayCan, bg: '#e8eef6', fg: '#3e5f8a', accent: '#6a8fbf' },
}
export const catStyle = (slug?: string | null) => CATEGORY_STYLE[slug ?? 'other'] ?? CATEGORY_STYLE.other

/**
 * Product tile: the product's own symbol (emoji, rendered with the platform colour-emoji font for a
 * consistent look on every OS) on a tint of its category colour. Falls back to the
 * category icon when a product has no symbol, and to the photo when one was uploaded.
 */
export function ProductGlyph({ category, name, image, emoji, size = 44, className }: {
  category?: string | null; name?: string; image?: string | null; emoji?: string | null; size?: number; className?: string
}) {
  const s = catStyle(category)
  const Icon = s.icon
  if (image) return <img src={image} alt={name ?? ''} className={cn('shrink-0 rounded-xl object-cover', className)} style={{ width: size, height: size }} loading="lazy" />
  if (emoji)
    return (
      <div className={cn('grid shrink-0 place-items-center rounded-xl', className)} style={{ width: size, height: size, background: s.bg }} role="img" aria-label={name ?? ''}>
        <span className="emoji leading-none select-none" style={{ fontSize: Math.round(size * 0.56) }} aria-hidden>{emoji}</span>
      </div>
    )
  return (
    <div className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-xl', className)} style={{ width: size, height: size, background: s.bg, color: s.fg }} aria-hidden>
      <Icon className="relative z-10" />
      <span className="absolute -right-1 -bottom-2 text-[1.9em] leading-none font-extrabold opacity-[0.12]" style={{ fontSize: size * 0.7 }}>{name?.[0]}</span>
    </div>
  )
}

/** Small inline product symbol shown before a product name in lists and tables. Renders nothing without an emoji. */
export function ProductSymbol({ emoji, size = 16, className }: { emoji?: string | null; size?: number; className?: string }) {
  if (!emoji) return null
  return (
    <span className={cn('emoji inline-block shrink-0 text-center leading-none select-none', className)} style={{ fontSize: size, width: Math.round(size * 1.15) }} aria-hidden>
      {emoji}
    </span>
  )
}

// ---------------------------------------------------------------- money / numbers
export function Money({ value, unit, compact, className, unitClassName }: { value: number | null | undefined; unit?: string; compact?: boolean; className?: string; unitClassName?: string }) {
  const { t } = useTranslation()
  if (value == null) return <span className={className}>—</span>
  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {compact ? formatUZS(value, { compact: true }) : formatNumber(value)}
      {!compact && <span className={cn('ml-1 text-[0.78em] font-normal text-muted', unitClassName)}>{currencyLabel()}{unit ? `/${t(`units.${unit}`, unit)}` : ''}</span>}
    </span>
  )
}

export function PriceChange({ value, className, invert = false, showIcon = true }: { value: number | null | undefined; className?: string; invert?: boolean; showIcon?: boolean }) {
  if (value == null) return <span className={cn('text-muted', className)}>—</span>
  const up = value > 0.05, down = value < -0.05
  // For buyers a price rise is bad (red); invert for sellers if wanted.
  const bad = invert ? down : up
  const good = invert ? up : down
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium tabular', bad && 'text-up', good && 'text-down', !up && !down && 'text-muted', className)}>
      {showIcon && <Icon className="size-3.5" />}
      {formatPct(value)}
    </span>
  )
}

export function Sparkline({ data, width = 96, height = 28, color, className, fill = true }: { data: number[]; width?: number; height?: number; color?: string; className?: string; fill?: boolean }) {
  const id = React.useId()
  if (!data || data.length < 2) return <svg width={width} height={height} className={className} />
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const c = color ?? (data[data.length - 1] >= data[0] ? 'var(--color-up)' : 'var(--color-down)')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={c} stopOpacity="0.18" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <motion.path d={d} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
    </svg>
  )
}

// ---------------------------------------------------------------- source of a real public price
/** "korzinka.uz narxi" chip; with `link`, opens the listing on that site. */
export function SourceBadge({ site, url, link, className }: { site: string; url?: string | null; link?: boolean; className?: string }) {
  const { t } = useTranslation()
  const tone = site.startsWith('korzinka') ? 'bg-[#fdecea] text-[#c8102e]' : 'bg-[#e6f4f1] text-[#002f34]'
  const body = <><Globe className="size-3" />{t('common:source.observedOn', { site })}</>
  const cls = cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', tone, className)
  return link && url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className={cn(cls, 'pointer-events-auto relative z-10 hover:underline')} onClick={(e) => e.stopPropagation()}>{body}</a>
    : <span className={cls}>{body}</span>
}

// ---------------------------------------------------------------- badges
export function Badge({ children, tone = 'neutral', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'brand' | 'good' | 'saffron' | 'danger' | 'dark' | 'info' | 'outline'
}) {
  const tones = {
    neutral: 'bg-ink/[0.06] text-ink-soft',
    brand: 'bg-mint text-brand-700',
    good: 'bg-good-50 text-good',
    saffron: 'bg-saffron-50 text-saffron',
    danger: 'bg-danger-50 text-danger',
    dark: 'bg-ink text-white',
    info: 'bg-[#e8ecfb] text-[#3b5bdb]',
    outline: 'border border-line-strong text-ink-soft bg-white',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap [&_svg]:size-3', tones[tone], className)} {...p}>{children}</span>
}

export function VerifiedBadge({ status, compact, className }: { status: VerificationStatus; compact?: boolean; className?: string }) {
  const { t } = useTranslation()
  if (status !== 'verified') {
    if (compact) return null
    return <Badge tone={status === 'pending' ? 'saffron' : 'neutral'} className={className}>{t(`status.${status}`)}</Badge>
  }
  return (
    <Tooltip content={t('verified.tooltip')}>
      <span className={cn('inline-flex items-center gap-1 text-[12px] font-medium text-good', className)}>
        <BadgeCheck className="size-4 fill-good text-white" />
        {!compact && t('verified.badge')}
      </span>
    </Tooltip>
  )
}

export function QualityBadge({ quality }: { quality: Quality }) {
  const { t } = useTranslation()
  const tone = { premium: 'dark', first: 'brand', standard: 'neutral', economy: 'outline' } as const
  return <Badge tone={tone[quality]}>{t(`quality.${quality}`)}</Badge>
}

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'good' | 'saffron' | 'danger' | 'dark' | 'info' | 'outline'> = {
  active: 'good', paused: 'saffron', expired: 'neutral', removed: 'danger', pending: 'saffron', countered: 'info',
  accepted: 'good', rejected: 'danger', completed: 'dark', cancelled: 'neutral', verified: 'good', unverified: 'neutral',
  open: 'saffron', resolved: 'good', dismissed: 'neutral',
}
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {t(`status.${status}`, status)}
    </Badge>
  )
}

/** Data-freshness pill: every price shows how old it is. */
export function FreshnessBadge({ updatedAt, className, showLabel = false }: { updatedAt: string | null | undefined; className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const f = freshness(updatedAt)
  const dot = { fresh: 'bg-good', recent: 'bg-saffron', stale: 'bg-[#b9bcc4]' }[f]
  return (
    <Tooltip content={t('fresh.updated', { time: timeAgo(updatedAt) })}>
      <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted', className)}>
        <span className={cn('size-1.5 rounded-full', dot)} />
        <Clock className="size-3 opacity-60" />
        {showLabel ? `${t(`fresh.${f}`)} · ` : ''}{timeAgo(updatedAt)}
      </span>
    </Tooltip>
  )
}

export function DeliveryInfo({ offer, className }: { offer: Pick<Offer, 'delivery_available' | 'delivery_days' | 'delivery_price'>; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted', className)}>
      <Truck className="size-3.5" />
      {offer.delivery_available
        ? <>{t('delivery.available', { days: offer.delivery_days })} · {offer.delivery_price > 0 ? formatUZS(offer.delivery_price, { compact: offer.delivery_price >= 1e6 }) : t('delivery.free')}</>
        : t('delivery.pickup')}
    </span>
  )
}

export const offerName = (o: Pick<Offer, 'product_name_uz' | 'product_name_ru' | 'product_name_en'>) => ln(o, 'product_name')
