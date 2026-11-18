import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ExternalLink, Flag, RotateCcw, Search, Store, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { AdminOffer, OfferStatus, Page } from '@/api/types'
import { Badge, Money, ProductGlyph, StatusBadge, VerifiedBadge, offerName } from '@/components/market'
import { ConfirmDialog } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader, Pagination, Segmented } from '@/components/ui/layout'
import { Switch, Tooltip } from '@/components/ui/primitives'
import { useDebounced } from '@/hooks/useScrollTop'
import { timeAgo, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const PAGE_SIZE = 25

/**
 * The API filters "flagged" after paginating, so a single page can miss flagged rows.
 * For the flagged view we walk all pages and paginate client-side.
 */
async function fetchOffers(q: string, status: OfferStatus | undefined, flagged: boolean, page: number): Promise<Page<AdminOffer>> {
  if (!flagged) return Api.adminOffers({ q: q || undefined, status, page, page_size: PAGE_SIZE })
  const all: AdminOffer[] = []
  for (let p = 1; p <= 20; p++) {
    const r = await Api.adminOffers({ q: q || undefined, status, flagged: true, page: p, page_size: 100 })
    all.push(...r.items)
    if (p >= r.pages) break
  }
  all.sort((a, b) => (b.open_reports - a.open_reports) || ((b.median_ratio ?? 1) - (a.median_ratio ?? 1)))
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  return { items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: all.length, page, page_size: PAGE_SIZE, pages }
}

export default function AdminOffers() {
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const flagged = params.get('flagged') === '1'
  const setFlagged = (v: boolean) => setParams((p) => { if (v) p.set('flagged', '1'); else p.delete('flagged'); return p }, { replace: true })
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<'all' | OfferStatus>('all')
  const [page, setPage] = React.useState(1)
  const dq = useDebounced(search, 300)
  React.useEffect(() => setPage(1), [dq, status, flagged])

  const q = useQuery({
    queryKey: ['admin-offers', { q: dq, status, flagged, page }],
    queryFn: () => fetchOffers(dq, status === 'all' ? undefined : status, flagged, page),
    placeholderData: (p) => p,
  })

  const [removeTarget, setRemoveTarget] = React.useState<AdminOffer | null>(null)
  const [note, setNote] = React.useState('')
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-offers'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    qc.invalidateQueries({ queryKey: ['admin-audit'] })
  }
  const removeM = useMutation({
    mutationFn: (o: AdminOffer) => Api.adminRemoveOffer(o.id, note.trim() || undefined),
    onSuccess: () => { toast.success(t('offers.removed')); setRemoveTarget(null); invalidate() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const restoreM = useMutation({
    mutationFn: (o: AdminOffer) => Api.adminRestoreOffer(o.id),
    onSuccess: () => { toast.success(t('offers.restored')); invalidate() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const columns: Column<AdminOffer>[] = [
    {
      key: 'offer', header: t('offers.col.offer'), sortValue: (o) => o.title,
      cell: (o) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <ProductGlyph category={o.category_slug} name={offerName(o)} image={o.image_url} emoji={o.product_emoji} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5"><span className="truncate font-medium">{uz(o.title)}</span></div>
            <p className="flex items-center gap-1 truncate text-xs text-muted">{uz(o.business.name)} <VerifiedBadge status={o.business.verification_status} compact /> · {uz(o.region_name)}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', header: t('common:fields.unitPrice'), align: 'right', sortValue: (o) => o.unit_price, cell: (o) => <Money value={o.unit_price} unit={o.unit} className="font-mono font-medium" /> },
    {
      key: 'ratio', header: t('offers.col.vsMedian'), align: 'right', sortValue: (o) => o.median_ratio,
      cell: (o) => o.median_ratio == null ? <span className="text-muted">—</span> : (
        <Tooltip content={t('offers.ratioTooltip')}>
          <span className={cn('inline-flex items-center gap-1 font-mono text-[13px]', o.suspicious ? 'font-semibold text-danger' : 'text-ink-soft')}>
            {o.suspicious && <AlertTriangle className="size-3.5" />}{t('offers.ratio', { x: o.median_ratio.toFixed(1) })}
          </span>
        </Tooltip>
      ),
    },
    { key: 'reports', header: t('offers.col.reports'), align: 'center', sortValue: (o) => o.open_reports,
      cell: (o) => o.open_reports ? <Badge tone="danger"><Flag /> {o.open_reports}</Badge> : <span className="text-muted">0</span> },
    { key: 'status', header: t('common:fields.status'), sortValue: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
    { key: 'updated', header: t('common:fields.updated'), sortValue: (o) => o.updated_at, cell: (o) => <span className="text-xs whitespace-nowrap text-muted">{timeAgo(o.updated_at)}</span> },
    {
      key: 'actions', header: <span className="sr-only">{t('offers.col.actions')}</span>, align: 'right',
      cell: (o) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" asChild aria-label={t('offers.open')} title={t('offers.open')}><Link to={`/app/market/${o.id}`}><ExternalLink /></Link></Button>
          {o.status === 'removed'
            ? <Button size="sm" variant="outline" loading={restoreM.isPending && restoreM.variables?.id === o.id} onClick={() => restoreM.mutate(o)}><RotateCcw /> {t('offers.restore')}</Button>
            : <Button size="sm" variant="danger-outline" onClick={() => { setNote(''); setRemoveTarget(o) }}><Trash2 /> {t('offers.remove')}</Button>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader eyebrow={t('offers.eyebrow')} title={t('offers.title')} description={t('offers.subtitle')} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:max-w-sm"><Input icon={<Search />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('offers.search')} aria-label={t('common:actions.search')} /></div>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <label className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-medium',
            flagged ? 'border-[#ecc7c3] bg-danger-50 text-danger' : 'border-line bg-white text-ink-soft')}>
            <AlertTriangle className="size-4" />{t('offers.flaggedOnly')}
            <Switch checked={flagged} onCheckedChange={setFlagged} aria-label={t('offers.flaggedOnly')} />
          </label>
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
            <Segmented id="admin-offers-status" value={status} onChange={setStatus} options={[
              { value: 'all', label: t('offers.all') }, { value: 'active', label: t('common:status.active') }, { value: 'paused', label: t('common:status.paused') },
              { value: 'expired', label: t('common:status.expired') }, { value: 'removed', label: t('common:status.removed') },
            ]} />
          </div>
        </div>
      </div>
      {flagged && <p className="mb-3 text-xs text-muted">{t('offers.flaggedHint')}</p>}
      <Card className="overflow-hidden">
        {q.isLoading ? <div className="p-5"><SkeletonList rows={8} /></div>
          : q.isError || !q.data ? <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>
          : q.data.items.length === 0 ? <div className="p-5"><EmptyState icon={<Store />} title={flagged ? t('offers.noFlagged') : t('common:states.noResults')} description={flagged ? undefined : t('common:states.noResultsHint')} /></div>
          : <DataTable columns={columns} rows={q.data.items} rowKey={(o) => o.id}
              rowClassName={(o) => (o.suspicious || o.open_reports ? 'bg-danger-50/50 [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-danger)]' : o.status === 'removed' ? 'opacity-60' : undefined)} />}
      </Card>
      {q.data && <Pagination page={q.data.page} pages={q.data.pages} total={q.data.total} pageSize={q.data.page_size} onChange={setPage} />}

      <ConfirmDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)} title={t('offers.removeTitle')}
        description={removeTarget ? t('offers.removeBody', { title: uz(removeTarget.title), seller: uz(removeTarget.business.name) }) : undefined}
        confirmLabel={<><Trash2 /> {t('offers.remove')}</>} loading={removeM.isPending} onConfirm={() => removeTarget && removeM.mutate(removeTarget)}>
        <Field label={t('offers.note')} htmlFor="rm-note" hint={t('offers.noteHint')}>
          <Textarea id="rm-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('offers.notePlaceholder')} />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
