import { useQuery } from '@tanstack/react-query'
import { BarChart3, Bot, Info, LineChart, MapPinned, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Api } from '@/api/endpoints'
import type { Forecast, MarketStats, Mover, RegionalRow } from '@/api/types'
import { ForecastChart, PriceHistoryChart, RegionalBarChart } from '@/components/analytics/charts'
import { ProductPicker } from '@/components/analytics/ProductPicker'
import { SupplyDemandPanel } from '@/components/analytics/SupplyDemand'
import { ForecastInsufficient, FormulaNote } from '@/components/analytics/notes'
import { Badge, FreshnessBadge, Money, PriceChange, Sparkline, ProductSymbol } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { Select } from '@/components/ui/input'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { useCategories, useProducts, useRegions } from '@/hooks/useCatalog'
import { formatNumber, ln, timeAgo } from '@/lib/format'
import { methodLabel } from '@/lib/humanize'
import { cn } from '@/lib/utils'

type Range = '7' | '30' | '90'

export default function MarketAnalytics(_props: { basePath?: string }) {
  const { t } = useTranslation(['analytics', 'common'])
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [range, setRange] = React.useState<Range>('30')
  const [regionId, setRegionId] = React.useState('')

  const products = useProducts()
  const categories = useCategories()
  const regions = useRegions()
  const movers = useQuery({ queryKey: ['analytics', 'movers', 7, 15], queryFn: () => Api.movers(7, 15) })

  const productId = params.get('product') || movers.data?.[0]?.product_id || products.data?.[0]?.id || null
  const product = products.data?.find((p) => p.id === productId)
  const productName = product ? ln(product, 'name') : ''
  const unit = product?.unit

  const select = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('product', id)
    setParams(next, { replace: true })
  }

  const enabled = !!productId
  const stats = useQuery({ queryKey: ['analytics', 'stats', productId, regionId], queryFn: () => Api.productStats(productId!, regionId || undefined), enabled })
  const history = useQuery({ queryKey: ['analytics', 'history', productId, range, regionId], queryFn: () => Api.productHistory(productId!, Number(range), regionId || undefined), enabled })
  const regional = useQuery({ queryKey: ['analytics', 'regional', productId], queryFn: () => Api.productRegional(productId!), enabled })
  const forecast = useQuery({ queryKey: ['analytics', 'forecast', productId], queryFn: () => Api.productForecast(productId!, 7), enabled })
  const sd = useQuery({ queryKey: ['analytics', 'sd', productId], queryFn: () => Api.productSupplyDemand(productId!), enabled })

  const askAi = () => {
    const q = t('askQuestion', { product: productName || t('picker.placeholder') })
    const target = `/app/ai?q=${encodeURIComponent(q)}`
    if (user) navigate(target)
    else navigate('/login', { state: { from: target } })
  }

  const rangeOptions: { value: Range; label: string }[] = [
    { value: '7', label: t('common:time.week') },
    { value: '30', label: t('common:time.month') },
    { value: '90', label: t('common:time.quarter') },
  ]

  return (
    <div>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2">{t('eyebrow')}</span>}
        title={t('title')}
        description={t('description')}
        actions={<Button variant="dark" onClick={askAi} disabled={!productId}><Bot />{t('askAi')}</Button>}
      />

      {/* controls */}
      <div className="mb-5 flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-2.5 shadow-[var(--shadow-card)] sm:flex-row sm:flex-wrap sm:items-center">
        <ProductPicker products={products.data} categories={categories.data} value={productId} onChange={select} />
        <Segmented id="range" value={range} onChange={setRange} options={rangeOptions} className="w-fit" />
        <div className="sm:w-56">
          <Select value={regionId} onChange={(e) => setRegionId(e.target.value)} aria-label={t('common:fields.region')}>
            <option value="">{t('common:fields.allRegions')}</option>
            {regions.data?.map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto sm:pr-2">
          <FormulaNote />
        </div>
      </div>

      {!productId && !products.isLoading && !movers.isLoading ? (
        <EmptyState icon={<BarChart3 />} title={t('noProduct')} />
      ) : (
        <div className="space-y-5">
          <StatStrip query={stats} unit={unit} />

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><LineChart className="size-4 text-brand" />{t('history.title')}</CardTitle>
                  <CardDescription>{t('history.description', { days: range })}</CardDescription>
                </div>
                {history.data && <div className="text-right"><PriceChange value={history.data.change_pct} className="text-sm" /><div className="text-[11px] text-muted">{t('history.periodChange')}</div></div>}
              </CardHeader>
              <CardContent>
                <QueryState query={history} skeleton={<Skeleton className="h-[280px] w-full" />}
                  isEmpty={(d) => d.series.length < 2}
                  empty={<EmptyState icon={<LineChart />} title={t('history.empty')} description={t('history.emptyHint')} className="py-10" />}>
                  {(d) => (
                    <>
                      <PriceHistoryChart series={d.series} />
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
                        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" />{t('chart.avg')}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-emerald/20" />{t('chart.range')}</span>
                        <span className="ml-auto">{t('history.method')}</span>
                      </div>
                    </>
                  )}
                </QueryState>
              </CardContent>
            </Card>

            <ForecastCard query={forecast} />
          </div>

          <RegionalCard query={regional} unit={unit} />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t('sd.title')}</CardTitle>
                <CardDescription>{t('sd.description')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <QueryState query={sd} skeleton={<Skeleton className="h-40 w-full" />}>
                {(d) => <SupplyDemandPanel data={d} unit={unit} />}
              </QueryState>
            </CardContent>
          </Card>

          <MoversCard query={movers} selected={productId} onSelect={(id) => { select(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- stat strip
function StatStrip({ query, unit }: { query: { data: MarketStats | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown }; unit?: string }) {
  const { t } = useTranslation(['analytics', 'common'])
  return (
    <QueryState query={query}
      skeleton={<div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[74px]" />)}</div>}
      isEmpty={(s) => s.count === 0}
      empty={<EmptyState icon={<BarChart3 />} title={t('stats.empty')} description={t('stats.emptyHint')} className="py-10" />}>
      {(s) => {
        const cells: { label: string; value: React.ReactNode; hint?: React.ReactNode }[] = [
          { label: t('stats.avg'), value: <Money value={s.avg} unit={unit} /> },
          { label: t('stats.median'), value: <Money value={s.median} unit={unit} /> },
          { label: t('stats.min'), value: <Money value={s.min} unit={unit} /> },
          { label: t('stats.max'), value: <Money value={s.max} unit={unit} /> },
          { label: t('stats.change7'), value: <PriceChange value={s.change_7d_pct} /> },
          { label: t('stats.change30'), value: <PriceChange value={s.change_30d_pct} /> },
          { label: t('stats.offers'), value: <span className="tabular">{formatNumber(s.count)}</span>, hint: t('stats.verifiedOf', { n: s.verified_count }) },
          { label: t('stats.updated'), value: <span className="text-[15px]">{timeAgo(s.last_updated)}</span>, hint: <FreshnessBadge updatedAt={s.last_updated} showLabel /> },
        ]
        return (
          <div>
            <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-[var(--shadow-card)] md:grid-cols-4" style={{ gap: 1 }}>
              {cells.map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white px-4 py-3">
                  <div className="text-[12px] text-muted">{c.label}</div>
                  <div className="mt-1 font-mono text-[17px] font-semibold text-ink">{c.value}</div>
                  {c.hint && <div className="mt-0.5 text-[11px] text-muted">{c.hint}</div>}
                </motion.div>
              ))}
            </div>
            {s.excluded_outliers > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Info className="size-3.5" />{t('stats.outliers', { count: s.excluded_outliers })}</p>
            )}
          </div>
        )
      }}
    </QueryState>
  )
}

// ---------------------------------------------------------------- forecast
const CONF_TONE = { high: 'brand', medium: 'info', low: 'saffron', insufficient: 'neutral' } as const

function ForecastCard({ query }: { query: { data: Forecast | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown } }) {
  const { t } = useTranslation('analytics')
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-saffron" />{t('forecast.title')}</CardTitle>
          <CardDescription>{t('forecast.description')}</CardDescription>
        </div>
        {query.data && <Badge tone={CONF_TONE[query.data.confidence]}>{t(`forecast.confidence.${query.data.confidence}`)}</Badge>}
      </CardHeader>
      <CardContent>
        <QueryState query={query} skeleton={<Skeleton className="h-[220px] w-full" />}>
          {(f) => !f.sufficient || f.forecast.length === 0 ? <ForecastInsufficient points={f.points} minPoints={f.min_points} /> : (
            <>
              <ForecastChart history={f.history.slice(-21)} forecast={f.forecast} height={210} compact />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-paper px-2.5 py-2">
                  <div className="text-muted">{t('forecast.expected')}</div>
                  <PriceChange value={f.expected_change_pct ?? null} className="font-mono text-sm" />
                </div>
                <div className="rounded-lg bg-paper px-2.5 py-2">
                  <div className="text-muted">{t('forecast.score')}</div>
                  <div className="font-mono text-sm font-medium tabular">{f.confidence_score != null ? `${Math.round(f.confidence_score * 100)}%` : '—'}</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted">{t('forecast.method')}: {methodLabel(t, f.method)} · {t('forecast.points', { n: f.points })}</p>
              <p className="mt-1 text-[11px] text-muted">{t('forecast.caveat')}</p>
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- regional
function RegionalCard({ query, unit }: { query: { data: RegionalRow[] | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown }; unit?: string }) {
  const { t } = useTranslation(['analytics', 'common'])
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><MapPinned className="size-4 text-brand" />{t('regional.title')}</CardTitle>
          <CardDescription>{t('regional.description')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <QueryState query={query} skeleton={<Skeleton className="h-64 w-full" />}
          isEmpty={(rows) => rows.filter((r) => r.avg != null).length === 0}
          empty={<EmptyState icon={<MapPinned />} title={t('regional.empty')} className="py-10" />}>
          {(raw) => {
            const rows = raw.filter((r) => r.avg != null).sort((a, b) => a.avg! - b.avg!)
            const totalCount = rows.reduce((s, r) => s + r.count, 0)
            const national = totalCount ? rows.reduce((s, r) => s + r.avg! * r.count, 0) / totalCount : null
            return (
              <div className="grid gap-5 xl:grid-cols-2">
                <RegionalBarChart rows={rows.map((r) => ({ name: ln(r, 'region_name'), avg: r.avg! }))} national={national} />
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] tracking-[0.04em] text-muted uppercase">
                        <th className="border-b border-line py-2 pr-2 font-medium">{t('common:fields.region')}</th>
                        <th className="border-b border-line px-2 py-2 text-right font-medium">{t('regional.offers')}</th>
                        <th className="border-b border-line px-2 py-2 text-right font-medium">{t('stats.avg')}</th>
                        <th className="border-b border-line px-2 py-2 text-right font-medium">{t('regional.range')}</th>
                        <th className="border-b border-line py-2 pl-2 text-right font-medium">{t('regional.vsNational')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.region_id} className="border-b border-line last:border-0">
                          <td className="border-b border-line py-2 pr-2">
                            <span className="font-medium">{ln(r, 'region_name')}</span>
                            {i === 0 && <Badge tone="brand" className="ml-1.5">{t('regional.cheapest')}</Badge>}
                          </td>
                          <td className="border-b border-line px-2 py-2 text-right font-mono tabular">{r.count}</td>
                          <td className="border-b border-line px-2 py-2 text-right font-mono"><Money value={r.avg} unit={unit} /></td>
                          <td className="border-b border-line px-2 py-2 text-right font-mono text-xs text-muted tabular">{formatNumber(r.min)}–{formatNumber(r.max)}</td>
                          <td className="border-b border-line py-2 pl-2 text-right font-mono"><PriceChange value={r.diff_vs_national_pct} showIcon={false} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-muted">{t('regional.note')}</p>
                </div>
              </div>
            )
          }}
        </QueryState>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- movers
function MoversCard({ query, selected, onSelect }: {
  query: { data: Mover[] | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown }; selected: string | null; onSelect: (id: string) => void
}) {
  const { t } = useTranslation(['analytics', 'common'])
  const cols: Column<Mover>[] = [
    { key: 'name', header: t('common:fields.product'), sortValue: (m) => ln(m, 'name'),
      cell: (m) => <span className="flex items-center gap-2 font-medium text-ink"><ProductSymbol emoji={m.emoji} size={18} />{ln(m, 'name')}</span> },
    { key: 'spark', header: t('movers.trend'), cell: (m) => <Sparkline data={m.spark} width={92} height={26} /> },
    { key: 'prev', header: t('movers.previous'), align: 'right', sortValue: (m) => m.previous_avg,
      cell: (m) => <Money value={m.previous_avg} unit={m.unit} className="font-mono text-muted" /> },
    { key: 'cur', header: t('movers.current'), align: 'right', sortValue: (m) => m.current_avg,
      cell: (m) => <Money value={m.current_avg} unit={m.unit} className="font-mono font-medium" /> },
    { key: 'chg', header: t('movers.change'), align: 'right', sortValue: (m) => m.change_pct,
      cell: (m) => <PriceChange value={m.change_pct} className="font-mono" /> },
  ]
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t('movers.title')}</CardTitle>
          <CardDescription>{t('movers.description')}</CardDescription>
        </div>
        <FormulaNote />
      </CardHeader>
      <QueryState query={query} skeleton={<div className="px-5 pb-5"><SkeletonRows /></div>} isEmpty={(d) => d.length === 0}
        empty={<div className="px-5 pb-5"><EmptyState title={t('movers.empty')} className="py-10" /></div>}>
        {(rows) => (
          <div className="pb-2">
            <DataTable columns={cols} rows={rows} rowKey={(m) => m.product_id} onRowClick={(m) => onSelect(m.product_id)} dense
              rowClassName={(m) => cn('cursor-pointer', m.product_id === selected && 'bg-mint-50')}
              initialSort={{ key: 'chg', dir: 'desc' }} />
            <p className="px-5 pt-2 text-[11px] text-muted">{t('movers.hint')} · {t('formula.expr')}</p>
          </div>
        )}
      </QueryState>
    </Card>
  )
}

function SkeletonRows() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
}
