/* Shared pieces of the buyer-request (tender) flow: status badges, deadline countdown, request cards. */
import { CalendarClock, Eye, Hourglass, MapPin, MessageSquareQuote, Sparkles, Trophy, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Bid, BidStatus, PaymentTerms, Tender, TenderStatus } from '@/api/tenders'
import { Badge, ProductGlyph, catStyle } from '@/components/market'
import { currencyLabel, formatDate, formatNumber, ln } from '@/lib/format'
import { cn } from '@/lib/utils'

const TENDER_TONE: Record<TenderStatus, 'saffron' | 'info' | 'good' | 'neutral' | 'danger'> = {
  open: 'saffron', awarded: 'info', contracted: 'good', closed: 'neutral', expired: 'neutral',
}
const BID_TONE: Record<BidStatus, 'info' | 'good' | 'danger' | 'neutral'> = { submitted: 'info', accepted: 'good', rejected: 'danger', withdrawn: 'neutral' }

export function TenderStatusBadge({ status, className }: { status: TenderStatus; className?: string }) {
  const { t } = useTranslation('tenders')
  return <Badge tone={TENDER_TONE[status]} className={className}><span className="size-1.5 rounded-full bg-current opacity-70" />{t(`status.${status}`)}</Badge>
}

export function BidStatusBadge({ status, className }: { status: BidStatus; className?: string }) {
  const { t } = useTranslation('tenders')
  return <Badge tone={BID_TONE[status]} className={className}><span className="size-1.5 rounded-full bg-current opacity-70" />{t(`bidStatus.${status}`)}</Badge>
}

export function usePayment() {
  const { t } = useTranslation('tenders')
  return (p: PaymentTerms | null | undefined) => (p ? t(`payment.${p}`) : t('form.any'))
}

/** "2 kun 4 soat qoldi" — live countdown to the offers deadline. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const { t } = useTranslation('tenders')
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  const ms = new Date(to).getTime() - now
  if (ms <= 0) return <span className={cn('inline-flex items-center gap-1 text-muted', className)}><Hourglass className="size-3.5" />{t('card.closed')}</span>
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const left = d > 0 ? t('time.dh', { d, h }) : h > 0 ? t('time.hm', { h, m }) : t('time.m', { m: Math.max(1, m) })
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', d < 1 ? 'font-semibold text-danger' : 'text-ink-soft', className)}>
      <Hourglass className="size-3.5" />{t('card.closesIn', { time: left })}
    </span>
  )
}

export const BADGE_ICON = { cheapest: Trophy, fastest: Zap, recommended: Sparkles } as const
export function BidBadges({ bid }: { bid: Pick<Bid, 'badges'> }) {
  const { t } = useTranslation('tenders')
  const tone = { cheapest: 'good', fastest: 'info', recommended: 'brand' } as const
  return (
    <>
      {bid.badges.map((b) => {
        const I = BADGE_ICON[b]
        return <Badge key={b} tone={tone[b]}><I />{t(`badges.${b}`)}</Badge>
      })}
    </>
  )
}

export const tenderName = (x: Pick<Tender, 'title'>) => x.title

/** A request on the producer board / in the buyer's list. */
export function TenderCard({ tender: x, to, index = 0, showBuyer = true }: { tender: Tender; to: string; index?: number; showBuyer?: boolean }) {
  const { t } = useTranslation(['tenders', 'common'])
  const s = catStyle(x.category.slug)
  const unit = t(`common:units.${x.unit}`, x.unit)
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.035, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.84] shadow-[var(--shadow-card)] backdrop-blur-xl transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <Link to={to} className="absolute inset-0 z-0 rounded-[var(--radius-card)]" aria-label={x.title} />
      <div className="pointer-events-none flex items-start gap-3 p-4 pb-3">
        <ProductGlyph category={x.category.slug} name={x.title} emoji={x.product?.emoji} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[11.5px] text-muted">{x.number}</span>
            <TenderStatusBadge status={x.status} className="shrink-0" />
          </div>
          <h3 className="mt-1 line-clamp-2 font-bold leading-snug tracking-[-0.02em]">{x.title}</h3>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">{ln(x.category, 'name')}</div>
        </div>
      </div>

      <div className="pointer-events-none mx-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-[12.5px]">
        <div className="bg-white px-3 py-2">
          <div className="text-[11px] text-muted">{t('card.qty')}</div>
          <div className="font-mono text-[17px] font-bold tracking-[-0.02em]" style={{ color: s.fg }}>{formatNumber(x.quantity)} <span className="font-sans text-xs font-medium text-ink-soft">{unit}</span></div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-[11px] text-muted">{x.target_price ? t('card.budget') : t('card.estValue')}</div>
          <div className="font-mono text-[15px] font-semibold">
            {x.target_price ? <>{formatNumber(x.target_price)} <span className="font-sans text-[11px] text-muted">{currencyLabel()}/{unit}</span></>
              : x.estimated_value ? <>≈ {formatNumber(x.estimated_value)} <span className="font-sans text-[11px] text-muted">{currencyLabel()}</span></>
                : <span className="font-sans text-[13px] font-normal text-muted">{t('card.noBudget')}</span>}
          </div>
        </div>
      </div>

      <div className="pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 text-[12.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted" />{ln(x.region, 'name')}</span>
        <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5 text-muted" />{t('card.neededBy', { date: formatDate(x.needed_by) })}</span>
      </div>

      <div className="pointer-events-none mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line px-4 py-2.5 text-xs">
        {x.status === 'open' ? <Countdown to={x.closes_at} /> : <span className="text-muted">{formatDate(x.closes_at)}</span>}
        <span className="flex items-center gap-2.5 text-muted">
          {x.my_bid && <Badge tone="dark">{t('card.answered')}</Badge>}
          {x.matches_me && !x.my_bid && <Badge tone="brand">{t('card.matches')}</Badge>}
          <span className="inline-flex items-center gap-1"><MessageSquareQuote className="size-3.5" />{t('card.bids', { count: x.bids_count })}</span>
          <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{x.views_count}</span>
        </span>
      </div>
      {showBuyer && <div className="pointer-events-none px-4 pb-3 text-[11.5px] text-muted">{x.buyer_label}</div>}
    </motion.article>
  )
}

/** Small key/value grid used on detail pages. */
export function Facts({ rows, className }: { rows: [React.ReactNode, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-3', className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="bg-white px-3 py-2.5">
          <dt className="text-[11.5px] text-muted">{k}</dt>
          <dd className="mt-0.5 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** ISO string for the end of a local date picked in <input type="date">. */
export const endOfDay = (date: string) => new Date(`${date}T18:00:00`).toISOString()
export const dateInput = (daysFromNow: number) => {
  const d = new Date(Date.now() + daysFromNow * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
