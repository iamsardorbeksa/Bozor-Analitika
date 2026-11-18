import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleDot, ClipboardList, MessageSquareQuote, Search, X } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { PurchaseRequest, RequestStatus } from '@/api/types'
import { ConfirmDialog, useProductCategory } from '@/components/buyer/shared'
import { Money, ProductGlyph, StatusBadge } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useRegions } from '@/hooks/useCatalog'
import { formatDate, formatNumber, formatUZS, ln, timeAgo, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const TABS = ['all', 'pending', 'countered', 'accepted', 'completed', 'rejected', 'cancelled'] as const
type Tab = (typeof TABS)[number]
const CANCELLABLE: RequestStatus[] = ['pending', 'countered', 'accepted']

export default function PurchaseRequests() {
  const { t } = useTranslation(['buyer', 'common'])
  const qc = useQueryClient()
  const [tab, setTab] = React.useState<Tab>('all')
  const all = useQuery({ queryKey: ['requests', 'all'], queryFn: () => Api.requests() })
  const filtered = useQuery({ queryKey: ['requests', tab], queryFn: () => Api.requests(tab as RequestStatus), enabled: tab !== 'all' })
  const list = tab === 'all' ? all : filtered
  const [detail, setDetail] = React.useState<PurchaseRequest | null>(null)
  const [cancelling, setCancelling] = React.useState<PurchaseRequest | null>(null)

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: all.data?.length ?? 0 }
    for (const r of all.data ?? []) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [all.data])

  const action = useMutation({
    mutationFn: ({ r, a }: { r: PurchaseRequest; a: 'accept' | 'cancel' }) => Api.requestAction(r.id, a),
    onSuccess: (res, { a }) => {
      toast.success(a === 'accept' ? t('buyer:requests.acceptedToast') : t('buyer:requests.cancelledToast'))
      void qc.invalidateQueries({ queryKey: ['requests'] })
      void qc.invalidateQueries({ queryKey: ['buyer-dashboard'] })
      setCancelling(null)
      setDetail((d) => (d && d.id === res.id ? res : d))
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })
  const busy = (id: string, a: string) => action.isPending && action.variables?.r.id === id && action.variables.a === a

  return (
    <div>
      <PageHeader title={t('common:nav.purchaseRequests')} description={t('buyer:requests.description')}
        actions={<Button asChild variant="outline"><Link to="/app/market"><Search />{t('common:nav.marketExplorer')}</Link></Button>} />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <Segmented id="req-tabs" value={tab} onChange={setTab} className="w-max"
          options={TABS.map((s) => ({
            value: s,
            label: <span className="flex items-center gap-1.5">{s === 'all' ? t('buyer:requests.all') : t(`common:status.${s}`)}
              {counts[s] ? <span className="font-mono text-[11px] opacity-70">{counts[s]}</span> : null}</span>,
          }))} />
      </div>

      {list.isLoading ? <SkeletonList rows={4} className="[&>div]:h-28" />
        : list.isError || !list.data ? <ErrorState onRetry={() => list.refetch()} />
          : list.data.length === 0 ? (
            <EmptyState icon={<ClipboardList />} title={tab === 'all' ? t('buyer:requests.emptyTitle') : t('buyer:requests.emptyTab')}
              description={t('buyer:requests.emptyHint')}
              action={<Button asChild><Link to="/app/market">{t('buyer:saved.browse')}</Link></Button>} />
          ) : (
            <div className="space-y-3">
              {list.data.map((r, i) => (
                <RequestRow key={r.id} r={r} index={i} onOpen={() => setDetail(r)} onCancel={() => setCancelling(r)}
                  onAccept={() => action.mutate({ r, a: 'accept' })} accepting={busy(r.id, 'accept')} />
              ))}
            </div>
          )}

      <RequestDetail r={detail} onOpenChange={(o) => { if (!o) setDetail(null) }} onCancel={(r) => setCancelling(r)}
        onAccept={(r) => action.mutate({ r, a: 'accept' })} accepting={!!detail && busy(detail.id, 'accept')} />
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => { if (!o) setCancelling(null) }}
        title={t('buyer:requests.cancelTitle')} description={t('buyer:requests.cancelBody')} confirmLabel={t('buyer:requests.cancelConfirm')}
        loading={!!cancelling && busy(cancelling.id, 'cancel')} onConfirm={() => cancelling && action.mutate({ r: cancelling, a: 'cancel' })} />
    </div>
  )
}

function RequestRow({ r, index, onOpen, onCancel, onAccept, accepting }: {
  r: PurchaseRequest; index: number; onOpen: () => void; onCancel: () => void; onAccept: () => void; accepting: boolean
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const catOf = useProductCategory()
  const item = r.items[0]
  const name = item ? ln(item.product, 'name') : uz(r.offer_title ?? '—')
  const unit = r.offer_unit ?? item?.product.unit ?? ''
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }}>
      <Card className="transition-shadow hover:shadow-[var(--shadow-lift)]">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <ProductGlyph category={catOf(item?.product_id, item?.product.category_id)} name={name} emoji={item?.product.emoji} size={44} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{name}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-0.5 truncate text-[13px] text-muted">{uz(r.business_name)} · {t('buyer:requests.sent', { time: timeAgo(r.created_at) })}</div>
            </div>
          </button>
          <div className="grid grid-cols-2 gap-4 text-sm md:flex md:items-center md:gap-8">
            <div>
              <div className="text-[11.5px] text-muted">{t('common:fields.quantity')}</div>
              <div className="font-medium tabular">{formatNumber(item?.quantity)} {t(`common:units.${unit}`, unit)}</div>
            </div>
            <div className="md:text-right">
              <div className="text-[11.5px] text-muted">{t('buyer:requests.estTotal')}</div>
              <div className="font-mono font-semibold tabular">{formatUZS(r.estimated_total)}</div>
            </div>
          </div>
          <div className="flex gap-2 md:w-[220px] md:justify-end">
            {r.status === 'countered' && <Button size="sm" onClick={onAccept} loading={accepting}><Check />{t('buyer:requests.acceptCounter')}</Button>}
            {CANCELLABLE.includes(r.status) && <Button size="sm" variant="danger-outline" onClick={onCancel}><X />{t('common:actions.cancel')}</Button>}
            <Button size="sm" variant="ghost" onClick={onOpen}>{t('common:actions.details')}</Button>
          </div>
        </div>
        {r.status === 'countered' && r.counter_price != null && (
          <div className="flex flex-col gap-1 border-t border-dashed border-line bg-[#f3f5fd] px-5 py-3 text-[13px] sm:flex-row sm:items-center sm:gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#3b5bdb]"><MessageSquareQuote className="size-4" />{t('buyer:requests.counterPrice')}</span>
            <span className="font-mono font-semibold"><Money value={r.counter_price} unit={unit} /></span>
            {r.offer_unit_price != null && <span className="text-muted line-through"><Money value={r.offer_unit_price} /></span>}
            {r.seller_message && <span className="text-ink-soft sm:ml-2">“{uz(r.seller_message)}”</span>}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function RequestDetail({ r, onOpenChange, onCancel, onAccept, accepting }: {
  r: PurchaseRequest | null; onOpenChange: (o: boolean) => void; onCancel: (r: PurchaseRequest) => void; onAccept: (r: PurchaseRequest) => void; accepting: boolean
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const regions = useRegions()
  if (!r) return null
  const item = r.items[0]
  const unit = r.offer_unit ?? item?.product.unit ?? ''
  const region = regions.data?.find((x) => x.id === r.delivery_region_id)
  const final = r.status !== 'pending' && r.status !== 'countered'

  const steps: { key: string; label: string; time?: string; tone: 'done' | 'current' | 'bad' | 'future'; note?: React.ReactNode }[] = [
    { key: 'sent', label: t('buyer:requests.timeline.sent'), time: r.created_at, tone: 'done' },
  ]
  if (r.counter_price != null)
    steps.push({ key: 'countered', label: t('buyer:requests.timeline.countered'), time: r.status === 'countered' ? r.updated_at : undefined,
      tone: r.status === 'countered' ? 'current' : 'done', note: <Money value={r.counter_price} unit={unit} className="font-mono" /> })
  if (r.status === 'pending') steps.push({ key: 'wait', label: t('buyer:requests.timeline.waiting'), tone: 'current' })
  if (final) {
    const bad = r.status === 'rejected' || r.status === 'cancelled'
    if (r.status === 'completed') steps.push({ key: 'accepted', label: t('common:status.accepted'), tone: 'done' })
    steps.push({ key: r.status, label: t(`common:status.${r.status}`), time: r.updated_at, tone: bad ? 'bad' : r.status === 'accepted' ? 'current' : 'done' })
    if (r.status === 'accepted') steps.push({ key: 'complete', label: t('buyer:requests.timeline.completeNext'), tone: 'future' })
  }

  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent wide title={item ? ln(item.product, 'name') : uz(r.offer_title ?? '')} description={`${uz(r.business_name)} · #${r.id.slice(0, 8)}`}>
        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
              {[
                [t('common:fields.status'), <StatusBadge status={r.status} />],
                [t('common:fields.quantity'), `${formatNumber(item?.quantity)} ${t(`common:units.${unit}`, unit)}`],
                [t('common:fields.unitPrice'), <Money value={r.offer_unit_price} unit={unit} className="font-mono" />],
                [t('buyer:request.preferredPrice'), item?.preferred_price != null ? <Money value={item.preferred_price} className="font-mono" /> : '—'],
                [t('buyer:request.deliveryRegion'), region ? ln(region, 'name') : '—'],
                [t('buyer:requests.estTotal'), <span className="font-mono font-semibold">{formatUZS(r.estimated_total)}</span>],
              ].map(([k, v], i) => (
                <div key={i} className="bg-white px-3 py-2.5">
                  <dt className="text-[11.5px] text-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {r.requirements && (
              <div className="mt-4">
                <div className="mb-1 text-[11.5px] text-muted">{t('buyer:request.requirements')}</div>
                <p className="rounded-xl bg-paper px-3 py-2.5 text-sm">{r.requirements}</p>
              </div>
            )}
            {r.seller_message && (
              <div className="mt-4">
                <div className="mb-1 text-[11.5px] text-muted">{t('buyer:requests.sellerMessage')}</div>
                <p className="rounded-xl border border-[#d9e0f8] bg-[#f3f5fd] px-3 py-2.5 text-sm">“{uz(r.seller_message)}”</p>
              </div>
            )}
            {r.offer_id && (
              <Button asChild variant="link" size="sm" className="mt-3"><Link to={`/app/market/${r.offer_id}`}>{t('buyer:requests.viewOffer')}</Link></Button>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('buyer:requests.timelineTitle')}</div>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {steps.map((s, i) => (
                <motion.li key={s.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="relative">
                  <span className={cn('absolute top-0.5 -left-[27px] grid size-[14px] place-items-center rounded-full ring-4 ring-white',
                    s.tone === 'done' && 'bg-brand', s.tone === 'current' && 'bg-saffron', s.tone === 'bad' && 'bg-danger', s.tone === 'future' && 'border border-dashed border-line-strong bg-white')}>
                    {s.tone === 'current' && <CircleDot className="size-2.5 text-white" />}
                  </span>
                  <div className={cn('text-sm font-medium', s.tone === 'future' && 'text-muted')}>{s.label}</div>
                  {s.note && <div className="text-[13px]">{s.note}</div>}
                  {s.time && <div className="text-xs text-muted">{formatDate(s.time, true)}</div>}
                </motion.li>
              ))}
            </ol>
          </div>
        </div>

        {(r.status === 'countered' || CANCELLABLE.includes(r.status)) && (
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            {CANCELLABLE.includes(r.status) && <Button variant="danger-outline" onClick={() => onCancel(r)}><X />{t('buyer:requests.cancelConfirm')}</Button>}
            {r.status === 'countered' && <Button onClick={() => onAccept(r)} loading={accepting}><Check />{t('buyer:requests.acceptCounter')}</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
