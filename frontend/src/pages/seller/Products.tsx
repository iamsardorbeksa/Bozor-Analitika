import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, History, MoreHorizontal, Pause, Pencil, Play, PackagePlus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { Offer, OfferStatus } from '@/api/types'
import { Money, ProductGlyph, QualityBadge, StatusBadge, offerName } from '@/components/market'
import { ConfirmDialog } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/input'
import { PageHeader, Pagination, Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent, Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/primitives'
import { useDebounced } from '@/hooks/useScrollTop'
import { currencyLabel, formatNumber, timeAgo, uz } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type Tab = 'all' | OfferStatus
const PAGE_SIZE = 20

export default function SellerProducts() {
  const { t } = useTranslation(['seller', 'common'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = React.useState('')
  const [tab, setTab] = React.useState<Tab>('all')
  const [page, setPage] = React.useState(1)
  const dq = useDebounced(search, 300)
  React.useEffect(() => setPage(1), [dq, tab])

  const q = useQuery({
    queryKey: ['my-offers', { q: dq, status: tab, page }],
    queryFn: () => Api.myOffers({ q: dq || undefined, status: tab === 'all' ? undefined : tab, page, page_size: PAGE_SIZE }),
    placeholderData: (p) => p,
  })

  const [quick, setQuick] = React.useState<Offer | null>(null)
  const [toDelete, setToDelete] = React.useState<Offer | null>(null)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['my-offers'] })
    qc.invalidateQueries({ queryKey: ['seller-dashboard'] })
  }
  const statusM = useMutation({
    mutationFn: (o: Offer) => Api.setOfferStatus(o.id, o.status === 'active' ? 'paused' : 'active'),
    onSuccess: (o) => { toast.success(t(o.status === 'active' ? 'products.activated' : 'products.paused')); invalidate() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const deleteM = useMutation({
    mutationFn: (o: Offer) => Api.deleteOffer(o.id),
    onSuccess: () => { toast.success(t('common:toast.deleted')); setToDelete(null); invalidate() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const columns: Column<Offer>[] = [
    {
      key: 'title', header: t('products.col.product'), sortValue: (o) => o.title,
      cell: (o) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <ProductGlyph category={o.category_slug} name={offerName(o)} image={o.image_url} emoji={o.product_emoji} size={38} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={`/app/seller/products/${o.id}/edit`} className="truncate font-medium hover:text-brand">{uz(o.title)}</Link>
              
            </div>
            <p className="truncate text-xs text-muted">{offerName(o)} · {uz(o.market_name ?? o.region_name)}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', header: t('common:fields.unitPrice'), align: 'right', sortValue: (o) => o.unit_price, cell: (o) => <Money value={o.unit_price} unit={o.unit} className="font-mono font-medium" /> },
    { key: 'stock', header: t('common:fields.available'), align: 'right', sortValue: (o) => o.available_qty,
      cell: (o) => <span className="font-mono">{formatNumber(o.available_qty)} <span className="font-sans text-xs text-muted">{t(`common:units.${o.unit}`, o.unit)}</span></span> },
    { key: 'moq', header: t('common:fields.moq'), align: 'right', sortValue: (o) => o.min_order_qty, cell: (o) => <span className="font-mono">{formatNumber(o.min_order_qty)}</span> },
    { key: 'quality', header: t('common:fields.quality'), cell: (o) => <QualityBadge quality={o.quality} /> },
    { key: 'status', header: t('common:fields.status'), sortValue: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
    { key: 'views', header: t('common:fields.views'), align: 'right', sortValue: (o) => o.views_count, cell: (o) => <span className="font-mono">{formatNumber(o.views_count)}</span> },
    { key: 'updated', header: t('common:fields.updated'), sortValue: (o) => o.updated_at, cell: (o) => <span className="text-xs whitespace-nowrap text-muted">{timeAgo(o.updated_at)}</span> },
    {
      key: 'actions', header: <span className="sr-only">{t('products.col.actions')}</span>, align: 'right',
      cell: (o) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm" aria-label={t('products.quickUpdate')} title={t('products.quickUpdate')} onClick={() => setQuick(o)} disabled={o.status === 'removed'}>
            <SlidersHorizontal />
          </Button>
          <Dropdown>
            <DropdownTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={t('products.col.actions')}><MoreHorizontal /></Button></DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={() => navigate(`/app/seller/products/${o.id}/edit`)}><Pencil /> {t('common:actions.edit')}</DropdownItem>
              <DropdownItem onSelect={() => setQuick(o)} disabled={o.status === 'removed'}><SlidersHorizontal /> {t('products.quickUpdate')}</DropdownItem>
              {(o.status === 'active' || o.status === 'paused') && (
                <DropdownItem onSelect={() => statusM.mutate(o)}>
                  {o.status === 'active' ? <><Pause /> {t('common:actions.pause')}</> : <><Play /> {t('common:actions.activate')}</>}
                </DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem danger onSelect={() => setToDelete(o)}><Trash2 /> {t('common:actions.delete')}</DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      ),
    },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: t('products.tabs.all') },
    { value: 'active', label: t('common:status.active') },
    { value: 'paused', label: t('common:status.paused') },
    { value: 'expired', label: t('common:status.expired') },
    { value: 'removed', label: t('common:status.removed') },
  ]

  return (
    <div>
      <PageHeader eyebrow={t('products.eyebrow')} title={t('products.title')} description={t('products.subtitle')}
        actions={<Button asChild><Link to="/app/seller/products/new"><PackagePlus /> {t('common:nav.addProduct')}</Link></Button>} />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Input icon={<Search />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('products.searchPlaceholder')} aria-label={t('common:actions.search')} />
        </div>
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
          <Segmented id="seller-products-tab" value={tab} onChange={setTab} options={tabs} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? <div className="p-5"><SkeletonList rows={6} /></div>
          : q.isError || !q.data ? <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>
          : q.data.items.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<Boxes />}
                title={dq || tab !== 'all' ? t('common:states.noResults') : t('products.emptyTitle')}
                description={dq || tab !== 'all' ? t('common:states.noResultsHint') : t('products.emptyBody')}
                action={!(dq || tab !== 'all') && <Button asChild><Link to="/app/seller/products/new"><PackagePlus /> {t('common:nav.addProduct')}</Link></Button>} />
            </div>
          ) : (
            <DataTable columns={columns} rows={q.data.items} rowKey={(o) => o.id}
              rowClassName={(o) => (o.status !== 'active' ? 'opacity-75' : undefined)} />
          )}
      </Card>
      {q.data && <Pagination page={q.data.page} pages={q.data.pages} total={q.data.total} pageSize={q.data.page_size} onChange={setPage} />}

      <QuickUpdateDialog offer={quick} onClose={() => setQuick(null)} onSaved={invalidate} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title={t('products.deleteTitle')} description={t('products.deleteBody', { title: toDelete ? uz(toDelete.title) : '' })}
        confirmLabel={<><Trash2 /> {t('common:actions.delete')}</>} loading={deleteM.isPending} onConfirm={() => toDelete && deleteM.mutate(toDelete)} />
    </div>
  )
}

function QuickUpdateDialog({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation(['seller', 'common'])
  const schema = React.useMemo(() => z.object({
    unit_price: z.number({ error: t('form.errors.number') }).positive(t('form.errors.positive')).max(1e9, t('form.errors.tooLarge')),
    available_qty: z.number({ error: t('form.errors.number') }).min(0, t('form.errors.nonNegative')).max(1e8, t('form.errors.tooLarge')),
  }), [t])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<V>({ resolver: zodResolver(schema) })
  React.useEffect(() => { if (offer) reset({ unit_price: offer.unit_price, available_qty: offer.available_qty ?? NaN }) }, [offer, reset])
  const m = useMutation({
    mutationFn: (v: V) => Api.updateOffer(offer!.id, v),
    onSuccess: () => { toast.success(t('common:toast.updated')); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const price = watch('unit_price')
  const diff = offer && Number.isFinite(price) && price > 0 ? ((price - offer.unit_price) / offer.unit_price) * 100 : 0
  const moqWarn = offer && Number.isFinite(watch('available_qty')) && watch('available_qty') < offer.min_order_qty

  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t('products.quickUpdate')} description={offer ? uz(offer.title) : undefined}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4" noValidate>
          <Field label={t('common:fields.unitPrice')} error={errors.unit_price?.message} htmlFor="qp-price"
            hint={offer && Math.abs(diff) > 0.05 ? t('products.priceChange', { from: formatNumber(offer.unit_price), pct: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` }) : undefined}>
            <Input id="qp-price" type="number" inputMode="decimal" step="any" className="font-mono" suffix={currencyLabel()}
              aria-invalid={!!errors.unit_price} {...register('unit_price', { valueAsNumber: true })} />
          </Field>
          <Field label={t('common:fields.available')} error={errors.available_qty?.message} htmlFor="qp-qty"
            hint={moqWarn ? t('products.moqWarn', { moq: formatNumber(offer!.min_order_qty) }) : undefined}>
            <Input id="qp-qty" type="number" inputMode="decimal" step="any" className="font-mono" suffix={offer ? t(`common:units.${offer.unit}`, offer.unit) : undefined}
              aria-invalid={!!errors.available_qty} {...register('available_qty', { valueAsNumber: true })} />
          </Field>
          <p className="flex items-start gap-2 rounded-lg bg-mint-50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            <History className="mt-px size-3.5 shrink-0 text-brand" /> {t('products.historyNote')}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={m.isPending}>{t('common:actions.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
