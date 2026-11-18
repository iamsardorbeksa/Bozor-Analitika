/* Plain-language "what was checked" cards shown under each analyst answer. Outputs come from backend/app/ai/tools.py. */
import {
  AlertTriangle, BadgeCheck, BarChart3, Calculator, CalendarDays, Database, Filter, LineChart, MapPin, MapPinned, Scale, Search,
  ShieldCheck, Star, Tag, TrendingUp, Users, Wallet,
} from 'lucide-react'
import type { TFunction } from 'i18next'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Category, Product, SeriesPoint, SupplyDemand, ToolCall } from '@/api/types'
import { BarList, ForecastChart, PriceHistoryChart, type ForecastPoint } from '@/components/analytics/charts'
import { ForecastInsufficient } from '@/components/analytics/notes'
import { SignalBadge, SupplyDemandPanel } from '@/components/analytics/SupplyDemand'
import { Badge, Money, PriceChange, ProductSymbol } from '@/components/market'
import { useCategories, useProducts } from '@/hooks/useCatalog'
import { formatNumber, formatPct, formatUZS, ln, timeAgo, uz } from '@/lib/format'
import { methodLabel, toolLabel } from '@/lib/humanize'
import { fold } from '@/lib/search'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------- output shapes
interface Named { product?: string; product_name_uz?: string; product_name_ru?: string; product_name_en?: string; product_emoji?: string; emoji?: string }
interface OfferBrief extends Named {
  offer_id: string; title: string; product: string; supplier: string; supplier_verified: boolean; supplier_rating: number
  unit: string; unit_price_uzs: number; available_qty: number; min_order_qty: number; quality: string; region: string
  market: string | null; delivery: { available: boolean; price_uzs: number; days: number }; source: string; last_updated: string
}
interface CompareRowOut extends OfferBrief {
  subtotal_uzs: number; delivery_cost_uzs: number; total_cost_uzs: number; score: number; is_recommended: boolean; is_cheapest: boolean
  reasons: string[]; enough_stock: boolean; meets_moq: boolean
}
interface MoverOut { product_id: string; name_uz: string; name_ru: string; name_en: string; emoji?: string; unit: string; current_avg: number; change_pct: number }
interface RegionOut { region_id: string; region_name_uz: string; region_name_ru: string; region_name_en: string; avg: number | null; count: number; diff_vs_national_pct: number | null }
interface CostLine extends Named { quantity?: number; unit?: string; offer?: OfferBrief; subtotal_uzs?: number; delivery_uzs?: number; total_uzs?: number; error?: string; query?: string }
interface PlanLine extends Named { price_change_7d_pct: number; quantity: number; unit: string; offer: OfferBrief; total_uzs: number }

type Out = Record<string, unknown>
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const cap = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s)

const TOOL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  search_products: Search, compare_offers: Scale, get_price_history: LineChart, get_price_forecast: TrendingUp,
  get_regional_comparison: MapPinned, get_market_statistics: BarChart3, analyze_supply_demand: Database,
  calculate_purchase_cost: Calculator, recommend_suppliers: Users,
}

// ---------------------------------------------------------------- catalogue lookups
/** Resolve free-text product names (as typed by the user or the model) to catalogue products. */
function useCatalogLookup() {
  const products = useProducts()
  const cats = useCategories()
  return React.useMemo(() => {
    const exact = new Map<string, Product>()
    for (const p of products.data ?? []) for (const n of [p.name_uz, p.name_ru, p.name_en, p.slug]) { const k = fold(n); if (k && !exact.has(k)) exact.set(k, p) }
    const list = products.data ?? []
    const product = (text: string | null | undefined): Product | undefined => {
      const k = fold(text)
      if (!k) return undefined
      const hit = exact.get(k)
      if (hit || k.length < 4) return hit
      return list.find((p) => [p.name_uz, p.name_ru, p.name_en].some((n) => { const f = fold(n); return f.length >= 4 && (f.startsWith(k) || k.startsWith(f)) }))
    }
    const category = (slug: string | null | undefined): Category | undefined => {
      const k = fold(slug)
      return k ? (cats.data ?? []).find((c) => c.slug === k || [c.name_uz, c.name_ru, c.name_en].some((n) => fold(n) === k)) : undefined
    }
    return { product, category }
  }, [products.data, cats.data])
}
type Lookup = ReturnType<typeof useCatalogLookup>
const LookupCtx = React.createContext<Lookup | null>(null)
const useLookup = () => React.useContext(LookupCtx)!

/** Localized product name + symbol for a tool-output row (prefers the row's own localized names). */
function useProductLabel() {
  const look = useLookup()
  return React.useCallback((o: Named | null | undefined, fallbackText?: string | null) => {
    const base = o?.product_name_uz ?? o?.product ?? fallbackText ?? ''
    const cat = look.product(base)
    const name = o && (o.product_name_ru || o.product_name_en)
      ? ln({ product_name_uz: base, product_name_ru: o.product_name_ru, product_name_en: o.product_name_en }, 'product_name')
      : cat ? ln(cat, 'name') : uz(cap(base))
    return { name, emoji: o?.product_emoji ?? o?.emoji ?? cat?.emoji, unit: cat?.unit }
  }, [look])
}

// ---------------------------------------------------------------- shared bits
function OfferRow({ o, right, rank, tags, showProduct }: { o: OfferBrief; right?: React.ReactNode; rank?: number; tags?: React.ReactNode; showProduct?: boolean }) {
  const { t } = useTranslation(['ai', 'common'])
  const label = useProductLabel()(o)
  return (
    <Link to={`/app/market/${o.offer_id}`}
      className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-line hover:bg-paper">
      {rank != null && <span className="grid size-6 shrink-0 place-items-center rounded-md bg-forest font-mono text-[11px] font-semibold text-white">{rank}</span>}
      <ProductSymbol emoji={label.emoji} size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {showProduct && <span className="truncate text-[13px] font-medium text-ink">{label.name} ·</span>}
          <span className={cn('truncate text-[13px] group-hover:text-brand', showProduct ? 'text-ink-soft' : 'font-medium text-ink')}>{uz(o.supplier)}</span>
          {o.supplier_verified && <BadgeCheck className="size-3.5 shrink-0 fill-brand text-white" aria-label={t('common:verified.badge')} />}
          {tags}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted">
          {uz(o.region)}{o.market ? ` · ${uz(o.market)}` : ''} · ★{o.supplier_rating.toFixed(1)} · {t(`common:quality.${o.quality}`, '')}
          {' · '}{o.delivery.available ? t('common:delivery.available', { days: o.delivery.days }) : t('common:delivery.pickup')}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {right ?? <Money value={o.unit_price_uzs} unit={o.unit} className="font-mono text-[13px] font-medium" />}
      </div>
    </Link>
  )
}

function Meta({ children }: { children: React.ReactNode }) {
  return <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-[11px] text-muted">{children}</div>
}

function DataNote({ out }: { out: Out }) {
  const { t } = useTranslation('ai')
  const n = num(out.offers_considered)
  const updated = str(out.last_updated)
  if (n == null && !updated) return null
  return (
    <Meta>
      {n != null && <span>{t('ev.offersConsidered', { n })}</span>}
      {updated && <span>{t('ev.updated', { time: timeAgo(updated) })}</span>}
    </Meta>
  )
}

function Stat({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-paper px-2.5 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-ink">{children}</div>
    </div>
  )
}

function ShowMore<T>({ items, initial = 5, render }: { items: T[]; initial?: number; render: (x: T, i: number) => React.ReactNode }) {
  const { t } = useTranslation('ai')
  const [all, setAll] = React.useState(false)
  const shown = all ? items : items.slice(0, initial)
  return (
    <>
      {shown.map(render)}
      {items.length > initial && (
        <button onClick={() => setAll((v) => !v)} className="mt-1 px-2 text-xs font-medium text-brand hover:underline">
          {all ? t('ev.showLess') : t('ev.showMore', { n: items.length - initial })}
        </button>
      )}
    </>
  )
}

const unitLabel = (t: TFunction, unit: string | null | undefined): string => (unit ? t(`common:units.${unit}`, { defaultValue: unit }) : '')

// ---------------------------------------------------------------- per-tool renderers
function CompareView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'common'])
  const rows = arr<CompareRowOut>(out.rows)
  if (!rows.length) return <p className="text-xs text-muted">{t('ev.noOffers')}</p>
  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[520px] text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] tracking-[0.05em] text-muted uppercase">
              <th className="pb-1.5 font-medium">{t('common:fields.supplier')}</th>
              <th className="pb-1.5 text-right font-medium">{t('common:fields.unitPrice')}</th>
              <th className="pb-1.5 text-right font-medium">{t('common:fields.deliveryCost')}</th>
              <th className="pb-1.5 text-right font-medium">{t('common:fields.total')}</th>
              <th className="pb-1.5 text-right font-medium">{t('ev.score')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.offer_id} className={cn('border-t border-line', r.is_recommended && 'bg-mint-50')}>
                <td className="py-1.5 pr-2">
                  <Link to={`/app/market/${r.offer_id}`} className="font-medium text-ink hover:text-brand">{uz(r.supplier)}</Link>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {r.is_recommended && <Badge tone="dark">{t('ev.recommended')}</Badge>}
                    {r.is_cheapest && <Badge tone="brand">{t('ev.cheapest')}</Badge>}
                    {r.supplier_verified && <Badge tone="outline"><BadgeCheck />{t('common:verified.badge')}</Badge>}
                    {!r.enough_stock && <Badge tone="danger">{t('ev.lowStock')}</Badge>}
                    {!r.meets_moq && <Badge tone="saffron">{t('ev.belowMoq')}</Badge>}
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono tabular">{formatNumber(r.unit_price_uzs)}</td>
                <td className="py-1.5 text-right font-mono text-muted tabular">{formatNumber(r.delivery_cost_uzs)}</td>
                <td className="py-1.5 text-right font-mono font-semibold tabular">{formatNumber(r.total_cost_uzs)}</td>
                <td className="py-1.5 text-right font-mono tabular">{r.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Meta>
        {num(out.average_total_uzs) != null && <span>{t('ev.avgTotal')}: <b className="font-mono text-ink">{formatUZS(num(out.average_total_uzs))}</b></span>}
        {num(out.savings_vs_average_uzs) != null && <span>{t('ev.savings')}: <b className="font-mono text-brand">{formatUZS(num(out.savings_vs_average_uzs))}</b></span>}
        <span>{t('ev.formula')}</span>
      </Meta>
      <DataNote out={out} />
    </div>
  )
}

function HistoryView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'analytics'])
  const series = arr<SeriesPoint>(out.series)
  if (series.length < 2) return <p className="text-xs text-muted">{t('ev.noHistory')}</p>
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm"><Money value={series[0].avg} /> → <Money value={series[series.length - 1].avg} unit={str(out.unit) ?? undefined} /></span>
        <PriceChange value={num(out.change_pct)} className="text-sm" />
      </div>
      <PriceHistoryChart series={series} height={150} compact />
      <Meta>
        <span>{t('ev.points', { n: series.length })}</span>
        <span>{t('analytics:history.method')}</span>
      </Meta>
    </div>
  )
}

function ForecastView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'analytics'])
  const fc = arr<ForecastPoint>(out.forecast)
  if (!out.sufficient || !fc.length) return <ForecastInsufficient points={num(out.points) ?? 0} minPoints={num(out.min_points) ?? 0} />
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="info">{t(`analytics:forecast.confidence.${str(out.confidence) ?? 'low'}`)}</Badge>
        <span className="text-muted">{t('analytics:forecast.expected')}:</span>
        <PriceChange value={num(out.expected_change_pct)} />
      </div>
      <ForecastChart history={arr<SeriesPoint>(out.history)} forecast={fc} height={160} compact />
      <Meta>
        <span>{t('analytics:forecast.method')}: {methodLabel(t, str(out.method))}</span>
        <span>{t('ev.points', { n: num(out.points) ?? 0 })}</span>
      </Meta>
    </div>
  )
}

function RegionalView({ out }: { out: Out }) {
  const { t } = useTranslation('ai')
  const rows = arr<RegionOut>(out.regions).filter((r) => r.avg != null)
  if (!rows.length) return <p className="text-xs text-muted">{t('ev.noOffers')}</p>
  const sorted = [...rows].sort((a, b) => a.avg! - b.avg!)
  return (
    <div>
      <BarList rows={sorted.map((r, i) => ({
        label: ln(r, 'region_name'), value: r.avg!, highlight: i === 0 ? 'good' : i === sorted.length - 1 ? 'bad' : undefined,
        note: <PriceChange value={r.diff_vs_national_pct} showIcon={false} className="w-14 text-right text-[11px]" />,
      }))} />
      <Meta>
        <span>{t('ev.cheapestRegion')}: <b className="text-ink">{ln(sorted[0], 'region_name')}</b></span>
        {num(out.spread_cheapest_to_priciest_pct) != null && <span>{t('ev.spread')}: <b className="font-mono text-ink">{formatPct(num(out.spread_cheapest_to_priciest_pct))}</b></span>}
      </Meta>
    </div>
  )
}

function SearchView({ out }: { out: Out }) {
  const { t } = useTranslation('ai')
  const offers = arr<OfferBrief>(out.offers)
  if (!offers.length) return <p className="text-xs text-muted">{t('ev.noOffers')}</p>
  const mixed = new Set(offers.map((o) => o.product)).size > 1
  return (
    <div>
      <div className="-mx-2"><ShowMore items={offers} render={(o) => <OfferRow key={o.offer_id} o={o} showProduct={mixed} />} /></div>
      <Meta><span>{t('ev.totalMatches', { n: num(out.total_matches) ?? offers.length })}</span></Meta>
      <DataNote out={out} />
    </div>
  )
}

function StatsView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'analytics', 'common'])
  if (str(out.product)) {
    const unit = str(out.unit)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t('analytics:stats.avg')}><Money value={num(out.avg)} /></Stat>
          <Stat label={t('analytics:stats.median')}><Money value={num(out.median)} /></Stat>
          <Stat label={t('analytics:stats.min')}><Money value={num(out.min)} /></Stat>
          <Stat label={t('analytics:stats.max')}><Money value={num(out.max)} /></Stat>
          <Stat label={t('analytics:stats.change7')}><PriceChange value={num(out.change_7d_pct)} /></Stat>
          <Stat label={t('analytics:stats.change30')}><PriceChange value={num(out.change_30d_pct)} /></Stat>
          <Stat label={t('analytics:stats.offers')}>{formatNumber(num(out.count))}</Stat>
          <Stat label={t('ev.totalQty')}>{formatNumber(num(out.total_qty))}{unit ? <span className="ml-1 text-[11px] font-normal text-muted">{unitLabel(t, unit)}</span> : null}</Stat>
        </div>
        <Meta>
          {str(out.last_updated) && <span>{t('ev.updated', { time: timeAgo(str(out.last_updated)) })}</span>}
          {(num(out.excluded_outliers) ?? 0) > 0 && <span>{t('analytics:stats.outliers', { count: num(out.excluded_outliers) ?? 0 })}</span>}
        </Meta>
      </div>
    )
  }
  const up = arr<MoverOut>(out.largest_increases_7d)
  const down = arr<MoverOut>(out.largest_decreases_7d)
  const List = ({ items, title }: { items: MoverOut[]; title: string }) => (
    <div className="rounded-lg border border-line p-2.5">
      <div className="mb-1.5 text-[11px] font-medium tracking-[0.05em] text-muted uppercase">{title}</div>
      {items.length === 0 ? <p className="text-xs text-muted">—</p> : items.map((m) => (
        <div key={m.product_id} className="flex items-center justify-between gap-2 py-1 text-[12.5px]">
          <span className="flex min-w-0 items-center gap-1.5"><ProductSymbol emoji={m.emoji} size={16} /><span className="truncate">{ln(m, 'name')}</span></span>
          <span className="flex items-center gap-2"><Money value={m.current_avg} className="font-mono text-muted" /><PriceChange value={m.change_pct} className="w-16 justify-end font-mono" /></span>
        </div>
      ))}
    </div>
  )
  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Stat label={t('ev.activeOffers')}>{formatNumber(num(out.active_offers))}</Stat>
        <Stat label={t('ev.activeSuppliers')}>{formatNumber(num(out.active_suppliers))}</Stat>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <List items={up} title={t('ev.increases')} />
        <List items={down} title={t('ev.decreases')} />
      </div>
    </div>
  )
}

function SupplyView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'analytics', 'common'])
  const label = useProductLabel()
  if (out.observed && out.estimated) {
    return <SupplyDemandPanel dense data={{ observed: out.observed as SupplyDemand['observed'], estimated: out.estimated as SupplyDemand['estimated'], period_days: num(out.period_days) ?? 30 }} />
  }
  const low = arr<Named & { product: string; unit: string; active_offers: number; total_available_qty: number; searches: number; signal: SupplyDemand['estimated']['signal']; interest_index: number }>(out.lowest_supply)
  const gaps = arr<{ product_id: string; name_uz: string; name_ru: string; name_en: string; emoji?: string; searches: number; active_offers: number }>(out.demand_gaps)
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-[11px] font-medium tracking-[0.05em] text-brand uppercase">{t('ev.lowestSupply')}</div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[420px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] text-muted uppercase">
                <th className="pb-1 font-medium">{t('common:fields.product')}</th>
                <th className="pb-1 text-right font-medium">{t('analytics:sd.activeOffers')}</th>
                <th className="pb-1 text-right font-medium">{t('analytics:sd.totalQty')}</th>
                <th className="pb-1 text-right font-medium">{t('analytics:sd.searches')}</th>
                <th className="pb-1 text-right font-medium">{t('ev.signal')}</th>
              </tr>
            </thead>
            <tbody>
              {low.map((r) => {
                const l = label(r)
                return (
                  <tr key={r.product} className="border-t border-line">
                    <td className="py-1.5"><span className="flex items-center gap-1.5"><ProductSymbol emoji={l.emoji} size={16} />{l.name}</span></td>
                    <td className="py-1.5 text-right font-mono tabular">{r.active_offers}</td>
                    <td className="py-1.5 text-right font-mono tabular">{formatNumber(r.total_available_qty)} <span className="text-muted">{unitLabel(t, r.unit)}</span></td>
                    <td className="py-1.5 text-right font-mono tabular">{r.searches}</td>
                    <td className="py-1.5 text-right"><SignalBadge signal={r.signal} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {gaps.length > 0 && (
        <div className="rounded-lg border border-dashed border-[#e2b766] bg-saffron-50/50 p-2.5">
          <div className="mb-1 text-[11px] font-medium tracking-[0.05em] text-[#9a6514] uppercase">{t('ev.demandGaps')}</div>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((g) => (
              <Badge key={g.product_id} tone="outline"><ProductSymbol emoji={g.emoji} size={13} />{ln(g, 'name')} · <span className="font-mono">{t('ev.gapNums', { s: g.searches, o: g.active_offers })}</span></Badge>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted">{t('analytics:sd.disclaimer')}</p>
    </div>
  )
}

function CostView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'common'])
  const label = useProductLabel()
  const lines = arr<CostLine>(out.lines)
  const plan = arr<PlanLine>(out.budget_plan)
  const budget = num(out.budget_uzs)
  return (
    <div className="space-y-2">
      {lines.length > 0 && (
        <div className="-mx-2">
          {lines.map((l, i) => {
            const pl = label(l, l.query)
            return l.error || !l.offer ? (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs text-danger"><AlertTriangle className="size-3.5" />{pl.name}: {t(`ev.err.${l.error}`, t('ev.err.generic'))}</div>
            ) : (
              <OfferRow key={i} o={{ ...l.offer, product_emoji: l.offer.product_emoji ?? pl.emoji }}
                tags={<span className="text-[11.5px] text-muted">{pl.name} · {formatNumber(l.quantity ?? 0)} {unitLabel(t, l.unit)}</span>}
                right={<div><div className="font-mono text-[13px] font-semibold">{formatUZS(l.total_uzs ?? 0)}</div><div className="text-[10.5px] text-muted">{formatNumber(l.offer.unit_price_uzs)} × {formatNumber(l.quantity ?? 0)}</div></div>} />
            )
          })}
        </div>
      )}
      {plan.length > 0 && (
        <div className="-mx-2">
          {plan.map((p, i) => {
            const pl = label(p)
            return (
              <OfferRow key={i} o={{ ...p.offer, product_emoji: p.offer.product_emoji ?? pl.emoji }} rank={i + 1}
                tags={<span className="text-[11.5px] text-muted">{pl.name} <PriceChange value={p.price_change_7d_pct} showIcon={false} className="text-[11px]" /></span>}
                right={<div><div className="font-mono text-[13px] font-semibold">{formatUZS(p.total_uzs)}</div><div className="text-[10.5px] text-muted">{formatNumber(p.quantity)} {unitLabel(t, p.unit)} × {formatNumber(p.offer.unit_price_uzs)}</div></div>} />
            )
          })}
        </div>
      )}
      {!lines.length && !plan.length && <p className="text-xs text-muted">{t('ev.noOffers')}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {lines.length > 0 && <Stat label={t('ev.grandTotal')}>{formatUZS(num(out.grand_total_uzs))}</Stat>}
        {plan.length > 0 && <Stat label={t('ev.plannedTotal')}>{formatUZS(num(out.planned_total_uzs))}</Stat>}
        {budget != null && <Stat label={t('ev.budget')}>{formatUZS(budget)}</Stat>}
        {num(out.remaining_uzs) != null && (
          <Stat label={t('ev.remaining')}><span className={cn((num(out.remaining_uzs) ?? 0) < 0 ? 'text-danger' : 'text-brand')}>{formatUZS(num(out.remaining_uzs))}</span></Stat>
        )}
        {budget != null && plan.length > 0 && <Stat label={t('ev.remaining')}><span className="text-brand">{formatUZS(budget - (num(out.planned_total_uzs) ?? 0))}</span></Stat>}
      </div>
      {plan.length > 0 && <Meta><span>{t('ev.strategyText')}</span></Meta>}
    </div>
  )
}

function SuppliersView({ out }: { out: Out }) {
  const { t } = useTranslation(['ai', 'common'])
  const look = useLookup()
  const rec = arr<CompareRowOut>(out.recommended)
  const sup = arr<{ name: string; rating: number; completed_deals: number; verified: boolean; region: string | null; category: string | null }>(out.suppliers)
  if (rec.length) {
    return (
      <div>
        <div className="-mx-2">
          {rec.map((r, i) => (
            <OfferRow key={r.offer_id} o={r} rank={i + 1}
              tags={r.is_cheapest ? <Badge tone="brand">{t('ev.cheapest')}</Badge> : undefined}
              right={<div><div className="font-mono text-[13px] font-semibold">{formatUZS(r.total_cost_uzs)}</div><div className="text-[10.5px] text-muted">{t('ev.score')} {r.score.toFixed(1)}</div></div>} />
          ))}
        </div>
        <Meta><span>{t('ev.basisText')}</span></Meta>
      </div>
    )
  }
  if (!sup.length) return <p className="text-xs text-muted">{t('ev.noOffers')}</p>
  return (
    <div className="divide-y divide-line">
      {sup.map((s, i) => {
        const cat = look.category(s.category)
        return (
          <div key={s.name} className="flex items-center gap-3 py-2 text-[13px]">
            <span className="grid size-6 place-items-center rounded-md bg-forest font-mono text-[11px] text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium">{uz(s.name)}{s.verified && <BadgeCheck className="size-3.5 fill-brand text-white" />}</div>
              <div className="text-[11.5px] text-muted">{[s.region && uz(s.region), cat && ln(cat, 'name')].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="flex items-center justify-end gap-1"><Star className="size-3 fill-saffron text-saffron" />{s.rating.toFixed(2)}</div>
              <div className="text-muted">{t('ev.deals', { n: s.completed_deals })}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const RENDER: Record<string, React.ComponentType<{ out: Out }>> = {
  compare_offers: CompareView, get_price_history: HistoryView, get_price_forecast: ForecastView, get_regional_comparison: RegionalView,
  search_products: SearchView, get_market_statistics: StatsView, analyze_supply_demand: SupplyView, calculate_purchase_cost: CostView,
  recommend_suppliers: SuppliersView,
}

// ---------------------------------------------------------------- what was checked (header)
type Chip = { key: string; icon?: React.ComponentType<{ className?: string }>; emoji?: string; text: string }

/** Build the plain-language subject ("Tomatoes, 500 kg") and human chips from tool input/output. Never shows raw keys. */
function useSummary(call: ToolCall) {
  const { t } = useTranslation(['ai', 'common'])
  const look = useLookup()
  const label = useProductLabel()
  const input = (call.input ?? {}) as Out
  const out = (call.output ?? {}) as Out

  const productText = str(input.product) ?? str(input.query) ?? str(out.product)
  const prodLookup = productText ? look.product(str(out.product) ?? productText) : undefined
  const isProduct = !!(str(out.product) || prodLookup)
  const prod = productText && isProduct ? label(out as Named, productText) : null
  const unit = str(out.unit) ?? prod?.unit ?? prodLookup?.unit ?? null
  const qty = num(input.quantity) ?? num(out.quantity)

  const subject: string[] = []
  if (prod) subject.push(prod.name)
  else if (productText) subject.push(`“${productText}”`)
  if (qty != null && call.name !== 'calculate_purchase_cost') subject.push(`${formatNumber(qty)}${unit ? ` ${unitLabel(t, unit)}` : ''}`)

  const chips: Chip[] = []
  const region = str(input.region)
  if (region) chips.push({ key: 'region', icon: MapPin, text: uz(cap(region)) })
  const days = num(input.days)
  if (days != null) chips.push({ key: 'days', icon: CalendarDays, text: t('ev.chip.days', { n: days }) })
  const horizon = num(input.horizon_days)
  if (horizon != null) chips.push({ key: 'horizon', icon: CalendarDays, text: t('ev.chip.horizon', { n: horizon }) })
  const budget = num(input.budget)
  if (budget != null) chips.push({ key: 'budget', icon: Wallet, text: t('ev.chip.budget', { v: formatUZS(budget) }) })
  const maxPrice = num(input.max_price)
  if (maxPrice != null) chips.push({ key: 'max', icon: Tag, text: t('ev.chip.maxPrice', { v: formatUZS(maxPrice) }) })
  const cat = look.category(str(input.category))
  if (cat) chips.push({ key: 'cat', icon: Filter, text: ln(cat, 'name') })
  if (input.verified_only === true) chips.push({ key: 'verified', icon: ShieldCheck, text: t('ev.chip.verified') })
  const sort = str(input.sort)
  if (sort && ['price_asc', 'price_desc', 'newest', 'qty_desc'].includes(sort)) chips.push({ key: 'sort', text: t(`ev.chip.sort.${sort}`) })
  arr<{ product?: string; quantity?: number }>(input.items).forEach((it, i) => {
    if (!it?.product) return
    const l = label(null, it.product)
    const u = l.unit
    chips.push({ key: `item${i}`, emoji: l.emoji, text: `${l.name}${it.quantity != null ? ` · ${formatNumber(it.quantity)}${u ? ` ${unitLabel(t, u)}` : ''}` : ''}` })
  })
  return { title: toolLabel(t, call.name), subject: subject.join(', '), emoji: prod?.emoji, chips }
}

function CardBody({ call, index }: { call: ToolCall; index: number }) {
  const { t } = useTranslation('ai')
  const Icon = TOOL_ICON[call.name] ?? Search
  const View = RENDER[call.name]
  const out = (call.output ?? {}) as Out
  const s = useSummary(call)
  const errCode = str(out.error)
  const knownErr = errCode && ['product_not_found', 'no_active_offers'].includes(errCode) ? errCode : null
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index, duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-line bg-[#fafbf9] px-3 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-forest text-white"><Icon className="size-3.5" /></span>
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink">
          <span className="font-semibold">{s.title}</span>
          {s.subject && <><span className="text-muted">·</span><ProductSymbol emoji={s.emoji} size={16} /><span className="truncate">{s.subject}</span></>}
        </span>
        {s.chips.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-1">
            {s.chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-px text-[11px] text-ink-soft">
                {c.emoji ? <ProductSymbol emoji={c.emoji} size={12} /> : c.icon ? <c.icon className="size-3 text-muted" /> : null}{c.text}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-3">
        {errCode ? (
          <div className="flex items-start gap-2 rounded-lg bg-danger-50/70 p-2.5 text-xs text-danger">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <div className="font-medium">{knownErr ? t(`ev.err.${knownErr}`) : t('ev.err.generic')}{str(out.query) ? `: “${str(out.query)}”` : ''}</div>
          </div>
        ) : View ? <View out={out} /> : <p className="text-xs text-muted">{t('ev.unknownTool')}</p>}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------- card
export function EvidenceCard({ call, index }: { call: ToolCall; index: number }) {
  const lookup = useCatalogLookup()
  return <LookupCtx.Provider value={lookup}><CardBody call={call} index={index} /></LookupCtx.Provider>
}
