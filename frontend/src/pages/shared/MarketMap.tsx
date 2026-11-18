import { useQuery } from '@tanstack/react-query'
import type L from 'leaflet'
import { ArrowRight, BadgeCheck, Layers, MapPin, Search, Store, Users, Warehouse, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip as LTooltip, useMap } from 'react-leaflet'
import { Api } from '@/api/endpoints'
import type { Market, RegionalRow } from '@/api/types'
import { ProductPicker } from '@/components/analytics/ProductPicker'
import { Badge, Money, ProductSymbol } from '@/components/market'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { MARKET_COLORS, marketIcon, priceColor } from '@/features/map/icons'
import { useCategories, useMarkets, useProducts } from '@/hooks/useCatalog'
import { formatNumber, formatPct, ln, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

const CENTER: [number, number] = [41.0, 66.5]
type TypeFilter = 'all' | Market['type']
const TYPE_ICON = { bazaar: Store, wholesale: Users, warehouse: Warehouse } as const

function FlyTo({ target, onArrive }: { target: { lat: number; lng: number; seq: number } | null; onArrive: () => void }) {
  const map = useMap()
  React.useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 11), { duration: 0.8 })
    const done = () => onArrive()
    map.once('moveend', done)
    return () => { map.off('moveend', done) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.seq])
  return null
}

export default function MarketMap({ basePath }: { basePath: string }) {
  const { t } = useTranslation(['map', 'common'])
  const markets = useMarkets()
  const products = useProducts()
  const categories = useCategories()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [q, setQ] = React.useState('')
  const [type, setType] = React.useState<TypeFilter>('all')
  const [overlayProduct, setOverlayProduct] = React.useState('')
  const [fly, setFly] = React.useState<{ lat: number; lng: number; seq: number } | null>(null)
  const markerRefs = React.useRef<Record<string, L.Marker>>({})

  const regional = useQuery({
    queryKey: ['analytics', 'regional', overlayProduct],
    queryFn: () => Api.productRegional(overlayProduct),
    enabled: !!overlayProduct,
  })
  const overlayUnit = products.data?.find((p) => p.id === overlayProduct)?.unit

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (markets.data ?? []).filter((m) => (type === 'all' || m.type === type) &&
      (!needle || [m.name, m.region_name_uz, m.region_name_ru, m.region_name_en, m.address ?? ''].some((s) => s.toLowerCase().includes(needle))))
  }, [markets.data, q, type])

  const selected = markets.data?.find((m) => m.id === selectedId) ?? null

  const focus = (m: Market) => {
    setSelectedId(m.id)
    setFly({ lat: m.lat, lng: m.lng, seq: Date.now() })
  }

  const overlayRows = (regional.data ?? []).filter((r): r is RegionalRow & { avg: number } => r.avg != null)
  const minAvg = Math.min(...overlayRows.map((r) => r.avg))
  const maxAvg = Math.max(...overlayRows.map((r) => r.avg))
  const norm = (v: number) => (maxAvg > minAvg ? (v - minAvg) / (maxAvg - minAvg) : 0.5)

  const totals = React.useMemo(() => ({
    markets: markets.data?.length ?? 0,
    offers: (markets.data ?? []).reduce((s, m) => s + m.offer_count, 0),
    suppliers: (markets.data ?? []).reduce((s, m) => s + m.supplier_count, 0),
  }), [markets.data])

  return (
    <div>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2">{t('eyebrow')}</span>}
        title={t('title')}
        description={t('description')}
        actions={markets.data && (
          <div className="flex gap-4 font-mono text-xs text-muted">
            <span><b className="text-base text-ink">{totals.markets}</b> {t('stats.markets')}</span>
            <span><b className="text-base text-ink">{formatNumber(totals.offers)}</b> {t('stats.offers')}</span>
            <span><b className="text-base text-ink">{totals.suppliers}</b> {t('stats.suppliers')}</span>
          </div>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* map */}
        <div className="relative isolate overflow-hidden rounded-[var(--radius-card)] border border-line bg-sand shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-2 border-b border-line bg-white p-2.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink-soft"><Layers className="size-4 text-brand" />{t('overlay.label')}</div>
            <div className="sm:w-64">
              <ProductPicker products={products.data} categories={categories.data} value={overlayProduct || null} onChange={setOverlayProduct} className="h-9 sm:w-64" />
            </div>
            {overlayProduct && regional.isLoading && <span className="text-xs text-muted">{t('common:states.loading')}</span>}
            {overlayProduct && regional.isError && <span className="text-xs text-danger">{t('common:states.errorTitle')}</span>}
            {overlayProduct && regional.data && overlayRows.length === 0 && <span className="text-xs text-muted">{t('overlay.empty')}</span>}
            {overlayProduct && <Button variant="ghost" size="sm" className="sm:ml-auto" onClick={() => setOverlayProduct('')}><X />{t('overlay.clear')}</Button>}
          </div>

          <div className="relative h-[58vh] min-h-[380px] lg:h-[calc(100dvh-17rem)] lg:min-h-[520px]">
            {markets.isLoading ? <Skeleton className="absolute inset-0 rounded-none" /> : markets.isError ? (
              <div className="grid h-full place-items-center p-6"><ErrorState onRetry={() => markets.refetch()} /></div>
            ) : (
              <MapContainer center={CENTER} zoom={typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 6} minZoom={5} maxZoom={17}
                scrollWheelZoom className="h-full w-full" style={{ background: '#e9ecf0' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyTo target={fly} onArrive={() => { if (selectedId) markerRefs.current[selectedId]?.openPopup() }} />

                {overlayRows.map((r) => (
                  <CircleMarker key={r.region_id} center={[r.lat, r.lng]} radius={12 + norm(r.avg) * 16}
                    pathOptions={{ color: '#ffffff', weight: 2, fillColor: priceColor(norm(r.avg)), fillOpacity: 0.72 }}>
                    <LTooltip direction="top" offset={[0, -8]} opacity={1}>
                      <div className="min-w-[150px] text-xs">
                        <div className="font-semibold text-ink">{ln(r, 'region_name')}</div>
                        <div className="mt-0.5 font-mono"><Money value={r.avg} unit={overlayUnit} /></div>
                        <div className="text-muted">{t('overlay.offers', { n: r.count })} · {t('overlay.vsNational')} {formatPct(r.diff_vs_national_pct)}</div>
                      </div>
                    </LTooltip>
                  </CircleMarker>
                ))}

                {filtered.map((m) => (
                  <Marker key={m.id} position={[m.lat, m.lng]} icon={marketIcon(m.type, m.offer_count, m.id === selectedId)}
                    ref={(mk) => { if (mk) markerRefs.current[m.id] = mk }}
                    eventHandlers={{ click: () => setSelectedId(m.id) }}>
                    <Popup minWidth={240} maxWidth={300}>
                      <MarketPopup m={m} basePath={basePath} />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* legend */}
            <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-line bg-white/95 p-2.5 text-[11px] shadow-[var(--shadow-card)]">
              <div className="mb-1.5 font-medium tracking-[0.06em] text-muted uppercase">{t('legend.title')}</div>
              <div className="space-y-1">
                {(Object.keys(MARKET_COLORS) as Market['type'][]).map((k) => (
                  <div key={k} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: MARKET_COLORS[k] }} />{t(`types.${k}`)}</div>
                ))}
                <div className="flex items-center gap-2 text-muted"><span className="grid h-3.5 min-w-5 place-items-center rounded bg-ink px-1 font-mono text-[9px] text-white">12</span>{t('legend.count')}</div>
              </div>
              {overlayRows.length > 0 && (
                <div className="mt-2 border-t border-line pt-2">
                  <div className="mb-1 text-muted">{t('legend.price')}</div>
                  <div className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${priceColor(0)}, ${priceColor(0.5)}, ${priceColor(1)})` }} />
                  <div className="mt-0.5 flex w-32 justify-between font-mono text-[10px] text-muted"><span>{formatNumber(minAvg)}</span><span>{formatNumber(maxAvg)}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* side panel */}
        <aside className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)] lg:h-[calc(100dvh-17rem+57px)] lg:min-h-[577px]">
          <AnimatePresence initial={false} mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                className="border-b border-line bg-mint-50/60 p-4">
                <div className="flex items-start gap-3">
                  <MarketTypeIcon type={selected.type} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-ink">{uz(selected.name)}</h2>
                    <p className="text-xs text-muted">{t(`types.${selected.type}`)} · {ln(selected, 'region_name')}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="rounded-md p-1 text-muted hover:bg-white hover:text-ink" aria-label={t('common:actions.close')}><X className="size-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white px-2.5 py-2"><div className="text-[11px] text-muted">{t('stats.offers')}</div><div className="font-mono text-base font-semibold">{selected.offer_count}</div></div>
                  <div className="rounded-lg bg-white px-2.5 py-2"><div className="text-[11px] text-muted">{t('stats.suppliers')}</div><div className="font-mono text-base font-semibold">{selected.supplier_count}</div></div>
                </div>
                {selected.address && <p className="mt-2.5 flex items-start gap-1.5 text-xs text-ink-soft"><MapPin className="mt-px size-3.5 shrink-0 text-muted" />{uz(selected.address)}</p>}
                <TopOffers m={selected} basePath={basePath} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-2 border-b border-line p-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} icon={<Search />} className="h-9" />
            <Segmented id="mtype" size="sm" value={type} onChange={setType} className="w-full [&>button]:flex-1"
              options={[{ value: 'all', label: t('types.all') }, { value: 'bazaar', label: t('types.bazaar') }, { value: 'wholesale', label: t('types.wholesale') }, { value: 'warehouse', label: t('types.warehouse') }]} />
          </div>
          <div className="max-h-[420px] flex-1 overflow-y-auto p-1.5 scrollbar-thin lg:max-h-none">
            {markets.isLoading ? <div className="space-y-2 p-1.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              : markets.isError ? <ErrorState className="m-1.5 py-8" onRetry={() => markets.refetch()} />
              : filtered.length === 0 ? <EmptyState className="m-1.5 py-10" icon={<MapPin />} title={t('noMarkets')} />
              : filtered.map((m) => (
                <button key={m.id} onClick={() => focus(m)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors', m.id === selectedId ? 'bg-mint-50' : 'hover:bg-paper')}>
                  <MarketTypeIcon type={m.type} small />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{uz(m.name)}</div>
                    <div className="truncate text-[11.5px] text-muted">{ln(m, 'region_name')} · {t(`types.${m.type}`)}</div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-muted">
                    <div className="text-[13px] font-semibold text-ink">{m.offer_count}</div>{t('stats.offersShort')}
                  </div>
                </button>
              ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function MarketTypeIcon({ type, small }: { type: Market['type']; small?: boolean }) {
  const Icon = TYPE_ICON[type] ?? Store
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-lg text-white', small ? 'size-8' : 'size-10')} style={{ background: MARKET_COLORS[type] }}>
      <Icon className={small ? 'size-4' : 'size-5'} />
    </span>
  )
}

function TopOffers({ m, basePath }: { m: Market; basePath: string }) {
  const { t } = useTranslation(['map', 'common'])
  if (!m.top_offers.length) return <p className="mt-3 text-xs text-muted">{t('noOffers')}</p>
  return (
    <div className="mt-3">
      <div className="mb-1 text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">{t('topOffers')}</div>
      <div className="divide-y divide-line rounded-lg border border-line bg-white">
        {m.top_offers.slice(0, 5).map((o) => (
          <Link key={o.id} to={`${basePath}/${o.id}`} className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-mint-50">
            <ProductSymbol emoji={o.product_emoji} size={18} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink">{ln(o, 'product_name')}</div>
              <div className="flex items-center gap-1 truncate text-[11px] text-muted">{uz(o.supplier)}{o.verified && <BadgeCheck className="size-3 fill-good text-white" />}</div>
            </div>
            <Money value={o.unit_price} unit={o.unit} className="font-mono text-[12px] font-medium" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function MarketPopup({ m, basePath }: { m: Market; basePath: string }) {
  const { t } = useTranslation(['map', 'common'])
  return (
    <div className="font-sans">
      <div className="text-[14px] font-semibold text-ink">{uz(m.name)}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
        <Badge tone="outline">{t(`types.${m.type}`)}</Badge>{ln(m, 'region_name')}
      </div>
      <div className="mt-2 flex gap-3 font-mono text-[11.5px]">
        <span><b>{m.offer_count}</b> {t('stats.offersShort')}</span>
        <span><b>{m.supplier_count}</b> {t('stats.suppliers')}</span>
      </div>
      {m.top_offers.slice(0, 3).map((o) => (
        <Link key={o.id} to={`${basePath}/${o.id}`} className="mt-1 flex items-center justify-between gap-2 text-[12px] !text-ink-soft hover:!text-brand">
          <span className="flex min-w-0 items-center gap-1.5"><ProductSymbol emoji={o.product_emoji} size={15} /><span className="truncate">{ln(o, 'product_name')}</span></span>
          <Money value={o.unit_price} unit={o.unit} className="font-mono text-[11.5px]" />
        </Link>
      ))}
      <Link to={`${basePath}?region_id=${m.region_id}`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium !text-brand">
        {t('viewOffers')}<ArrowRight className="size-3" />
      </Link>
    </div>
  )
}
