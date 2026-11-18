import { useQuery } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip as RTooltip, XAxis, YAxis, ZAxis, Cell } from 'recharts'
import { Api } from '@/api/endpoints'
import type { SupplyDemandRow } from '@/api/types'
import { CHART, axisProps } from '@/components/charts/theme'
import { CategoryDonut, DemandGaps, SignupsChart } from '@/components/admin/charts'
import { BarList, EstimateNote, Panel, SignalBadge } from '@/components/seller/kit'
import { EmptyState, ErrorState, QueryState, Skeleton } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/layout'
import { formatNumber, ln } from '@/lib/format'
import { ProductSymbol } from '@/components/market'

const SIGNAL_COLOR: Record<SupplyDemandRow['estimated']['signal'], string> = {
  demand_gap: CHART.danger, undersupplied: CHART.saffron, oversupplied: '#3b5bdb', balanced: CHART.emerald,
}

export default function PlatformAnalytics() {
  const { t } = useTranslation(['admin', 'seller', 'common'])
  const dash = useQuery({ queryKey: ['admin-dashboard'], queryFn: Api.adminDashboard })
  const sd = useQuery({ queryKey: ['supply-demand'], queryFn: Api.supplyDemand })
  const header = <PageHeader eyebrow={t('analytics.eyebrow')} title={t('analytics.title')} description={t('analytics.subtitle')} />
  if (dash.isLoading) return <div>{header}<div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div></div>
  if (dash.isError || !dash.data) return <div>{header}<ErrorState onRetry={() => dash.refetch()} /></div>
  const d = dash.data

  return (
    <div>
      {header}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel i={0} title={t('analytics.categoryTitle')} description={t('analytics.categoryHint')}>
          <CategoryDonut rows={d.by_category} />
        </Panel>
        <Panel i={1} title={t('analytics.regionTitle')} description={t('analytics.regionHint')}>
          {d.by_region.length === 0 ? <EmptyState className="py-10" /> : (
            <BarList color="bg-ink" rows={[...d.by_region].sort((a, b) => b.views - a.views).map((r) => ({
              key: r.code, label: ln(r, 'name'), value: r.views, sub: <>· {t('overview.offersCount', { count: r.offers })}</>,
            }))} />
          )}
        </Panel>
      </div>

      <Panel i={2} className="mt-4" title={t('overview.signups')} description={t('overview.signupsHint')}>
        <SignupsChart data={d.signups} />
      </Panel>

      <Panel i={3} className="mt-4" title={t('analytics.sdTitle')} description={t('analytics.sdHint')}>
        <EstimateNote className="mb-4" />
        <QueryState query={sd} skeleton={<Skeleton className="h-[320px]" />} isEmpty={(x) => x.rows.length === 0}>
          {(x) => <SupplyDemandScatter rows={x.rows} />}
        </QueryState>
      </Panel>

      <Panel i={4} className="mt-4" title={t('overview.demandGaps')} description={t('overview.demandGapsHint')}>
        <QueryState query={sd} skeleton={<Skeleton className="h-32" />} isEmpty={(x) => x.demand_gaps.length === 0}
          empty={<EmptyState icon={<SearchX />} title={t('overview.noGaps')} className="py-8" />}>
          {(x) => <DemandGaps gaps={x.demand_gaps} />}
        </QueryState>
      </Panel>
    </div>
  )
}

function SupplyDemandScatter({ rows }: { rows: SupplyDemandRow[] }) {
  const { t } = useTranslation(['admin', 'seller'])
  const data = rows.map((r) => ({
    name: ln(r, 'name'), offers: r.observed.active_offers, interest: r.estimated.interest_index, searches: r.observed.searches,
    signal: r.estimated.signal,
  }))
  const signals = Array.from(new Set(data.map((d) => d.signal)))
  const sorted = [...rows].sort((a, b) => b.estimated.interest_index - a.estimated.interest_index).slice(0, 8)
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-2 flex flex-wrap gap-3 text-xs">
          {signals.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-ink-soft"><span className="size-2.5 rounded-full" style={{ background: SIGNAL_COLOR[s] }} />{t(`seller:signal.${s}`)}</span>
          ))}
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 12, left: -8, bottom: 16 }}>
              <CartesianGrid stroke={CHART.grid} />
              <XAxis type="number" dataKey="offers" name={t('seller:sd.activeOffers')} allowDecimals={false} {...axisProps}
                label={{ value: t('analytics.xAxis'), position: 'insideBottom', offset: -8, fontSize: 11, fill: CHART.axis }} />
              <YAxis type="number" dataKey="interest" name={t('seller:estimate.interest')} domain={[0, 100]} {...axisProps}
                label={{ value: t('analytics.yAxis'), angle: -90, position: 'insideLeft', offset: 18, fontSize: 11, fill: CHART.axis }} />
              <ZAxis type="number" dataKey="searches" range={[50, 360]} />
              <RTooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTip />} />
              <Scatter data={data}>
                {data.map((d) => <Cell key={d.name} fill={SIGNAL_COLOR[d.signal]} fillOpacity={0.75} stroke="#fff" />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">{t('analytics.topInterest')}</p>
        <ul className="divide-y divide-line">
          {sorted.map((r) => (
            <li key={r.product_id} className="flex items-center gap-3 py-2">
              <ProductSymbol emoji={r.emoji} size={17} /><span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{ln(r, 'name')}</span>
              <span className="font-mono text-xs text-muted">{r.observed.active_offers} / {formatNumber(r.observed.searches)}</span>
              <SignalBadge signal={r.estimated.signal} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">{t('analytics.listLegend')}</p>
      </div>
    </div>
  )
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; offers: number; interest: number; searches: number } }[] }) {
  const { t } = useTranslation(['admin', 'seller'])
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-ink shadow-[var(--shadow-lift)] backdrop-blur">
      <div className="mb-1 font-medium">{p.name}</div>
      <div className="flex justify-between gap-4"><span className="text-muted">{t('seller:sd.activeOffers')}</span><span className="font-mono">{p.offers}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted">{t('seller:estimate.interest')}</span><span className="font-mono">{p.interest}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted">{t('seller:sd.searches')}</span><span className="font-mono">{p.searches}</span></div>
    </div>
  )
}
