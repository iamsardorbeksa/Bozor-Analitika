import { useQuery } from '@tanstack/react-query'
import {
  Activity, ArrowRight, Bell, BellRing, ClipboardList, Flame, PiggyBank, Scale, Search, Sparkles, Store, Tags, Wallet,
} from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Api } from '@/api/endpoints'
import type { BuyerDashboard } from '@/api/types'
import { ReasonChips, useProductCategory } from '@/components/buyer/shared'
import { CHART, ChartTooltip, axisProps, compactNum, shortDate } from '@/components/charts/theme'
import { FreshnessBadge, Money, PriceChange, ProductGlyph, Sparkline, VerifiedBadge, offerName, ProductSymbol } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { BuyerTenderPanel } from '@/components/tenders/OverviewPanels'
import { AnimatedNumber, PageHeader, StatCard } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { currencyLabel, currentLang, formatDate, formatNumber, formatUZS, ln, timeAgo, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

const LOCALE = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-GB' } as const

export default function Overview(_props: { basePath?: string }) {
  const { t } = useTranslation(['buyer', 'common'])
  const { user } = useAuth()
  const q = useQuery({ queryKey: ['buyer-dashboard'], queryFn: Api.buyerDashboard })

  const hour = new Date().getHours()
  const greet = hour < 5 ? 'evening' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const firstName = user?.full_name.split(' ')[0] ?? ''
  let today = ''
  if (currentLang() === 'uz') {
    const days = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
    today = `${formatDate(new Date().toISOString())}, ${days[new Date().getDay()]}`
  } else {
    try {
      today = new Date().toLocaleDateString(LOCALE[currentLang()], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { today = formatDate(new Date().toISOString()) }
  }

  return (
    <div>
      <PageHeader
        eyebrow={<span className="capitalize">{today}</span>}
        title={<>{t(`buyer:overview.greeting.${greet}`)}, <span className="serif-italic text-brand">{uz(firstName)}</span></>}
        description={t('buyer:overview.subtitle')}
        actions={<>
          <Button asChild variant="outline"><Link to="/app/compare"><Scale />{t('common:nav.priceComparison')}</Link></Button>
          <Button asChild variant="outline"><Link to="/app/market"><Search />{t('buyer:overview.findOffers')}</Link></Button>
        </>}
      />
      <BuyerTenderPanel />
      {q.isLoading ? <OverviewSkeleton />
        : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} />
          : <Body d={q.data} />}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[112px]" />)}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]"><Skeleton className="h-[360px]" /><Skeleton className="h-[360px]" /></div>
      <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
    </div>
  )
}

function Body({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  const k = d.kpis
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t('buyer:overview.kpi.totalOffers')} icon={<Tags />} value={<AnimatedNumber value={k.total_offers} />} hint={t('buyer:overview.kpi.totalOffersHint')} />
        <StatCard delay={0.04} label={t('buyer:overview.kpi.avgPrice')} icon={<Wallet />}
          value={<span className="font-mono">{k.avg_price != null ? <AnimatedNumber value={k.avg_price} /> : '—'}</span>} hint={currencyLabel()} />
        <StatCard delay={0.08} label={t('buyer:overview.kpi.suppliers')} icon={<Store />} value={<AnimatedNumber value={k.active_suppliers} />} hint={t('buyer:overview.kpi.suppliersHint')} />
        <StatCard delay={0.12} tone="brand" label={t('buyer:overview.kpi.savings')} icon={<PiggyBank />}
          value={<span className="font-mono text-brand"><AnimatedNumber value={k.potential_savings_per_100_units} format={(v) => formatUZS(v, { compact: true }).replace(` ${currencyLabel()}`, '')} /></span>}
          hint={t('buyer:overview.kpi.savingsHint', { currency: currencyLabel() })} />
        <Link to="/app/requests" className="contents"><StatCard delay={0.16} label={t('buyer:overview.kpi.openRequests')} icon={<ClipboardList />} value={<AnimatedNumber value={k.open_requests} />} hint={<span className="inline-flex items-center gap-1 text-brand">{t('common:actions.viewAll')}<ArrowRight className="size-3" /></span>} className="cursor-pointer hover:shadow-[var(--shadow-lift)]" /></Link>
        <Link to="/app/alerts" className="contents"><StatCard delay={0.2} tone="dark" label={t('buyer:overview.kpi.alerts')} icon={<BellRing />} value={<AnimatedNumber value={k.active_alerts} />} hint={<span className="inline-flex items-center gap-1">{t('buyer:overview.kpi.manage')}<ArrowRight className="size-3" /></span>} className="cursor-pointer" /></Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PriceChart d={d} />
        <Movers d={d} />
      </div>

      <Recommended d={d} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Popular d={d} />
        <ActivityFeed d={d} />
        <RecentAlerts d={d} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- chart
function PriceChart({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  const products = d.chart_products
  const rows = React.useMemo(() => {
    const m = new Map<string, Record<string, number | string>>()
    for (const p of products) for (const s of p.series) {
      const key = s.date.slice(0, 10)
      const row = m.get(key) ?? { date: key }
      row[p.product_id] = s.avg
      m.set(key, row)
    }
    return [...m.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [products])
  const change = (p: (typeof products)[number]) => {
    const s = p.series
    if (s.length < 2 || !s[0].avg) return null
    return ((s[s.length - 1].avg - s[0].avg) / s[0].avg) * 100
  }
  const toggle = (id: string) => setHidden((h) => {
    const n = new Set(h)
    if (n.has(id)) n.delete(id)
    else if (n.size < products.length - 1) n.add(id)
    return n
  })

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <CardTitle>{t('buyer:overview.chartTitle')}</CardTitle>
          <CardDescription>{t('buyer:overview.chartHint')}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/app/analytics">{t('common:nav.marketAnalytics')}<ArrowRight /></Link></Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? <EmptyState title={t('buyer:overview.noChart')} className="py-10" /> : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {products.map((p, i) => {
                const off = hidden.has(p.product_id)
                const color = CHART.series[i % CHART.series.length]
                return (
                  <button key={p.product_id} onClick={() => toggle(p.product_id)} aria-pressed={!off}
                    className={cn('inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-all',
                      off ? 'border-line bg-transparent text-muted opacity-60' : 'border-line-strong bg-white text-ink')}>
                    <span className="size-2 rounded-full" style={{ background: off ? '#c9ccd2' : color }} />
                    <ProductSymbol emoji={p.emoji} size={14} />
                    {ln(p, 'name')}
                    <PriceChange value={change(p)} showIcon={false} className="text-[11.5px]" />
                  </button>
                )
              })}
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={28} />
                  <YAxis {...axisProps} tickFormatter={compactNum} width={44} />
                  <RTooltip content={<ChartTooltip labelFormat={(l) => formatDate(l)} valueFormat={(v) => formatUZS(v)} />} />
                  {products.map((p, i) => !hidden.has(p.product_id) && (
                    <Line key={p.product_id} dataKey={p.product_id} name={ln(p, 'name')} stroke={CHART.series[i % CHART.series.length]}
                      strokeWidth={2} dot={false} connectNulls animationDuration={900} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- movers
function Movers({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><Activity className="size-4 text-brand" />{t('buyer:overview.movers')}</CardTitle>
          <CardDescription>{t('buyer:overview.moversHint')}</CardDescription>
        </div>
      </CardHeader>
      <div className="px-2 pb-3">
        {d.movers.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted">{t('common:states.emptyTitle')}</p>
          : d.movers.slice(0, 7).map((m, i) => (
            <motion.div key={m.product_id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
              <Link to={`/app/compare?product=${m.product_id}&qty=100`} className="grid grid-cols-[1fr_80px_auto] items-center gap-3 rounded-xl px-3 py-2 hover:bg-mint-50">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium"><ProductSymbol emoji={m.emoji} size={17} /><span className="truncate">{ln(m, 'name')}</span></div>
                  <Money value={m.current_avg} unit={m.unit} className="font-mono text-xs text-ink-soft" />
                </div>
                <Sparkline data={m.spark} width={80} height={26} />
                <PriceChange value={m.change_pct} className="w-[66px] justify-end text-[13px]" />
              </Link>
            </motion.div>
          ))}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- recommended
function Recommended({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  if (d.recommended.length === 0) return null
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><Sparkles className="size-4 text-saffron" />{t('buyer:overview.recommended')}</h2>
          <p className="text-[13px] text-muted">{t('buyer:overview.recommendedHint')}</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/app/market">{t('common:actions.viewAll')}<ArrowRight /></Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {d.recommended.slice(0, 4).map((o, i) => (
          <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
            <Link to={`/app/market/${o.id}`} className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-start gap-3">
                <ProductGlyph category={o.category_slug} name={offerName(o)} image={o.image_url} emoji={o.product_emoji} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate font-semibold">{offerName(o)}</span></div>
                  <div className="flex items-center gap-1 truncate text-xs text-muted">{uz(o.business.name)}<VerifiedBadge status={o.business.verification_status} compact /></div>
                </div>
                <ScoreRing score={o.score} />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <Money value={o.unit_price} unit={o.unit} className="font-mono text-lg font-semibold text-forest" />
                <FreshnessBadge updatedAt={o.updated_at} />
              </div>
              <ReasonChips reasons={o.reasons} max={3} className="mt-3 flex flex-wrap gap-1" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function ScoreRing({ score }: { score: number }) {
  const { t } = useTranslation('buyer')
  const r = 16, c = 2 * Math.PI * r
  return (
    <div className="relative grid size-11 shrink-0 place-items-center" title={t('overview.score')}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-line)" strokeWidth="3.5" />
        <motion.circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
      </svg>
      <span className="font-mono text-[12px] font-semibold">{Math.round(score)}</span>
    </div>
  )
}

// ---------------------------------------------------------------- lists
function Popular({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  const catOf = useProductCategory()
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="size-4 text-saffron" />{t('buyer:overview.popular')}</CardTitle></CardHeader>
      <div className="px-2 pb-3">
        {d.popular.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted">{t('common:states.emptyTitle')}</p>
          : d.popular.slice(0, 6).map((p, i) => (
            <Link key={p.product_id} to={`/app/compare?product=${p.product_id}&qty=100`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-mint-50">
              <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
              <ProductGlyph category={p.category_slug ?? catOf(p.product_id)} name={ln(p, 'name')} image={p.image_url} emoji={p.emoji} size={34} className="rounded-lg [&_svg]:size-4" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ln(p, 'name')}</div>
                <div className="text-xs text-muted">{t('buyer:overview.popularMeta', { offers: p.offers, views: formatNumber(p.views) })}</div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] text-muted">{t('buyer:overview.from')}</div>
                <Money value={p.min_price} unit={p.unit} className="font-mono text-[13px] font-semibold" />
              </div>
            </Link>
          ))}
      </div>
    </Card>
  )
}

function ActivityFeed({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><Activity className="size-4 text-brand" />{t('buyer:overview.activity')}</CardTitle>
          <CardDescription>{t('buyer:overview.activityHint')}</CardDescription>
        </div>
      </CardHeader>
      <ol className="relative mx-5 mb-5 space-y-3.5 border-l border-dashed border-line-strong pl-4">
        {d.recent_activity.length === 0 && <li className="text-sm text-muted">{t('common:states.emptyTitle')}</li>}
        {d.recent_activity.slice(0, 6).map((o, i) => (
          <motion.li key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative">
            <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-emerald ring-4 ring-white" />
            <Link to={`/app/market/${o.id}`} className="group block">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium group-hover:text-brand"><ProductSymbol emoji={o.product_emoji} size={16} /><span className="truncate">{offerName(o)}</span></span>
                <Money value={o.unit_price} unit={o.unit} className="font-mono text-[13px]" />
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted">{uz(o.business.name)}</span>
                <FreshnessBadge updatedAt={o.updated_at} />
              </div>
            </Link>
          </motion.li>
        ))}
      </ol>
    </Card>
  )
}

function RecentAlerts({ d }: { d: BuyerDashboard }) {
  const { t } = useTranslation(['buyer', 'common'])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="size-4 text-brand" />{t('buyer:overview.recentAlerts')}</CardTitle>
        <Button asChild variant="ghost" size="sm"><Link to="/app/alerts">{t('buyer:overview.kpi.manage')}<ArrowRight /></Link></Button>
      </CardHeader>
      <div className="px-2 pb-3">
        {d.alerts.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted">{t('buyer:overview.noAlerts')}</p>
            <Button asChild size="sm" variant="secondary" className="mt-3"><Link to="/app/alerts">{t('buyer:alerts.create')}</Link></Button>
          </div>
        ) : d.alerts.slice(0, 5).map((a) => (
          <Link key={a.id} to={a.link ?? '/app/notifications'} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-mint-50">
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.is_read ? 'bg-line-strong' : 'bg-saffron')} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{uz(a.title)}</div>
              <div className="line-clamp-2 text-xs text-muted">{uz(a.body)}</div>
              <div className="mt-1 text-[11px] text-muted">{timeAgo(a.created_at)}</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
