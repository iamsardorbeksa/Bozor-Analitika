import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ExternalLink, Megaphone, ArrowLeft, Bookmark, Eye, Flag, Handshake, LogIn, MapPin, Package, Phone, Scale, Send, Star,
} from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { MarketStats, Offer, OfferDetail as TOfferDetail } from '@/api/types'
import { RequestDialog } from '@/components/buyer/RequestDialog'
import { useFavoriteToggle } from '@/components/buyer/shared'
import { CHART, ChartTooltip, axisProps, compactNum, shortDate } from '@/components/charts/theme'
import {
  Badge, DeliveryInfo, FreshnessBadge, Money, PriceChange, ProductGlyph, QualityBadge, SourceBadge, VerifiedBadge, catStyle, offerName,
} from '@/components/market'
import { OfferCard } from '@/components/market/OfferCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { currencyLabel, formatDate, formatNumber, formatPct, formatUZS, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const REPORT_REASONS = ['price_suspicious', 'fake_seller', 'wrong_info', 'other'] as const

export default function OfferDetail({ basePath = '/app/market' }: { basePath?: string }) {
  const { t } = useTranslation(['buyer', 'common'])
  const { offerId = '' } = useParams()
  const q = useQuery({ queryKey: ['offer', offerId], queryFn: () => Api.offer(offerId), enabled: !!offerId })

  return (
    <div>
      <Link to={basePath} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />{t('buyer:detail.back')}
      </Link>
      {q.isLoading ? <DetailSkeleton />
        : q.isError || !q.data ? (
          (q.error as { response?: { status?: number } } | null)?.response?.status === 404
            ? <EmptyState icon={<Package />} title={t('buyer:detail.notFound')} description={t('buyer:detail.notFoundHint')}
              action={<Button asChild variant="outline"><Link to={basePath}>{t('common:nav.marketExplorer')}</Link></Button>} />
            : <ErrorState onRetry={() => q.refetch()} />
        ) : <DetailBody data={q.data} basePath={basePath} />}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-80" /><Skeleton className="h-48" /></div>
      <div className="space-y-4"><Skeleton className="h-96" /><Skeleton className="h-40" /></div>
    </div>
  )
}

function DetailBody({ data, basePath }: { data: TOfferDetail; basePath: string }) {
  const { t } = useTranslation(['buyer', 'common'])
  const { user } = useAuth()
  const loc = useLocation()
  const fav = useFavoriteToggle()
  const { offer, market_stats: stats } = data
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [reportOpen, setReportOpen] = React.useState(false)
  const [showPhone, setShowPhone] = React.useState(false)
  const s = catStyle(offer.category_slug)
  const unit = t(`common:units.${offer.unit}`, offer.unit)
  const isBuyer = user?.role === 'buyer'
  const compareQty = Math.max(offer.min_order_qty, 100)
  const loginState = { from: loc.pathname }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ------------------------------------------------ main column */}
      <div className="min-w-0 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-1.5 ikat-band opacity-60" aria-hidden />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <ProductGlyph category={offer.category_slug} name={offerName(offer)} image={offer.image_url} emoji={offer.product_emoji} size={72} className="rounded-2xl [&_svg]:size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.025em] md:text-[28px]">{offerName(offer)}</h1>
                  
                  {offer.source_site ? <SourceBadge site={offer.source_site} url={offer.source_url} link /> : <QualityBadge quality={offer.quality} />}
                </div>
                <p className="mt-1 text-[14.5px] text-ink-soft">{uz(offer.title)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{uz(offer.market_name ? `${offer.market_name}, ${offer.region_name}` : offer.location_note ?? offer.region_name)}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{t('buyer:detail.views', { count: offer.views_count })}</span>
                  <FreshnessBadge updatedAt={offer.updated_at} showLabel />
                  {offer.source !== 'demo' && offer.source !== 'web' && <Badge tone="outline">{t(`common:source.${offer.source}`)}</Badge>}
                </div>
              </div>
            </div>
            {offer.description && <p className="border-t border-dashed border-line px-5 py-4 text-sm leading-relaxed text-ink-soft">{uz(offer.description)}</p>}
          </Card>
        </motion.div>

        <MarketContext data={data} />

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">{t('buyer:detail.similar')}</h2>
              <p className="text-[13px] text-muted">{t('buyer:detail.similarHint')}</p>
            </div>
            {user && <Button asChild variant="ghost" size="sm"><Link to={`/app/compare?product=${offer.product_id}&qty=${compareQty}`}><Scale />{t('buyer:detail.compareAll')}</Link></Button>}
          </div>
          {data.similar.length === 0
            ? <EmptyState title={t('buyer:detail.noSimilar')} className="py-10" />
            : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.similar.slice(0, 6).map((o, i) => (
                  <OfferCard key={o.id} offer={o} index={i} to={`${basePath}/${o.id}`} onToggleSave={fav.canSave ? fav.toggle : undefined} saving={fav.pendingId === o.id} />
                ))}
              </div>
            )}
        </section>
      </div>

      {/* ------------------------------------------------ side column */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <div className="relative flex items-end justify-between rounded-xl py-4 pr-4 pl-8 tag-shape" style={{ background: s.bg }}>
              <span className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full bg-white ring-1 ring-black/5" aria-hidden />
              <div>
                <div className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: s.fg }}>{t('common:fields.unitPrice')}</div>
                <div className="mt-1 font-mono text-[34px] leading-none font-semibold tracking-[-0.04em]" style={{ color: s.fg }}>{formatNumber(offer.unit_price)}</div>
                <div className="mt-1.5 text-xs text-ink-soft/70">{currencyLabel()} · {t('common:fields.perUnit', { unit })}</div>
              </div>
              {stats.avg != null && <PositionPill price={offer.unit_price} avg={stats.avg} />}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
              {[
                [t('common:fields.available'), offer.available_qty == null ? t('common:source.stockUnknown') : `${formatNumber(offer.available_qty)} ${unit}`],
                [t('common:fields.moq'), `${formatNumber(offer.min_order_qty)} ${unit}`],
                [t('common:fields.quality'), t(`common:quality.${offer.quality}`)],
                [t('buyer:detail.validUntil'), offer.valid_until ? formatDate(offer.valid_until) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-3 py-2.5">
                  <dt className="text-[11.5px] text-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2.5">
              <DeliveryInfo offer={offer} />
              {offer.delivery_available && <span className="text-xs text-muted">{t('buyer:detail.deliveryDays', { days: offer.delivery_days })}</span>}
            </div>

            <div className="mt-4 grid gap-2">
              {isBuyer ? (
                <>
                  {offer.source_site ? (
                    <>
                      <p className="rounded-xl bg-paper px-3 py-2.5 text-[13px] leading-snug text-ink-soft">{t('common:source.contactThere', { site: offer.source_site })}</p>
                      {offer.source_url && <Button asChild size="lg"><a href={offer.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink />{t('common:source.openSite', { site: offer.source_site })}</a></Button>}
                    </>
                  ) : <Button size="lg" onClick={() => setRequestOpen(true)}><Send />{t('buyer:detail.sendRequest')}</Button>}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => fav.toggle(offer)} loading={fav.pendingId === offer.id} aria-pressed={offer.is_favorite}>
                      <Bookmark className={cn(offer.is_favorite && 'fill-brand text-brand')} />
                      {offer.is_favorite ? t('buyer:detail.saved') : t('common:actions.saveOffer')}
                    </Button>
                    <Button asChild variant="outline"><Link to={`/app/compare?product=${offer.product_id}&qty=${compareQty}`}><Scale />{t('common:actions.compare')}</Link></Button>
                  </div>
                  <Button asChild variant="secondary"><Link to={`/app/tenders/new?product=${offer.product_id}&category=${offer.category_slug}`}><Megaphone />{t('tenders:fromOffer')}</Link></Button>
                  <Button variant="ghost" size="sm" className="text-muted" onClick={() => setReportOpen(true)}><Flag />{t('buyer:detail.report')}</Button>
                </>
              ) : !user ? (
                <div className="rounded-xl border border-dashed border-line-strong p-4 text-center">
                  <p className="text-sm font-medium">{t('buyer:detail.loginTitle')}</p>
                  <p className="mt-1 text-[13px] text-muted">{t('buyer:detail.loginBody')}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button asChild><Link to="/login" state={loginState}><LogIn />{t('common:nav.login')}</Link></Button>
                    <Button asChild variant="outline"><Link to="/register">{t('common:nav.getStarted')}</Link></Button>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => fav.toggle(offer)}><Bookmark />{t('common:actions.saveOffer')}</Button>
                </div>
              ) : (
                <Button asChild variant="outline"><Link to={`/app/compare?product=${offer.product_id}&qty=${compareQty}`}><Scale />{t('buyer:detail.compareAll')}</Link></Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* supplier */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <div className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('common:fields.supplier')}</div>
            <div className="mt-2 flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-xl font-extrabold text-white">{uz(offer.business.name)[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{uz(offer.business.name)}</div>
                <VerifiedBadge status={offer.business.verification_status} className="mt-0.5" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-paper px-3 py-2">
                <div className="text-[11.5px] text-muted">{t('common:fields.rating')}</div>
                <div className="mt-0.5 flex items-center gap-1 font-semibold tabular"><Star className="size-4 fill-saffron text-saffron" />{offer.business.rating.toFixed(1)}<span className="text-xs font-normal text-muted">/ 5</span></div>
              </div>
              <div className="rounded-xl bg-paper px-3 py-2">
                <div className="text-[11.5px] text-muted">{t('buyer:detail.deals')}</div>
                <div className="mt-0.5 flex items-center gap-1 font-semibold tabular"><Handshake className="size-4 text-brand" />{formatNumber(offer.business.completed_deals)}</div>
              </div>
            </div>
            {offer.business.phone ? (
              showPhone ? (
                <Button asChild variant="secondary" className="mt-3 w-full font-mono">
                  <a href={`tel:${offer.business.phone.replace(/\s+/g, '')}`}><Phone />{offer.business.phone}</a>
                </Button>
              ) : (
                <Button variant="outline" className="mt-3 w-full" onClick={() => setShowPhone(true)}><Phone />{t('buyer:detail.showPhone')}</Button>
              )
            ) : <p className="mt-3 text-center text-xs text-muted">{t('buyer:detail.noPhone')}</p>}
          </Card>
        </motion.div>
      </div>

      <RequestDialog offer={offer} open={requestOpen} onOpenChange={setRequestOpen} />
      <ReportDialog offer={offer} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}

/** "12% below market avg" pill on the price tag. */
function PositionPill({ price, avg }: { price: number; avg: number }) {
  const { t } = useTranslation('buyer')
  const diff = ((price - avg) / avg) * 100
  const below = diff < -0.5, above = diff > 0.5
  return (
    <span className={cn('rounded-lg px-2 py-1 text-right text-[11.5px] leading-tight font-medium',
      below ? 'bg-white/80 text-down' : above ? 'bg-white/80 text-up' : 'bg-white/80 text-muted')}>
      <span className="block font-mono text-sm tabular">{formatPct(diff)}</span>
      {below ? t('detail.belowAvg') : above ? t('detail.aboveAvg') : t('detail.atAvg')}
    </span>
  )
}

// ---------------------------------------------------------------- market context
function MarketContext({ data }: { data: TOfferDetail }) {
  const { t } = useTranslation(['buyer', 'common'])
  const { offer, market_stats: st } = data
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())

  const rows = React.useMemo(() => {
    const m = new Map<string, { date: string; avg?: number; band?: [number, number]; offer?: number }>()
    for (const p of data.series) m.set(p.date.slice(0, 10), { date: p.date.slice(0, 10), avg: p.avg, band: [p.min, p.max] })
    for (const h of data.offer_history) {
      const d = h.recorded_at.slice(0, 10)
      m.set(d, { ...(m.get(d) ?? { date: d }), offer: h.price })
    }
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [data.series, data.offer_history])

  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const names = { avg: t('buyer:detail.marketAvg'), band: t('buyer:detail.marketRange'), offer: t('buyer:detail.thisOffer') }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t('buyer:detail.marketContext')}</CardTitle>
          <CardDescription>{t('buyer:detail.marketContextHint', { count: st.count, days: st.history_days || 30 })}</CardDescription>
        </div>
        {st.last_updated && <FreshnessBadge updatedAt={st.last_updated} />}
      </CardHeader>
      <CardContent>
        <StatsStrip st={st} unit={offer.unit} />
        {st.min != null && st.max != null && st.avg != null && <RangeBar st={st} price={offer.unit_price} />}

        <div className="mt-5 flex flex-wrap gap-1.5">
          {(['avg', 'band', 'offer'] as const).map((k) => {
            const color = k === 'offer' ? CHART.forest : CHART.brand
            const off = hidden.has(k)
            return (
              <button key={k} onClick={() => toggle(k)} aria-pressed={!off}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity', off ? 'border-line opacity-50' : 'border-line-strong bg-white')}>
                <span className="h-0.5 w-3 rounded-full" style={{ background: color, opacity: k === 'band' ? 0.35 : 1, height: k === 'band' ? 8 : 2 }} />
                {names[k]}
              </button>
            )
          })}
        </div>
        {rows.length < 2 ? (
          <p className="mt-4 rounded-xl bg-paper py-10 text-center text-sm text-muted">{t('buyer:detail.noHistory')}</p>
        ) : (
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={24} />
                <YAxis {...axisProps} tickFormatter={compactNum} width={44} domain={['auto', 'auto']} />
                <RTooltip content={<ChartTooltip labelFormat={(l) => formatDate(l)} valueFormat={(v) => formatUZS(v)} />} />
                <Legend wrapperStyle={{ display: 'none' }} />
                {!hidden.has('band') && <Area dataKey="band" name={names.band} stroke="none" fill={CHART.brand} fillOpacity={0.1} isAnimationActive={false} />}
                {!hidden.has('avg') && <Line dataKey="avg" name={names.avg} stroke={CHART.brand} strokeWidth={2} dot={false} connectNulls />}
                {!hidden.has('offer') && <Line dataKey="offer" name={names.offer} stroke={CHART.forest} strokeWidth={2.2} type="stepAfter" dot={{ r: 2.5, fill: CHART.forest }} connectNulls />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {st.excluded_outliers > 0 && <p className="mt-2 text-[11.5px] text-muted">{t('buyer:detail.outliers', { count: st.excluded_outliers })}</p>}
      </CardContent>
    </Card>
  )
}

function StatsStrip({ st, unit }: { st: MarketStats; unit: string }) {
  const { t } = useTranslation(['buyer', 'common'])
  const items: [string, React.ReactNode][] = [
    [t('buyer:detail.stat.avg'), <Money value={st.avg} className="font-mono" />],
    [t('buyer:detail.stat.median'), <Money value={st.median} className="font-mono" />],
    [t('buyer:detail.stat.min'), <Money value={st.min} className="font-mono" />],
    [t('buyer:detail.stat.max'), <Money value={st.max} className="font-mono" />],
    [t('buyer:detail.stat.change7'), <PriceChange value={st.change_7d_pct} />],
    [t('buyer:detail.stat.change30'), <PriceChange value={st.change_30d_pct} />],
  ]
  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        {items.map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-2.5">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11.5px] text-muted">
        {t('buyer:detail.statFoot', { unit: t(`common:units.${unit}`, unit), qty: formatNumber(st.total_qty), verified: st.verified_count })}
      </p>
    </div>
  )
}

/** Horizontal min–max scale with markers for market average and this offer. */
function RangeBar({ st, price }: { st: MarketStats; price: number }) {
  const { t } = useTranslation('buyer')
  const lo = Math.min(st.min!, price), hi = Math.max(st.max!, price)
  const span = hi - lo || 1
  const pos = (v: number) => `${((v - lo) / span) * 100}%`
  const diff = ((price - st.avg!) / st.avg!) * 100
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="font-medium">{t('detail.whereSits')}</span>
        <span className={cn('font-medium', diff < -0.5 ? 'text-down' : diff > 0.5 ? 'text-up' : 'text-muted')}>
          {diff < -0.5 ? t('detail.cheaperBy', { pct: Math.abs(diff).toFixed(1) }) : diff > 0.5 ? t('detail.pricierBy', { pct: diff.toFixed(1) }) : t('detail.atAvg')}
        </span>
      </div>
      <div className="relative h-9">
        <div className="absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-good-50 via-ink/[0.06] to-danger-50" />
        <div className="absolute top-0 bottom-0 w-px bg-ink-soft/50" style={{ left: pos(st.avg!) }}>
          <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full text-[10.5px] whitespace-nowrap text-muted">{t('detail.avgShort')}</span>
        </div>
        <motion.div initial={{ left: pos(st.avg!) }} animate={{ left: pos(price) }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand shadow" />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted tabular">
        <span>{formatNumber(lo)}</span><span>{formatNumber(hi)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- report
function ReportDialog({ offer, open, onOpenChange }: { offer: Offer; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['buyer', 'common'])
  const schema = React.useMemo(() => z.object({
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(1000, t('buyer:request.errors.tooLong')),
  }).superRefine((v, ctx) => {
    if (v.reason === 'other' && v.details.length < 5) ctx.addIssue({ code: 'custom', path: ['details'], message: t('buyer:report.detailsRequired') })
  }), [t])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { reason: 'price_suspicious', details: '' } })
  React.useEffect(() => { if (open) reset({ reason: 'price_suspicious', details: '' }) }, [open, reset])
  const reason = watch('reason')

  const mut = useMutation({
    mutationFn: (v: V) => Api.reportOffer(offer.id, v.reason, v.details || undefined),
    onSuccess: () => { toast.success(t('buyer:report.sentToast')); onOpenChange(false) },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('buyer:report.title')} description={t('buyer:report.description')}>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} noValidate className="space-y-4">
          <div>
            <Label>{t('buyer:report.reason')}</Label>
            <div className="grid gap-1.5">
              {REPORT_REASONS.map((r) => (
                <label key={r} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  reason === r ? 'border-brand bg-mint-50' : 'border-line hover:border-line-strong')}>
                  <input type="radio" value={r} {...register('reason')} className="accent-[var(--color-brand)]" />
                  {t(`buyer:report.reasons.${r}`)}
                </label>
              ))}
            </div>
          </div>
          <Field label={t('buyer:report.details')} htmlFor="rp-details" error={errors.details?.message}>
            <Textarea id="rp-details" rows={3} placeholder={t('buyer:report.detailsPh')} aria-invalid={!!errors.details} {...register('details')} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common:actions.cancel')}</Button>
            <Button type="submit" variant="danger" loading={mut.isPending}><Flag />{t('common:actions.report')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

