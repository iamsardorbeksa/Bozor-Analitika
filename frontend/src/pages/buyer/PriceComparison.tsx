import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Award, BadgeCheck, Calculator, Info, PiggyBank, Scale, Send, Tag } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Api } from '@/api/endpoints'
import type { CompareRow, Offer } from '@/api/types'
import { ProductPicker } from '@/components/buyer/ProductPicker'
import { RequestDialog } from '@/components/buyer/RequestDialog'
import { ReasonChips, useReason } from '@/components/buyer/shared'
import { FreshnessBadge, Money, ProductGlyph, QualityBadge, VerifiedBadge, offerName } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/input'
import { PageHeader, StatCard, AnimatedNumber } from '@/components/ui/layout'
import { Switch, Tooltip } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { useProducts, useRegions } from '@/hooks/useCatalog'
import { useDebounced } from '@/hooks/useScrollTop'
import { formatNumber, formatUZS, ln, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

const WEIGHTS = [
  { key: 'cost', w: 0.45 },
  { key: 'reliability', w: 0.2 },
  { key: 'quality', w: 0.15 },
  { key: 'delivery', w: 0.1 },
  { key: 'availability', w: 0.1 },
] as const

export default function PriceComparison() {
  const { t } = useTranslation(['buyer', 'common'])
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const products = useProducts()
  const regions = useRegions()

  const productId = params.get('product') ?? ''
  const regionId = params.get('region_id') ?? ''
  const verified = params.get('verified_only') === 'true'
  const product = products.data?.find((p) => p.id === productId)

  const set = React.useCallback((patch: Record<string, string | null>) => setParams((prev) => {
    const n = new URLSearchParams(prev)
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) }
    return n
  }, { replace: true }), [setParams])

  const [qtyText, setQtyText] = React.useState(params.get('qty') ?? '500')
  const debQty = useDebounced(qtyText, 400)
  React.useEffect(() => {
    if (debQty !== (params.get('qty') ?? '')) set({ qty: debQty || null })
    // react only to the debounced input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debQty])
  const qty = Number(params.get('qty') ?? '500')
  const qtyValid = Number.isFinite(qty) && qty > 0

  const cmp = useQuery({
    queryKey: ['compare', productId, qty, regionId, verified],
    queryFn: () => Api.compare(productId, qty, regionId || undefined, verified || undefined),
    enabled: !!productId && qtyValid,
  })

  const [reqOffer, setReqOffer] = React.useState<Offer | null>(null)
  const unit = product ? t(`common:units.${product.unit}`, product.unit) : ''
  const canRequest = user?.role === 'buyer'

  return (
    <div>
      <PageHeader eyebrow={t('buyer:compare.eyebrow')} title={t('common:nav.priceComparison')} description={t('buyer:compare.description')} />

      {/* controls */}
      <Card className="mb-6 p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Field label={t('common:fields.product')} htmlFor="cmp-product">
            <ProductPicker id="cmp-product" value={productId} onChange={(p) => set({ product: p.id })} />
          </Field>
          <Field label={t('common:fields.quantity')} htmlFor="cmp-qty" error={qtyText !== '' && !(Number(qtyText) > 0) ? t('buyer:request.errors.qtyNumber') : undefined}>
            <Input id="cmp-qty" type="number" inputMode="decimal" min={1} value={qtyText} onChange={(e) => setQtyText(e.target.value)} suffix={unit || undefined} />
          </Field>
          <Field label={t('common:fields.region')} htmlFor="cmp-region">
            <Select id="cmp-region" value={regionId} onChange={(e) => set({ region_id: e.target.value || null })}>
              <option value="">{t('common:fields.allRegions')}</option>
              {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
            </Select>
          </Field>
          <label className="flex h-10 cursor-pointer items-center gap-2.5 text-sm whitespace-nowrap">
            <Switch checked={verified} onCheckedChange={(v) => set({ verified_only: v ? 'true' : null })} />
            {t('buyer:explorer.verifiedOnly')}
          </label>
        </div>
        {/* the formula, always visible */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line-strong bg-paper px-3.5 py-2.5 text-[13px]">
          <Calculator className="size-4 text-brand" />
          <span className="font-medium text-forest">{t('buyer:compare.formula')}</span>
          <span className="text-muted">— {t('buyer:compare.formulaHint')}</span>
        </div>
      </Card>

      {!productId ? (
        <EmptyState icon={<Scale />} title={t('buyer:compare.pickTitle')} description={t('buyer:compare.pickHint')} />
      ) : !qtyValid ? (
        <EmptyState icon={<Calculator />} title={t('buyer:compare.qtyTitle')} />
      ) : cmp.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
          <Skeleton className="h-72" />
        </div>
      ) : cmp.isError || !cmp.data ? (
        <ErrorState onRetry={() => cmp.refetch()} />
      ) : cmp.data.rows.length === 0 ? (
        <EmptyState icon={<Scale />} title={t('buyer:compare.noOffers')} description={t('buyer:compare.noOffersHint')}
          action={(regionId || verified) ? <Button variant="outline" onClick={() => set({ region_id: null, verified_only: null })}>{t('common:actions.reset')}</Button> : undefined} />
      ) : (
        <Results rows={cmp.data.rows} savings={cmp.data.savings_vs_average} qty={qty} unit={unit} canRequest={canRequest} onRequest={setReqOffer} />
      )}

      <RequestDialog offer={reqOffer} open={!!reqOffer} onOpenChange={(o) => { if (!o) setReqOffer(null) }} defaultQty={qty} />
    </div>
  )
}

function Results({ rows, savings, qty, unit, canRequest, onRequest }: {
  rows: CompareRow[]; savings: number | null; qty: number; unit: string; canRequest: boolean; onRequest: (o: Offer) => void
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const rec = rows.find((r) => r.is_recommended) ?? null
  const cheap = rows.find((r) => r.is_cheapest) ?? null
  const same = rec && cheap && rec.offer.id === cheap.offer.id
  const avgTotal = rows.reduce((s, r) => s + r.total_cost, 0) / rows.length
  const warnings = rows.filter((r) => !r.meets_moq || !r.enough_stock).length

  const columns: Column<CompareRow>[] = [
    {
      key: 'supplier', header: t('common:fields.supplier'), sortValue: (r) => r.offer.business.name,
      cell: (r) => (
        <div className="min-w-[170px]">
          <div className="flex items-center gap-1.5 font-medium">
            <Link to={`/app/market/${r.offer.id}`} className="hover:underline">{uz(r.offer.business.name)}</Link>
            <VerifiedBadge status={r.offer.business.verification_status} compact />
            
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {r.is_recommended && <span className="rounded-full bg-good px-2 py-px text-[10.5px] font-semibold text-white">{t('buyer:compare.recommended')}</span>}
            {r.is_cheapest && <span className="rounded-full bg-mint px-2 py-px text-[10.5px] font-semibold text-brand-700">{t('buyer:compare.cheapest')}</span>}
            {!r.enough_stock && <Tooltip content={t('buyer:reasons.insufficient_stock')}><span className="inline-flex items-center gap-0.5 rounded bg-danger-50 px-1.5 py-px text-[10.5px] font-medium text-danger"><AlertTriangle className="size-3" />{t('buyer:compare.stockShort')}</span></Tooltip>}
            {!r.meets_moq && <Tooltip content={t('buyer:reasons.below_moq', { qty: formatNumber(r.offer.min_order_qty) })}><span className="inline-flex items-center gap-0.5 rounded bg-danger-50 px-1.5 py-px text-[10.5px] font-medium text-danger"><AlertTriangle className="size-3" />{t('buyer:compare.moqShort')}</span></Tooltip>}
          </div>
        </div>
      ),
    },
    { key: 'price', header: t('common:fields.unitPrice'), align: 'right', sortValue: (r) => r.offer.unit_price, cell: (r) => <span className="font-mono">{formatNumber(r.offer.unit_price)}</span> },
    { key: 'qty', header: t('buyer:compare.reqQty'), align: 'right', sortValue: (r) => r.quantity, cell: (r) => <span className="whitespace-nowrap">{formatNumber(r.quantity)} {unit}</span> },
    { key: 'delivery', header: t('common:fields.deliveryCost'), align: 'right', sortValue: (r) => r.delivery_cost,
      cell: (r) => r.offer.delivery_available ? <span className="font-mono">{r.delivery_cost > 0 ? formatNumber(r.delivery_cost) : t('common:delivery.free')}</span> : <span className="text-xs text-muted">{t('common:delivery.pickup')}</span> },
    { key: 'total', header: t('buyer:compare.totalCost'), align: 'right', sortValue: (r) => r.total_cost,
      cell: (r) => <span className={cn('font-mono font-semibold', r.is_cheapest && 'text-brand')}>{formatNumber(r.total_cost)}</span> },
    { key: 'quality', header: t('common:fields.quality'), sortValue: (r) => ['economy', 'standard', 'first', 'premium'].indexOf(r.offer.quality), cell: (r) => <QualityBadge quality={r.offer.quality} /> },
    { key: 'moq', header: t('common:fields.moq'), align: 'right', sortValue: (r) => r.offer.min_order_qty, cell: (r) => formatNumber(r.offer.min_order_qty) },
    { key: 'rating', header: t('common:fields.rating'), align: 'right', sortValue: (r) => r.offer.business.rating, cell: (r) => r.offer.business.rating.toFixed(1) },
    { key: 'verified', header: t('buyer:compare.verification'), sortValue: (r) => (r.offer.business.verification_status === 'verified' ? 1 : 0),
      cell: (r) => <VerifiedBadge status={r.offer.business.verification_status} /> },
    { key: 'updated', header: t('common:fields.updated'), sortValue: (r) => r.offer.updated_at, cell: (r) => <FreshnessBadge updatedAt={r.offer.updated_at} /> },
    { key: 'score', header: t('buyer:compare.score'), align: 'right', sortValue: (r) => r.score,
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-line sm:block"><div className="h-full rounded-full bg-brand" style={{ width: `${r.score}%` }} /></div>
          <span className="font-mono font-semibold">{r.score.toFixed(0)}</span>
        </div>
      ) },
    ...(canRequest ? [{
      key: 'action', header: '', align: 'right' as const,
      cell: (r: CompareRow) => <Button size="sm" variant={r.is_recommended ? 'primary' : 'outline'} disabled={!r.enough_stock} onClick={(e) => { e.stopPropagation(); onRequest(r.offer) }}><Send />{t('buyer:compare.request')}</Button>,
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('buyer:compare.offersCompared')} value={<AnimatedNumber value={rows.length} />} icon={<Scale />} hint={warnings > 0 ? t('buyer:compare.warningsCount', { count: warnings }) : undefined} />
        <StatCard label={t('buyer:compare.avgTotal')} value={<span className="font-mono text-[22px]">{formatUZS(avgTotal, { compact: true })}</span>} icon={<Calculator />} delay={0.05}
          hint={t('buyer:compare.forQty', { qty: formatNumber(qty), unit })} />
        <StatCard tone="brand" label={t('buyer:compare.savingsVsAvg')} icon={<PiggyBank />} delay={0.1}
          value={savings != null ? <span className="font-mono text-[22px] text-brand"><AnimatedNumber value={savings} format={(v) => formatUZS(v, { compact: v >= 1e7 })} /></span> : '—'}
          hint={t('buyer:compare.savingsHint')} />
      </div>

      <div className={cn('grid gap-4', !same && cheap && 'lg:grid-cols-2')}>
        {rec && <PickCard row={rec} kind="recommended" cheapest={cheap} unit={unit} canRequest={canRequest} onRequest={onRequest} />}
        {!same && cheap && <PickCard row={cheap} kind="cheapest" cheapest={cheap} unit={unit} canRequest={canRequest} onRequest={onRequest} />}
      </div>
      {!same && rec && cheap && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#f0d7b6] bg-saffron-50 px-4 py-3 text-[13.5px] text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0 text-[#8a4a00]" />
          <p>{t('buyer:compare.notCheapest', { amount: formatUZS(rec.total_cost - cheap.total_cost) })}</p>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>{t('buyer:compare.tableTitle')}</CardTitle>
            <CardDescription>{t('buyer:compare.tableHint')}</CardDescription>
          </div>
        </CardHeader>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.offer.id} initialSort={{ key: 'score', dir: 'desc' }}
          rowClassName={(r) => cn(r.is_recommended && 'bg-mint-50/80', (!r.enough_stock || !r.meets_moq) && 'opacity-80')} />
      </Card>
    </div>
  )
}

function PickCard({ row, kind, cheapest, unit, canRequest, onRequest }: {
  row: CompareRow; kind: 'recommended' | 'cheapest'; cheapest: CompareRow | null; unit: string; canRequest: boolean; onRequest: (o: Offer) => void
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const reason = useReason()
  const o = row.offer
  const rec = kind === 'recommended'
  const why = row.reasons.filter((r) => !r.startsWith('more_expensive')).map((r) => reason(r).label.toLowerCase())
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rec ? 0.05 : 0.12 }}>
      <Card className={cn('h-full overflow-hidden', rec ? 'border-good/40 ring-1 ring-good/20' : '')}>
        <div className={cn('flex items-center gap-2 px-5 py-2.5 text-[12.5px] font-semibold', rec ? 'bg-good text-white' : 'bg-mint text-brand-700')}>
          {rec ? <Award className="size-4 text-white" /> : <Tag className="size-4" />}
          {rec ? t('buyer:compare.recommendedTitle') : t('buyer:compare.cheapestTitle')}
          {rec && cheapest?.offer.id === o.id && <span className="ml-auto rounded-full bg-white/20 px-2 py-px text-[11px]">{t('buyer:compare.alsoCheapest')}</span>}
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <ProductGlyph category={o.category_slug} name={offerName(o)} image={o.image_url} emoji={o.product_emoji} size={44} />
            <div className="min-w-0 flex-1">
              <Link to={`/app/market/${o.id}`} className="flex items-center gap-1.5 font-semibold hover:underline">
                <span className="truncate">{uz(o.business.name)}</span>
                {o.business.verification_status === 'verified' && <BadgeCheck className="size-4 shrink-0 fill-good text-white" />}
                
              </Link>
              <div className="text-[13px] text-muted">{uz(o.market_name ?? o.region_name)} · {t(`common:quality.${o.quality}`)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[22px] leading-none font-bold tracking-tight text-ink">{formatNumber(row.total_cost)}</div>
              <div className="mt-1 text-[11px] text-muted">{t('buyer:compare.totalCost')}</div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-paper px-3 py-2 font-mono text-[12px] text-ink-soft tabular">
            ({formatNumber(row.quantity)} × {formatNumber(o.unit_price)}) + {formatNumber(row.delivery_cost)} = <span className="font-semibold text-ink">{formatUZS(row.total_cost)}</span>
          </div>

          {rec && why.length > 0 && (
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">{t('buyer:compare.why')} </span>{t('buyer:compare.whyBody', { list: why.join(', ') })}
            </p>
          )}
          <ReasonChips reasons={row.reasons} className="mt-3 flex flex-wrap gap-1.5" />

          <ScoreBreakdown row={row} />

          {canRequest && (
            <Button className="mt-4 w-full" variant={rec ? 'primary' : 'outline'} disabled={!row.enough_stock} onClick={() => onRequest(o)}>
              <Send />{t('buyer:compare.requestFrom', { name: uz(o.business.name) })}
            </Button>
          )}
          <p className="mt-2 text-center text-[11.5px] text-muted">
            <Money value={o.unit_price} unit={unit ? o.unit : undefined} className="font-mono" /> · {t('common:fields.moq')}: {formatNumber(o.min_order_qty)}
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

function ScoreBreakdown({ row }: { row: CompareRow }) {
  const { t } = useTranslation('buyer')
  return (
    <div className="mt-4 border-t border-dashed border-line pt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('compare.scoreBreakdown')}</span>
        <span className="font-mono text-lg font-semibold">{row.score.toFixed(1)}<span className="text-xs text-muted"> / 100</span></span>
      </div>
      <div className="space-y-1.5">
        {WEIGHTS.map(({ key, w }, i) => {
          const v = row.score_breakdown[key]
          return (
            <div key={key} className="grid grid-cols-[110px_1fr_44px] items-center gap-2 text-[12px]">
              <span className="truncate text-ink-soft">{t(`compare.weights.${key}`)} <span className="text-muted">{Math.round(w * 100)}%</span></span>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${v * 100}%` }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <span className="text-right font-mono text-muted tabular">+{(v * w * 100).toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
