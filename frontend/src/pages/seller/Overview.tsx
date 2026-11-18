import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Boxes, CircleDollarSign, Eye, Handshake, Inbox, PackagePlus, ShieldAlert, Star, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Api } from '@/api/endpoints'
import type { SellerDashboard } from '@/api/types'
import { CHART, ChartTooltip, axisProps, shortDate } from '@/components/charts/theme'
import { Money, StatusBadge, VerifiedBadge, ProductSymbol } from '@/components/market'
import { Panel, PositionBadge, RangeBar, Reveal } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { SellerTenderPanel } from '@/components/tenders/OverviewPanels'
import { AnimatedNumber, PageHeader, StatCard } from '@/components/ui/layout'
import { formatNumber, formatPct, ln, timeAgo, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function SellerOverview() {
  const { t } = useTranslation(['seller', 'common'])
  const q = useQuery({ queryKey: ['seller-dashboard'], queryFn: Api.sellerDashboard })

  const addBtn = (
    <Button asChild><Link to="/app/seller/products/new"><PackagePlus /> {t('common:nav.addProduct')}</Link></Button>
  )

  if (q.isLoading) return <OverviewSkeleton />
  if (q.isError || !q.data) return (<><PageHeader title={t('overview.title')} actions={addBtn} /><ErrorState onRetry={() => q.refetch()} /></>)
  const d = q.data

  return (
    <div>
      <PageHeader eyebrow={t('overview.eyebrow')} title={t('overview.title')} description={t('overview.subtitle')} actions={addBtn} />
      <SellerTenderPanel />
      <BusinessHeader d={d} />

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard delay={0.02} label={t('kpi.activeProducts')} icon={<Boxes />} value={<AnimatedNumber value={d.kpis.active_products} />} />
        <StatCard delay={0.06} label={t('kpi.activeOffers')} icon={<Tag />} value={<AnimatedNumber value={d.kpis.active_offers} />}
          hint={d.kpis.paused_offers ? t('kpi.pausedHint', { count: d.kpis.paused_offers }) : undefined} />
        <StatCard delay={0.1} tone="brand" label={t('kpi.inquiries')} icon={<Inbox />} value={<AnimatedNumber value={d.kpis.incoming_inquiries} />} />
        <StatCard delay={0.14} label={t('kpi.totalViews')} icon={<Eye />} value={<AnimatedNumber value={d.kpis.total_views} />}
          hint={t('kpi.views30d', { count: d.kpis.views_30d })} />
        <StatCard delay={0.18} label={t('kpi.avgPrice')} icon={<CircleDollarSign />}
          value={d.kpis.avg_listed_price != null ? <span className="font-mono text-[22px]"><AnimatedNumber value={d.kpis.avg_listed_price} /></span> : '—'} />
        <StatCard delay={0.22} tone="dark" label={t('kpi.completedDeals')} icon={<Handshake />} value={<AnimatedNumber value={d.kpis.completed_deals} />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Panel i={2} className="lg:col-span-2" title={t('overview.viewsChart')} description={t('overview.viewsChartHint')}
          actions={<Button variant="ghost" size="sm" asChild><Link to="/app/seller/analytics">{t('overview.openAnalytics')} <ArrowRight /></Link></Button>}>
          {d.views_series.length < 2 ? <EmptyState icon={<Eye />} title={t('overview.noViews')} className="py-10" /> : <ViewsChart series={d.views_series} />}
        </Panel>
        <Panel i={3} title={t('overview.mostViewed')}>
          {d.most_viewed.length === 0 ? <EmptyState icon={<Eye />} title={t('overview.noViews')} className="py-10" /> : (
            <ol className="space-y-1">
              {d.most_viewed.map((o, idx) => (
                <li key={o.offer_id}>
                  <Link to={`/app/seller/products/${o.offer_id}/edit`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-mint-50">
                    <span className="w-5 font-mono text-xs text-muted">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{uz(o.title)}</p>
                      <Money value={o.unit_price} unit={o.unit} className="font-mono text-xs text-muted" />
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[13px] tabular"><Eye className="size-3.5 text-muted" />{formatNumber(o.views)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel i={4} className="lg:col-span-3" title={t('overview.competitiveness')} description={t('overview.competitivenessHint')}
          actions={<Button variant="ghost" size="sm" asChild><Link to="/app/seller/intelligence">{t('overview.openIntel')} <ArrowRight /></Link></Button>}>
          <Competitiveness d={d} />
        </Panel>
        <Panel i={5} className="lg:col-span-2" title={t('overview.recentRequests')}
          actions={<Button variant="ghost" size="sm" asChild><Link to="/app/seller/requests">{t('common:actions.viewAll')} <ArrowRight /></Link></Button>}>
          {d.recent_requests.length === 0 ? <EmptyState icon={<Inbox />} title={t('requests.empty')} className="py-10" /> : (
            <ul className="divide-y divide-line">
              {d.recent_requests.map((r) => (
                <li key={r.id}>
                  <Link to="/app/seller/requests" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-ink-soft">{r.buyer.slice(0, 1)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{uz(r.buyer)}</p>
                      <p className="truncate text-xs text-muted">{r.product ? uz(r.product) : '—'}{r.quantity != null && <> · <span className="font-mono">{formatNumber(r.quantity)}</span></>} · {timeAgo(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function BusinessHeader({ d }: { d: SellerDashboard }) {
  const { t } = useTranslation(['seller', 'common'])
  const b = d.business
  const verified = b.verification_status === 'verified'
  return (
    <Reveal className="glass-panel !rounded-[26px]">
      <div className="h-1 bg-gradient-to-r from-brand via-brand/50 to-transparent" aria-hidden />
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-2xl font-extrabold text-white">{b.name.slice(0, 1)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-extrabold tracking-[-0.03em] text-ink">{uz(b.name)}</h2>
              {verified
                ? <span className="rounded-full bg-good-50 px-2 py-0.5"><VerifiedBadge status="verified" /></span>
                : <StatusBadge status={b.verification_status} />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-saffron text-saffron" /><span className="font-mono font-semibold text-ink">{b.rating.toFixed(1)}</span> {t('overview.rating')}</span>
              <span><span className="font-mono font-semibold text-ink">{formatNumber(b.completed_deals)}</span> {t('overview.deals')}</span>
            </div>
          </div>
        </div>
        {!verified && (
          <div className="flex items-start gap-3 rounded-2xl border border-saffron/25 bg-saffron-50/80 p-3 md:max-w-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-saffron" />
            <div>
              <p className="text-[13px] leading-snug text-ink-soft">{t(b.verification_status === 'pending' ? 'overview.verifyPending' : 'overview.verifyCta')}</p>
              {b.verification_status !== 'pending' && (
                <Button size="sm" variant="saffron" className="mt-2" asChild><Link to="/app/seller/profile">{t('overview.verifyBtn')}</Link></Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Reveal>
  )
}

function ViewsChart({ series }: { series: { date: string; views: number }[] }) {
  const { t } = useTranslation('seller')
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="sv-views" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={CHART.brand} stopOpacity={0.22} />
              <stop offset="1" stopColor={CHART.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
          <YAxis allowDecimals={false} {...axisProps} width={44} />
          <RTooltip content={<ChartTooltip labelFormat={shortDate} />} cursor={{ stroke: CHART.grid }} />
          <Area type="monotone" dataKey="views" name={t('kpi.views')} stroke={CHART.brand} strokeWidth={2} fill="url(#sv-views)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Competitiveness({ d }: { d: SellerDashboard }) {
  const { t } = useTranslation('seller')
  const rows = d.competitiveness
  if (rows.length === 0) return <EmptyState icon={<Tag />} title={t('overview.noCompetitiveness')} className="py-10" />
  const counts = { cheapest: 0, below_avg: 0, above_avg: 0 }
  rows.forEach((r) => { counts[r.position]++ })
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(['cheapest', 'below_avg', 'above_avg'] as const).map((k) => (
          <div key={k} className={cn('rounded-xl border px-3 py-2.5', k === 'above_avg' ? 'border-[#f0d7b6] bg-saffron-50/60' : 'border-good/20 bg-good-50')}>
            <div className="font-mono text-xl font-bold tabular">{counts[k]}</div>
            <div className="text-[11.5px] text-muted">{t(`position.${k}`)}</div>
          </div>
        ))}
      </div>
      <ul className="space-y-3">
        {rows.slice(0, 5).map((r) => (
          <li key={r.offer_id} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium"><ProductSymbol emoji={r.emoji} size={17} /><span className="truncate">{ln(r, 'product_name')}</span></span>
                <PositionBadge position={r.position} />
              </div>
              <div className="text-xs text-muted">
                <Money value={r.your_price} unit={r.unit} className="font-mono text-ink-soft" />
                {r.diff_vs_avg_pct != null && <> · {t('overview.vsAvg', { pct: formatPct(r.diff_vs_avg_pct) })}</>}
              </div>
            </div>
            <RangeBar min={r.market_min} max={r.market_max} avg={r.market_avg} value={r.your_price} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-6 h-9 w-72" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[106px] rounded-2xl" />)}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    </div>
  )
}
