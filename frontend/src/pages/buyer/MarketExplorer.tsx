import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Bookmark, LayoutGrid, List, PackageSearch, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Api, type OfferQuery } from '@/api/endpoints'
import type { Offer, Quality } from '@/api/types'
import { useFavoriteToggle } from '@/components/buyer/shared'
import { FreshnessBadge, Money, ProductGlyph, QualityBadge, VerifiedBadge, catStyle, offerName } from '@/components/market'
import { OfferCard } from '@/components/market/OfferCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Input, Label, Select } from '@/components/ui/input'
import { PageHeader, Pagination, Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent, Switch } from '@/components/ui/primitives'
import { useCategories, useRegions } from '@/hooks/useCatalog'
import { useDebounced } from '@/hooks/useScrollTop'
import { currencyLabel, formatNumber, formatUZS, ln, uz } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 18
const QUALITIES: Quality[] = ['premium', 'first', 'standard', 'economy']
const SORTS = ['price_asc', 'newest', 'qty_desc', 'price_desc', 'popular'] as const
type Sort = (typeof SORTS)[number]

const num = (v: string | null) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

/** Numeric input that commits on blur / Enter (so typing doesn't trigger a request per keystroke). */
function CommitInput({ value, onCommit, ...p }: { value: string; onCommit: (v: string) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => setV(value), [value])
  const commit = () => { if (v.trim() !== value) onCommit(v.trim()) }
  return (
    <Input {...p} type="number" inputMode="decimal" min={0} value={v} onChange={(e) => setV(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }} />
  )
}

export default function MarketExplorer({ basePath = '/app/market' }: { basePath?: string }) {
  const { t } = useTranslation(['buyer', 'common'])
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const regions = useRegions()
  const cats = useCategories()
  const fav = useFavoriteToggle()
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  const get = (k: string) => params.get(k) ?? ''
  /** Update URL params; any filter change resets to page 1. */
  const update = React.useCallback((patch: Record<string, string | null>, keepPage = false) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '' || v === 'false') next.delete(k)
        else next.set(k, v)
      }
      if (!keepPage) next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  // debounced search box → ?q=
  const [search, setSearch] = React.useState(get('q'))
  const debounced = useDebounced(search, 350)
  React.useEffect(() => {
    if (debounced.trim() !== (params.get('q') ?? '')) update({ q: debounced.trim() || null })
    // only react to the debounced value; external resets set `search` themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const sort = (SORTS as readonly string[]).includes(get('sort')) ? (get('sort') as Sort) : 'price_asc'
  const view = get('view') === 'list' ? 'list' : 'grid'
  const page = Math.max(1, num(params.get('page')) ?? 1)

  const query: OfferQuery = {
    q: get('q') || undefined,
    category: get('category') || undefined,
    region_id: get('region_id') || undefined,
    min_price: num(params.get('min_price')),
    max_price: num(params.get('max_price')),
    min_qty: num(params.get('min_qty')),
    quality: (QUALITIES as string[]).includes(get('quality')) ? (get('quality') as Quality) : undefined,
    verified_only: get('verified_only') === 'true' || undefined,
    delivery_only: get('delivery_only') === 'true' || undefined,
    sort, page, page_size: PAGE_SIZE,
  }
  const offers = useQuery({ queryKey: ['offers', query], queryFn: () => Api.offers(query), placeholderData: keepPreviousData })

  const resetAll = () => {
    setSearch('')
    setParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('view')) next.set('view', prev.get('view')!)
      return next
    }, { replace: true })
  }

  // ------------------------------------------------ active filter chips
  const chips: { key: string; label: string; clear: () => void }[] = []
  const chip = (key: string, label: string, clear?: () => void) => chips.push({ key, label, clear: clear ?? (() => update({ [key]: null })) })
  if (query.q) chip('q', `“${query.q}”`, () => { setSearch(''); update({ q: null }) })
  if (query.category) chip('category', ln(cats.data?.find((c) => c.slug === query.category), 'name') || query.category)
  if (query.region_id) chip('region_id', ln(regions.data?.find((r) => r.id === query.region_id), 'name') || '…')
  if (query.min_price != null) chip('min_price', `${t('buyer:explorer.from')} ${formatUZS(query.min_price)}`)
  if (query.max_price != null) chip('max_price', `${t('buyer:explorer.to')} ${formatUZS(query.max_price)}`)
  if (query.min_qty != null) chip('min_qty', t('buyer:explorer.minQtyChip', { qty: formatNumber(query.min_qty) }))
  if (query.quality) chip('quality', t(`common:quality.${query.quality}`))
  if (query.verified_only) chip('verified_only', t('buyer:explorer.verifiedOnly'))
  if (query.delivery_only) chip('delivery_only', t('buyer:explorer.deliveryOnly'))
  const activeCount = chips.filter((c) => c.key !== 'q' && c.key !== 'category').length

  const filterPanel = (idp: string) => (
    <div className="space-y-5">
      <div>
        <Label htmlFor={`${idp}-region`}>{t('common:fields.region')}</Label>
        <Select id={`${idp}-region`} value={get('region_id')} onChange={(e) => update({ region_id: e.target.value || null })}>
          <option value="">{t('common:fields.allRegions')}</option>
          {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
        </Select>
      </div>
      <div>
        <Label>{t('buyer:explorer.priceRange', { currency: currencyLabel() })}</Label>
        <div className="grid grid-cols-2 gap-2">
          <CommitInput aria-label={t('buyer:explorer.minPrice')} placeholder={t('buyer:explorer.min')} value={get('min_price')} onCommit={(v) => update({ min_price: v || null })} />
          <CommitInput aria-label={t('buyer:explorer.maxPrice')} placeholder={t('buyer:explorer.max')} value={get('max_price')} onCommit={(v) => update({ max_price: v || null })} />
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted">{t('buyer:explorer.enterHint')}</p>
      </div>
      <div>
        <Label htmlFor={`${idp}-qty`}>{t('buyer:explorer.minQty')}</Label>
        <CommitInput id={`${idp}-qty`} placeholder="500" value={get('min_qty')} onCommit={(v) => update({ min_qty: v || null })} />
      </div>
      <div>
        <Label>{t('common:fields.quality')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {[null, ...QUALITIES].map((q) => {
            const on = (query.quality ?? null) === q
            return (
              <button key={q ?? 'any'} type="button" onClick={() => update({ quality: q })} aria-pressed={on}
                className={cn('rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors',
                  on ? 'border-forest bg-forest text-white' : 'border-line-strong bg-white text-ink-soft hover:border-[#c3c6cc]')}>
                {q ? t(`common:quality.${q}`) : t('common:fields.any')}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-3 border-t border-line pt-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>{t('buyer:explorer.verifiedOnly')}</span>
          <Switch checked={!!query.verified_only} onCheckedChange={(v) => update({ verified_only: v ? 'true' : null })} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>{t('buyer:explorer.deliveryOnly')}</span>
          <Switch checked={!!query.delivery_only} onCheckedChange={(v) => update({ delivery_only: v ? 'true' : null })} />
        </label>
      </div>
      {chips.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={resetAll}><RotateCcw />{t('common:actions.reset')}</Button>
      )}
    </div>
  )

  // ------------------------------------------------ list view columns
  const columns: Column<Offer>[] = [
    {
      key: 'product', header: t('common:fields.product'), sortValue: (o) => offerName(o),
      cell: (o) => (
        <div className="flex min-w-[180px] items-center gap-2.5">
          <ProductGlyph category={o.category_slug} name={offerName(o)} image={o.image_url} emoji={o.product_emoji} size={32} className="rounded-lg [&_svg]:size-4" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">{offerName(o)}</div>
            <div className="text-xs text-muted">{t(`common:quality.${o.quality}`)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'supplier', header: t('common:fields.supplier'), sortValue: (o) => o.business.name,
      cell: (o) => <span className="inline-flex items-center gap-1 whitespace-nowrap">{uz(o.business.name)}<VerifiedBadge status={o.business.verification_status} compact /></span>,
    },
    { key: 'price', header: t('common:fields.unitPrice'), align: 'right', sortValue: (o) => o.unit_price, cell: (o) => <Money value={o.unit_price} unit={o.unit} className="font-mono font-semibold" /> },
    { key: 'qty', header: t('common:fields.available'), align: 'right', sortValue: (o) => o.available_qty, cell: (o) => <span className="whitespace-nowrap">{formatNumber(o.available_qty)} {t(`common:units.${o.unit}`)}</span> },
    { key: 'moq', header: t('common:fields.moq'), align: 'right', sortValue: (o) => o.min_order_qty, cell: (o) => formatNumber(o.min_order_qty) },
    { key: 'quality', header: t('common:fields.quality'), cell: (o) => <QualityBadge quality={o.quality} /> },
    { key: 'region', header: t('common:fields.region'), sortValue: (o) => o.region_name, cell: (o) => <span className="whitespace-nowrap text-ink-soft">{uz(o.market_name ?? o.region_name)}</span> },
    {
      key: 'delivery', header: t('common:fields.delivery'), sortValue: (o) => (o.delivery_available ? o.delivery_days : 99),
      cell: (o) => <span className="whitespace-nowrap text-xs text-muted">{o.delivery_available ? t('common:delivery.available', { days: o.delivery_days }) : t('common:delivery.pickup')}</span>,
    },
    { key: 'updated', header: t('common:fields.updated'), sortValue: (o) => o.updated_at, cell: (o) => <FreshnessBadge updatedAt={o.updated_at} /> },
    ...(fav.canSave ? [{
      key: 'save', header: '', align: 'center' as const,
      cell: (o: Offer) => (
        <button onClick={(e) => { e.stopPropagation(); fav.toggle(o) }} disabled={fav.pendingId === o.id}
          aria-label={o.is_favorite ? t('common:actions.unsave') : t('common:actions.saveOffer')} aria-pressed={o.is_favorite}
          className={cn('rounded-lg p-1.5 hover:bg-mint', o.is_favorite ? 'text-brand' : 'text-[#8a8f99]')}>
          <Bookmark className={cn('size-4', o.is_favorite && 'fill-brand')} />
        </button>
      ),
    }] : []),
  ]

  const data = offers.data
  return (
    <div>
      <PageHeader eyebrow={t('buyer:explorer.eyebrow')} title={t('common:nav.marketExplorer')} description={t('buyer:explorer.description')} />

      {/* category chips */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <div className="flex w-max gap-1.5 pb-1 lg:w-auto lg:flex-wrap">
          {[{ slug: '', label: t('common:fields.allCategories'), count: undefined as number | undefined }, ...(cats.data ?? []).map((c) => ({ slug: c.slug, label: ln(c, 'name'), count: c.offer_count }))].map((c) => {
            const on = get('category') === c.slug
            const s = c.slug ? catStyle(c.slug) : null
            const Icon = s?.icon
            return (
              <button key={c.slug || 'all'} onClick={() => update({ category: c.slug || null })} aria-pressed={on}
                className={cn('relative flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  on ? 'border-forest text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong')}>
                {on && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-forest" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                {Icon && <span className="relative grid size-5 place-items-center rounded-full" style={{ background: on ? 'rgba(255,255,255,.14)' : s!.bg, color: on ? '#fff' : s!.fg }}><Icon className="size-3" /></span>}
                <span className="relative">{c.label}</span>
                {c.count != null && <span className={cn('relative font-mono text-[11px] tabular', on ? 'text-white/70' : 'text-muted')}>{c.count}</span>}
              </button>
            )
          })}
          {cats.isLoading && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[248px_1fr]">
        <aside className="hidden lg:block">
          <Card className="sticky top-20 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4 text-brand" />{t('common:actions.filters')}</div>
            {filterPanel('fs')}
          </Card>
        </aside>

        <div className="min-w-0">
          {/* toolbar */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input icon={<Search />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('buyer:explorer.searchPh')}
                aria-label={t('common:actions.search')} type="search" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal />{t('common:actions.filters')}
                {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] text-white">{activeCount}</span>}
              </Button>
              <Select aria-label={t('buyer:explorer.sortLabel')} value={sort} onChange={(e) => update({ sort: e.target.value === 'price_asc' ? null : e.target.value })} className="w-full min-w-[170px] sm:w-auto">
                {SORTS.map((s) => <option key={s} value={s}>{t(`buyer:explorer.sort.${s}`)}</option>)}
              </Select>
              <Segmented id="explorer-view" size="sm" value={view} onChange={(v) => update({ view: v === 'grid' ? null : v }, true)}
                options={[
                  { value: 'grid', label: <span className="flex items-center gap-1"><LayoutGrid className="size-3.5" /><span className="sr-only sm:not-sr-only">{t('buyer:explorer.grid')}</span></span> },
                  { value: 'list', label: <span className="flex items-center gap-1"><List className="size-3.5" /><span className="sr-only sm:not-sr-only">{t('buyer:explorer.list')}</span></span> },
                ]} />
            </div>
          </div>

          {/* result count + chips */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted">
              {data ? <>{t('buyer:explorer.offersFound')}: <span className="font-mono font-semibold text-ink tabular">{formatNumber(data.total)}</span></> : <Skeleton className="inline-block h-4 w-24 align-middle" />}
            </span>
            {chips.map((c) => (
              <motion.button key={c.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={c.clear}
                className="inline-flex items-center gap-1 rounded-full border border-[#ffd6c4] bg-mint-50 py-0.5 pr-1.5 pl-2.5 text-[12.5px] text-forest hover:bg-mint"
                aria-label={t('buyer:explorer.removeFilter', { name: c.label })}>
                {c.label}<X className="size-3.5 opacity-60" />
              </motion.button>
            ))}
            {chips.length > 1 && <Button variant="link" size="sm" className="h-auto text-[12.5px]" onClick={resetAll}>{t('buyer:explorer.clearAll')}</Button>}
            {data && offers.isFetching && !offers.isLoading && <span className="ml-auto size-3.5 animate-spin rounded-full border-2 border-mint border-t-brand" aria-label={t('common:states.loading')} />}
          </div>

          {offers.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[232px] rounded-[var(--radius-card)]" />)}
            </div>
          ) : offers.isError || !data ? (
            <ErrorState onRetry={() => offers.refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState icon={<PackageSearch />} title={t('common:states.noResults')} description={t('buyer:explorer.emptyHint')}
              action={chips.length > 0 ? <Button variant="outline" onClick={resetAll}><RotateCcw />{t('common:actions.reset')}</Button> : undefined} />
          ) : view === 'grid' ? (
            <div className={cn('grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3', offers.isPlaceholderData && 'opacity-60')}>
              {data.items.map((o, i) => (
                <OfferCard key={o.id} offer={o} index={i} to={`${basePath}/${o.id}`}
                  onToggleSave={fav.canSave ? fav.toggle : undefined} saving={fav.pendingId === o.id} />
              ))}
            </div>
          ) : (
            <Card className={cn('overflow-hidden transition-opacity', offers.isPlaceholderData && 'opacity-60')}>
              <DataTable columns={columns} rows={data.items} rowKey={(o) => o.id} onRowClick={(o) => navigate(`${basePath}/${o.id}`)} />
            </Card>
          )}

          {data && data.items.length > 0 && (
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size}
              onChange={(p) => { update({ page: p > 1 ? String(p) : null }, true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          )}
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent title={t('common:actions.filters')}>
          {filterPanel('fd')}
          <Button className="mt-5 w-full" onClick={() => setFiltersOpen(false)}>
            {data ? t('buyer:explorer.showResults', { count: data.total }) : t('common:actions.apply')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

