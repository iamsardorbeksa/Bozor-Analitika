import { useQuery } from '@tanstack/react-query'
import { Bot, Database, Gauge, LineChart as LineIcon, MapPin, Sparkles, TrendingUp } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Api } from '@/api/endpoints'
import type { Forecast, MarketStats, Product, SupplyDemand } from '@/api/types'
import { CHART, axisProps, compactNum, shortDate } from '@/components/charts/theme'
import { ProductPicker } from '@/components/buyer/ProductPicker'
import { Badge, FreshnessBadge, Money, PriceChange, ProductGlyph, ProductSymbol, offerName } from '@/components/market'
import { BarList, Eyebrow, EstimateNote, InterestMeter, Panel, Reveal, SignalBadge, SupplyLevel } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, QueryState, Skeleton } from '@/components/ui/feedback'
import { Field, Select } from '@/components/ui/input'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { useCategories, useProducts } from '@/hooks/useCatalog'
import { formatNumber, formatPct, ln } from '@/lib/format'
import { methodLabel } from '@/lib/humanize'
import { cn } from '@/lib/utils'

export default function MarketIntelligence() {
  const { t } = useTranslation(['seller', 'common'])
  const [params, setParams] = useSearchParams()
  const myOffers = useQuery({ queryKey: ['my-offers', { all: true }], queryFn: () => Api.myOffers({ page_size: 100 }) })
  const products = useProducts()
  const cats = useCategories()

  // The seller's own products (unique), derived from their offers.
  const mine = React.useMemo(() => {
    const seen = new Set<string>()
    const out: { product_id: string; name: string; emoji: string | undefined }[] = []
    for (const o of myOffers.data?.items ?? []) {
      if (o.status === 'removed' || seen.has(o.product_id)) continue
      seen.add(o.product_id)
      out.push({ product_id: o.product_id, name: offerName(o), emoji: o.product_emoji ?? undefined })
    }
    return out
  }, [myOffers.data])

  const productId = params.get('product') ?? mine[0]?.product_id ?? ''
  const setProduct = (id: string) => setParams((p) => { p.set('product', id); return p }, { replace: true })
  const product = products.data?.find((p) => p.id === productId)
  const [cat, setCat] = React.useState('')
  React.useEffect(() => {
    if (product && cats.data) setCat(cats.data.find((c) => c.id === product.category_id)?.slug ?? '')
  }, [product, cats.data])
  const catObj = cats.data?.find((c) => c.slug === cat)

  const aiQ = product ? t('intel.aiQuestion', { product: ln(product, 'name') }) : ''

  return (
    <div>
      <PageHeader eyebrow={t('intel.eyebrow')} title={t('intel.title')} description={t('intel.subtitle')}
        actions={product && <Button variant="dark" asChild><Link to={`/app/ai?q=${encodeURIComponent(aiQ)}`}><Bot /> {t('intel.askAi')}</Link></Button>} />

      <Reveal className="mb-5 rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div className="min-w-0">
            <Eyebrow className="mb-2">{t('intel.yourProducts')}</Eyebrow>
            {myOffers.isLoading ? <Skeleton className="h-9 w-full" /> : mine.length === 0 ? (
              <p className="text-sm text-muted">{t('intel.noOwnProducts')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {mine.map((m) => (
                  <button key={m.product_id} onClick={() => setProduct(m.product_id)}
                    className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
                      m.product_id === productId ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong hover:bg-mint-50')}>
                    <ProductSymbol emoji={m.emoji} size={15} />{m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('intel.anyCategory')} htmlFor="mi-cat">
              <Select id="mi-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">{t('common:fields.allCategories')}</option>
                {cats.data?.map((c) => <option key={c.id} value={c.slug}>{ln(c, 'name')}</option>)}
              </Select>
            </Field>
            <Field label={t('intel.anyProduct')} htmlFor="mi-prod">
              <ProductPicker id="mi-prod" value={productId} categoryId={catObj?.id} placeholder={t('form.choose')} onChange={(p) => setProduct(p.id)} />
            </Field>
          </div>
        </div>
      </Reveal>

      {!productId ? (
        products.isError ? <ErrorState onRetry={() => products.refetch()} /> :
          <EmptyState icon={<LineIcon />} title={t('intel.pickTitle')} description={t('intel.pickBody')} />
      ) : <ProductIntel key={productId} productId={productId} product={product} />}
    </div>
  )
}

function ProductIntel({ productId, product }: { productId: string; product?: Product }) {
  const { t } = useTranslation(['seller', 'common'])
  const [days, setDays] = React.useState<'7' | '30' | '90'>('30')
  const stats = useQuery({ queryKey: ['product-stats', productId], queryFn: () => Api.productStats(productId) })
  const hist = useQuery({ queryKey: ['product-history', productId, days], queryFn: () => Api.productHistory(productId, Number(days)), placeholderData: (p) => p })
  const regional = useQuery({ queryKey: ['product-regional', productId], queryFn: () => Api.productRegional(productId) })
  const forecast = useQuery({ queryKey: ['product-forecast', productId], queryFn: () => Api.productForecast(productId, 7) })
  const sd = useQuery({ queryKey: ['product-sd', productId], queryFn: () => Api.productSupplyDemand(productId) })
  const cats = useCategories()
  const slug = cats.data?.find((c) => c.id === product?.category_id)?.slug
  const unit = product?.unit

  return (
    <div className="space-y-4">
      <QueryState query={stats} skeleton={<Skeleton className="h-[120px] rounded-2xl" />}>
        {(s) => <StatsStrip s={s} product={product} slug={slug} />}
      </QueryState>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel i={1} className="xl:col-span-2" title={t('intel.history')} description={hist.data ? <span>{t('intel.changeInPeriod')}: <PriceChange value={hist.data.change_pct} /></span> : undefined}
          actions={<Segmented id="mi-days" size="sm" value={days} onChange={setDays} options={[
            { value: '7', label: t('common:time.week') }, { value: '30', label: t('common:time.month') }, { value: '90', label: t('common:time.quarter') },
          ]} />}>
          <QueryState query={hist} skeleton={<Skeleton className="h-[260px]" />} isEmpty={(h) => h.series.length < 2}
            empty={<EmptyState icon={<LineIcon />} title={t('intel.noHistory')} className="py-10" />}>
            {(h) => <HistoryChart series={h.series} unit={unit} />}
          </QueryState>
        </Panel>
        <Panel i={2} title={t('intel.regional')} description={t('intel.regionalHint')}>
          <QueryState query={regional} isEmpty={(r) => r.filter((x) => x.avg != null).length === 0}
            empty={<EmptyState icon={<MapPin />} title={t('intel.noRegional')} className="py-10" />}>
            {(rows) => {
              const valid = rows.filter((r) => r.avg != null).sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))
              return <BarList rows={valid.map((r) => ({
                key: r.region_id, label: ln(r, 'region_name'), value: r.avg!,
                sub: r.diff_vs_national_pct != null ? <span className={r.diff_vs_national_pct > 0 ? 'text-up' : 'text-down'}>{formatPct(r.diff_vs_national_pct)}</span> : undefined,
              }))} />
            }}
          </QueryState>
        </Panel>
      </div>

      <Panel i={3} title={t('intel.forecast')} description={t('intel.forecastHint')}
        actions={forecast.data && <ConfidenceBadge f={forecast.data} />}>
        <QueryState query={forecast} skeleton={<Skeleton className="h-[280px]" />}>
          {(f) => <ForecastView f={f} unit={unit} />}
        </QueryState>
      </Panel>

      <Panel i={4} title={t('intel.supplyDemand')} description={t('intel.supplyDemandHint')}>
        <QueryState query={sd} skeleton={<Skeleton className="h-[200px]" />}>
          {(x) => <SupplyDemandView sd={x} />}
        </QueryState>
      </Panel>
    </div>
  )
}

function StatsStrip({ s, product, slug }: { s: MarketStats; product?: Product; slug?: string }) {
  const { t } = useTranslation(['seller', 'common'])
  const unit = product?.unit
  const cells: [string, React.ReactNode][] = [
    [t('range.avg'), <Money value={s.avg} className="font-mono" />],
    [t('range.min'), <Money value={s.min} className="font-mono" />],
    [t('range.max'), <Money value={s.max} className="font-mono" />],
    [t('range.median'), <Money value={s.median} className="font-mono" />],
    [t('intel.change7'), <PriceChange value={s.change_7d_pct} />],
    [t('intel.change30'), <PriceChange value={s.change_30d_pct} />],
  ]
  return (
    <Reveal className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ProductGlyph category={slug} name={product ? ln(product, 'name') : ''} emoji={product?.emoji} size={42} />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{product ? ln(product, 'name') : '—'}</h2>
            <p className="text-xs text-muted">{unit ? t('common:fields.perUnit', { unit: t(`common:unitsLong.${unit}`, unit) }) : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Database className="size-3.5" /><span className="font-mono text-ink">{s.count}</span> {t('intel.activeOffers')}</span>
          <span><span className="font-mono text-ink">{s.verified_count}</span> {t('intel.verifiedOffers')}</span>
          {s.excluded_outliers > 0 && <span>{t('intel.outliers', { count: s.excluded_outliers })}</span>}
          <FreshnessBadge updatedAt={s.last_updated} />
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {cells.map(([k, v]) => (
          <div key={k} className="px-5 py-3.5">
            <dt className="text-[11px] tracking-wide text-muted uppercase">{k}</dt>
            <dd className="mt-1 text-[17px] font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  )
}

function HistoryChart({ series, unit }: { series: { date: string; avg: number; min: number; max: number }[]; unit?: string }) {
  const { t } = useTranslation(['seller', 'common'])
  const data = series.map((p) => ({ date: p.date, avg: p.avg, range: [p.min, p.max] as [number, number] }))
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={compactNum} width={46} domain={['auto', 'auto']} />
          <RTooltip content={<HistTooltip unit={unit} />} />
          <Area dataKey="range" name={t('intel.minMax')} stroke="none" fill={CHART.brand} fillOpacity={0.1} />
          <Line type="monotone" dataKey="avg" name={t('range.avg')} stroke={CHART.brand} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function HistTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: { avg?: number; range?: [number, number]; value?: number; band?: [number, number] } }[]; label?: string; unit?: string }) {
  const { t } = useTranslation('seller')
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-ink shadow-[var(--shadow-lift)] backdrop-blur">
      <div className="mb-1 text-muted">{label ? shortDate(label) : ''}</div>
      {p.avg != null && <div className="flex justify-between gap-4"><span className="text-muted">{t('range.avg')}</span><span className="font-mono">{formatNumber(p.avg)}</span></div>}
      {p.range && <div className="flex justify-between gap-4"><span className="text-muted">{t('intel.minMax')}</span><span className="font-mono">{formatNumber(p.range[0])}–{formatNumber(p.range[1])}</span></div>}
      {p.value != null && p.avg == null && <div className="flex justify-between gap-4"><span className="text-muted">{t('intel.forecastValue')}</span><span className="font-mono">{formatNumber(p.value)}</span></div>}
      {p.band && <div className="flex justify-between gap-4"><span className="text-muted">{t('intel.band')}</span><span className="font-mono">{formatNumber(p.band[0])}–{formatNumber(p.band[1])}</span></div>}
    </div>
  )
}

function ConfidenceBadge({ f }: { f: Forecast }) {
  const { t } = useTranslation('seller')
  const tone = { insufficient: 'neutral', low: 'saffron', medium: 'info', high: 'brand' } as const
  return (
    <Badge tone={tone[f.confidence]}><Gauge /> {t(`confidence.${f.confidence}`)}{f.confidence_score != null && f.sufficient && <span className="font-mono">· {Math.round(f.confidence_score * 100)}%</span>}</Badge>
  )
}

function ForecastView({ f, unit }: { f: Forecast; unit?: string }) {
  const { t } = useTranslation('seller')
  if (!f.sufficient) {
    const pct = Math.min(100, (f.points / Math.max(1, f.min_points)) * 100)
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-paper/60 px-5 py-8 text-center">
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white text-saffron"><TrendingUp className="size-5" /></div>
        <p className="font-semibold">{t('intel.insufficientTitle')}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{t('intel.insufficientBody', { points: f.points, min: f.min_points })}</p>
        <div className="mx-auto mt-4 max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-saffron" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1.5 font-mono text-xs text-muted">{f.points} / {f.min_points}</p>
        </div>
      </div>
    )
  }
  const hist = f.history.slice(-30)
  const last = hist[hist.length - 1]
  const data = [
    ...hist.map((p, i) => ({ date: p.date, avg: p.avg, value: i === hist.length - 1 ? p.avg : undefined, band: i === hist.length - 1 ? [p.avg, p.avg] as [number, number] : undefined })),
    ...f.forecast.map((p) => ({ date: p.date, avg: undefined, value: p.value, band: [p.lower, p.upper] as [number, number] })),
  ]
  const end = f.forecast[f.forecast.length - 1]
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-brand" />{t('intel.actual')}</span>
        <span className="inline-flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed border-saffron" />{t('intel.forecastLine')}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-saffron/20" />{t('intel.band')}</span>
        {f.expected_change_pct != null && end && (
          <span className="ml-auto text-ink-soft">{t('intel.expected', { days: f.forecast.length })}: <Money value={end.value} unit={unit} className="font-mono font-semibold" /> <PriceChange value={f.expected_change_pct} /></span>
        )}
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
            <YAxis {...axisProps} tickFormatter={compactNum} width={46} domain={['auto', 'auto']} />
            <RTooltip content={<HistTooltip unit={unit} />} />
            {last && <ReferenceLine x={last.date} stroke={CHART.axis} strokeDasharray="2 3" label={{ value: t('intel.today'), position: 'insideTopRight', fill: CHART.axis, fontSize: 11 }} />}
            <Area dataKey="band" stroke="none" fill={CHART.saffron} fillOpacity={0.18} connectNulls />
            <Line type="monotone" dataKey="avg" stroke={CHART.brand} strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="value" stroke={CHART.saffron} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">{t('intel.method', { method: methodLabel(t, f.method), points: f.points })}</p>
    </div>
  )
}

function SupplyDemandView({ sd }: { sd: SupplyDemand }) {
  const { t } = useTranslation('seller')
  const o = sd.observed
  const obs: [string, string][] = [
    [t('sd.activeOffers'), formatNumber(o.active_offers)],
    [t('sd.totalQty'), formatNumber(o.total_available_qty)],
    [t('sd.inquiries'), formatNumber(o.purchase_inquiries)],
    [t('sd.views'), formatNumber(o.offer_views)],
    [t('sd.searches'), formatNumber(o.searches)],
    [t('sd.ratio'), o.inquiry_to_offer_ratio != null ? formatNumber(o.inquiry_to_offer_ratio, 2) : '—'],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow className="flex items-center gap-1.5 text-forest"><Database className="size-3.5" />{t('sd.observed')}</Eyebrow>
          <span className="text-xs text-muted">{t('sd.period', { days: sd.period_days })}</span>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {obs.map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-mono text-lg font-semibold tabular">{v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl border border-dashed border-[#e0a868] bg-saffron-50/40 p-4">
        <Eyebrow className="mb-3 flex items-center gap-1.5 text-[#8a4a00]"><Sparkles className="size-3.5" />{t('sd.estimated')}</Eyebrow>
        <div className="space-y-3">
          <div><div className="mb-1 text-xs text-muted">{t('estimate.interest')}</div><InterestMeter value={sd.estimated.interest_index} /></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted">{t('estimate.supply')}</span><SupplyLevel level={sd.estimated.supply_level} /></div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted">{t('estimate.signal')}</span><SignalBadge signal={sd.estimated.signal} /></div>
        </div>
        <EstimateNote className="mt-4 bg-white/70" />
      </div>
    </div>
  )
}
