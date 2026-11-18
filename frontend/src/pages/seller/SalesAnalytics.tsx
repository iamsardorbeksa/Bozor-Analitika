import { useQuery } from '@tanstack/react-query'
import { BarChart3, Eye, Inbox, Percent, Radar, Trophy } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Area, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { Api } from '@/api/endpoints'
import type { SellerDashboard } from '@/api/types'
import { CHART, ChartTooltip, axisProps, shortDate } from '@/components/charts/theme'
import { Money, ProductSymbol } from '@/components/market'
import { EstimateNote, InterestMeter, Panel, PositionBadge, RangeBar, SignalBadge, SupplyLevel } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { AnimatedNumber, PageHeader, Segmented, StatCard } from '@/components/ui/layout'
import { formatNumber, formatPct, ln } from '@/lib/format'

type Row = SellerDashboard['competitiveness'][number]

export default function SalesAnalytics() {
  const { t } = useTranslation(['seller', 'common'])
  const q = useQuery({ queryKey: ['seller-dashboard'], queryFn: Api.sellerDashboard })
  const header = <PageHeader eyebrow={t('analytics.eyebrow')} title={t('analytics.title')} description={t('analytics.subtitle')}
    actions={<Button variant="outline" asChild><Link to="/app/seller/intelligence"><Radar /> {t('common:nav.marketIntelligence')}</Link></Button>} />

  if (q.isLoading) return (
    <div>{header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[106px] rounded-2xl" />)}</div>
      <Skeleton className="mt-4 h-[320px] rounded-2xl" /><Skeleton className="mt-4 h-[360px] rounded-2xl" />
    </div>
  )
  if (q.isError || !q.data) return <div>{header}<ErrorState onRetry={() => q.refetch()} /></div>
  const d = q.data
  const rows = d.competitiveness
  const inquiries = rows.reduce((s, r) => s + r.inquiries, 0)
  const offerViews = rows.reduce((s, r) => s + r.views, 0)
  const conv = offerViews > 0 ? (inquiries / offerViews) * 100 : null
  const winning = rows.filter((r) => r.position !== 'above_avg').length

  return (
    <div>
      {header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard delay={0.02} label={t('analytics.kpi.views30d')} icon={<Eye />} value={<AnimatedNumber value={d.kpis.views_30d} />} hint={t('analytics.kpi.allTime', { n: formatNumber(d.kpis.total_views) })} />
        <StatCard delay={0.06} label={t('analytics.kpi.inquiries')} icon={<Inbox />} value={<AnimatedNumber value={inquiries} />} hint={t('analytics.kpi.open', { n: formatNumber(d.kpis.incoming_inquiries) })} />
        <StatCard delay={0.1} tone="brand" label={t('analytics.kpi.conversion')} icon={<Percent />}
          value={conv == null ? '—' : <AnimatedNumber value={conv} format={(v) => `${v.toFixed(1)}%`} />} hint={t('analytics.kpi.conversionHint')} />
        <StatCard delay={0.14} tone="dark" label={t('analytics.kpi.competitive')} icon={<Trophy />}
          value={<span><AnimatedNumber value={winning} /><span className="text-base text-white/60"> / {rows.length}</span></span>} hint={t('analytics.kpi.competitiveHint')} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel i={1} className="xl:col-span-3" title={t('analytics.viewsTitle')} description={t('analytics.viewsHint')}>
          {d.views_series.length < 2 ? <EmptyState icon={<Eye />} title={t('overview.noViews')} className="py-10" /> : <ViewsTrend series={d.views_series} />}
        </Panel>
        <Panel i={2} className="xl:col-span-2" title={t('analytics.perOfferTitle')} description={t('analytics.perOfferHint')}>
          {rows.length === 0 ? <EmptyState icon={<BarChart3 />} title={t('overview.noCompetitiveness')} className="py-10" /> : <PerOffer rows={rows} />}
        </Panel>
      </div>

      <Panel i={3} className="mt-4" title={t('analytics.compTitle')} description={t('analytics.compHint')} bodyClassName="px-0 pb-2">
        {rows.length === 0 ? <div className="px-5 pb-3"><EmptyState icon={<BarChart3 />} title={t('overview.noCompetitiveness')} /></div> : <CompetitivenessTable rows={rows} />}
      </Panel>

      <Panel i={4} className="mt-4" title={t('analytics.demandTitle')} description={t('analytics.demandHint')}>
        <EstimateNote className="mb-4" />
        {rows.length === 0 ? <EmptyState title={t('overview.noCompetitiveness')} /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <div key={r.offer_id} className="rounded-xl border border-line p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1.5 font-medium"><ProductSymbol emoji={r.emoji} size={17} /><span className="truncate">{ln(r, 'product_name')}</span></p>
                    <p className="text-xs text-muted">{t('analytics.competitors', { count: r.competitors })}</p>
                  </div>
                  <SignalBadge signal={r.demand.signal} />
                </div>
                <div className="mb-1 text-[11px] tracking-wide text-muted uppercase">{t('estimate.interest')}</div>
                <InterestMeter value={r.demand.interest_index} />
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted">{t('estimate.supply')}</span><SupplyLevel level={r.demand.supply_level} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function ViewsTrend({ series }: { series: { date: string; views: number }[] }) {
  const { t } = useTranslation('seller')
  const data = React.useMemo(() => series.map((p, i) => {
    const win = series.slice(Math.max(0, i - 6), i + 1)
    return { ...p, avg: Math.round((win.reduce((s, x) => s + x.views, 0) / win.length) * 10) / 10 }
  }), [series])
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="sa-v" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={CHART.brand} stopOpacity={0.2} /><stop offset="1" stopColor={CHART.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
          <YAxis allowDecimals={false} {...axisProps} width={44} />
          <RTooltip content={<ChartTooltip labelFormat={shortDate} valueFormat={(v) => formatNumber(v, v % 1 ? 1 : 0)} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="views" name={t('kpi.views')} stroke={CHART.brand} strokeWidth={1.6} fill="url(#sa-v)" />
          <Line type="monotone" dataKey="avg" name={t('analytics.rolling')} stroke={CHART.saffron} strokeWidth={2} dot={false} strokeDasharray="4 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function PerOffer({ rows }: { rows: Row[] }) {
  const { t } = useTranslation('seller')
  const data = rows.map((r) => ({ name: ln(r, 'product_name'), views: r.views, inquiries: r.inquiries }))
  return (
    <div style={{ height: Math.max(220, data.length * 38) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="name" {...axisProps} width={90} />
          <RTooltip content={<ChartTooltip />} cursor={{ fill: '#fff4ee' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="views" name={t('kpi.views')} fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={9} />
          <Bar dataKey="inquiries" name={t('analytics.inquiries')} fill={CHART.saffron} radius={[0, 4, 4, 0]} barSize={9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CompetitivenessTable({ rows }: { rows: Row[] }) {
  const { t } = useTranslation(['seller', 'common'])
  const [filter, setFilter] = React.useState<'all' | Row['position']>('all')
  const shown = filter === 'all' ? rows : rows.filter((r) => r.position === filter)
  return (
    <div>
      <div className="-mt-1 mb-2 overflow-x-auto px-5 scrollbar-thin">
        <Segmented id="sa-pos" size="sm" value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('products.tabs.all') },
          { value: 'cheapest', label: t('position.cheapest') },
          { value: 'below_avg', label: t('position.below_avg') },
          { value: 'above_avg', label: t('position.above_avg') },
        ]} />
      </div>
      {shown.length === 0 ? <p className="px-5 py-6 text-center text-sm text-muted">{t('common:states.noResults')}</p> : (
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <li key={r.offer_id} className="grid gap-3 px-5 py-3.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ProductSymbol emoji={r.emoji} size={17} /><Link to={`/app/seller/products/${r.offer_id}/edit`} className="truncate font-medium hover:text-brand">{ln(r, 'product_name')}</Link>
                  <PositionBadge position={r.position} />
                </div>
                <p className="mt-0.5 text-xs text-muted">{t('analytics.competitors', { count: r.competitors })} · {t('kpi.views')}: <span className="font-mono">{r.views}</span> · {t('analytics.inquiries')}: <span className="font-mono">{r.inquiries}</span></p>
              </div>
              <RangeBar min={r.market_min} max={r.market_max} avg={r.market_avg} value={r.your_price} />
              <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
                <Money value={r.your_price} unit={r.unit} className="font-mono text-[15px] font-semibold" />
                <div className="text-xs text-muted">{r.diff_vs_avg_pct != null ? t('overview.vsAvg', { pct: formatPct(r.diff_vs_avg_pct) }) : '—'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
