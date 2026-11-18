import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, Clock, Inbox, MessageSquareQuote, Phone, Repeat2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { PurchaseRequest, RequestStatus } from '@/api/types'
import { Money, ProductGlyph, StatusBadge } from '@/components/market'
import { ConfirmDialog, EASE } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useCategories } from '@/hooks/useCatalog'
import { currencyLabel, formatDate, formatNumber, formatPct, ln, timeAgo, uz } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type Tab = 'all' | RequestStatus
type Act = 'accept' | 'reject' | 'counter' | 'complete'

export default function IncomingRequests() {
  const { t } = useTranslation(['seller', 'common'])
  const [tab, setTab] = React.useState<Tab>('pending')
  const q = useQuery({ queryKey: ['requests', 'seller', tab], queryFn: () => Api.requests(tab === 'all' ? undefined : tab) })
  const all = useQuery({ queryKey: ['requests', 'seller', 'all'], queryFn: () => Api.requests() })
  const counts = React.useMemo(() => {
    const c: Record<string, number> = {}
    all.data?.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [all.data])

  const tabs: Tab[] = ['pending', 'countered', 'accepted', 'completed', 'rejected', 'all']
  return (
    <div>
      <PageHeader eyebrow={t('requests.eyebrow')} title={t('requests.title')} description={t('requests.subtitle')} />
      <div className="-mx-1 mb-5 overflow-x-auto px-1 scrollbar-thin">
        <Segmented id="seller-req-tab" value={tab} onChange={setTab}
          options={tabs.map((s) => ({
            value: s,
            label: <span className="inline-flex items-center gap-1.5">{s === 'all' ? t('requests.tabs.all') : t(`common:status.${s}`)}
              {s !== 'all' && counts[s] ? <span className="rounded bg-black/10 px-1 font-mono text-[10.5px]">{counts[s]}</span> : null}</span>,
          }))} />
      </div>
      {q.isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} />
        : q.data.length === 0 ? <EmptyState icon={<Inbox />} title={t('requests.emptyTab')} description={t('requests.emptyBody')} />
        : (
          <div className="grid gap-3 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {q.data.map((r, i) => <RequestCard key={r.id} r={r} i={i} />)}
            </AnimatePresence>
          </div>
        )}
    </div>
  )
}

function RequestCard({ r, i }: { r: PurchaseRequest; i: number }) {
  const { t } = useTranslation(['seller', 'common'])
  const qc = useQueryClient()
  const cats = useCategories()
  const [confirm, setConfirm] = React.useState<Act | null>(null)
  const [counter, setCounter] = React.useState(false)
  const item = r.items[0]
  const catSlug = cats.data?.find((c) => c.id === item?.product.category_id)?.slug
  const m = useMutation({
    mutationFn: (a: { action: Act; counter_price?: number; message?: string }) => Api.requestAction(r.id, a.action, { counter_price: a.counter_price, message: a.message }),
    onSuccess: (_, a) => {
      toast.success(t(`requests.done.${a.action}`))
      setConfirm(null); setCounter(false)
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const preferredDiff = item?.preferred_price != null && r.offer_unit_price ? ((item.preferred_price - r.offer_unit_price) / r.offer_unit_price) * 100 : null
  const canAccept = r.status === 'pending' || r.status === 'countered'
  const unit = r.offer_unit ?? item?.product.unit

  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35, ease: EASE }}
      className="flex flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3 border-b border-dashed border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-sand font-semibold text-ink-soft">{r.buyer_name.slice(0, 1)}</div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{uz(r.buyer_name)}</p>
            {r.buyer_phone
              ? <a href={`tel:${r.buyer_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 hover:underline"><Phone className="size-3" />{r.buyer_phone}</a>
              : <span className="text-xs text-muted">—</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={r.status} />
          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted"><Clock className="size-3" />{timeAgo(r.created_at)}</span>
        </div>
      </header>

      <div className="flex-1 space-y-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <ProductGlyph category={catSlug} name={item ? ln(item.product, 'name') : ''} emoji={item?.product.emoji} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium">{item ? ln(item.product, 'name') : '—'}</p>
            <p className="truncate text-xs text-muted">{r.offer_title ? uz(r.offer_title) : t('requests.noOffer')}{r.offer_unit_price != null && <> · <Money value={r.offer_unit_price} unit={unit} className="font-mono" /></>}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{t('common:fields.quantity')}</dt>
            <dd className="font-mono font-medium tabular">{item ? formatNumber(item.quantity) : '—'} <span className="font-sans text-xs text-muted">{unit ? t(`common:units.${unit}`, unit) : ''}</span></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('requests.preferredPrice')}</dt>
            <dd className="font-mono font-medium tabular">{item?.preferred_price != null ? formatNumber(item.preferred_price) : '—'}
              {preferredDiff != null && Math.abs(preferredDiff) > 0.05 && <span className={preferredDiff < 0 ? 'ml-1 text-xs text-saffron' : 'ml-1 text-xs text-brand'}>{formatPct(preferredDiff)}</span>}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted">{t('requests.estimatedTotal')}</dt>
            <dd className="font-mono font-semibold tabular text-forest">{r.estimated_total != null ? <Money value={r.estimated_total} /> : '—'}</dd>
          </div>
        </dl>
        {r.counter_price != null && (
          <div className="rounded-lg bg-[#e8ecfb] px-3 py-2 text-[13px] text-[#2f49b0]">
            <span className="font-medium">{t('requests.yourCounter')}:</span> <Money value={r.counter_price} unit={unit} className="font-mono" />
            {r.seller_message && <p className="mt-0.5 text-xs opacity-90">“{r.seller_message}”</p>}
          </div>
        )}
        {r.counter_price == null && r.seller_message && (
          <p className="rounded-lg bg-mint-50 px-3 py-2 text-xs text-ink-soft"><span className="font-medium">{t('requests.yourMessage')}:</span> {r.seller_message}</p>
        )}
        {r.requirements && (
          <p className="flex gap-2 text-[13px] text-ink-soft"><MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-muted" />{uz(r.requirements)}</p>
        )}
        <p className="text-[11.5px] text-muted">{t('requests.dates', { created: formatDate(r.created_at, true), updated: formatDate(r.updated_at, true) })}</p>
      </div>

      {(canAccept || r.status === 'accepted') && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/50 px-5 py-3">
          {canAccept && <Button size="sm" onClick={() => setConfirm('accept')}><Check /> {t('common:actions.accept')}</Button>}
          {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => setCounter(true)}><Repeat2 /> {t('common:actions.counter')}</Button>}
          {canAccept && <Button size="sm" variant="danger-outline" className="sm:ml-auto" onClick={() => setConfirm('reject')}><X /> {t('common:actions.reject')}</Button>}
          {r.status === 'accepted' && <Button size="sm" variant="dark" onClick={() => setConfirm('complete')}><CheckCheck /> {t('common:actions.complete')}</Button>}
        </footer>
      )}

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === 'reject' ? 'danger' : 'primary'}
        title={confirm ? t(`requests.confirm.${confirm}.title`) : ''}
        description={confirm ? t(`requests.confirm.${confirm}.body`, { buyer: uz(r.buyer_name) }) : undefined}
        confirmLabel={confirm ? t(`requests.confirm.${confirm}.cta`) : ''} loading={m.isPending}
        onConfirm={() => confirm && m.mutate({ action: confirm })} />
      <CounterDialog open={counter} onOpenChange={setCounter} r={r} loading={m.isPending}
        onSubmit={(v) => m.mutate({ action: 'counter', counter_price: v.price, message: v.message || undefined })} />
    </motion.article>
  )
}

function CounterDialog({ open, onOpenChange, r, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; r: PurchaseRequest; loading: boolean; onSubmit: (v: { price: number; message: string }) => void
}) {
  const { t } = useTranslation(['seller', 'common'])
  const schema = React.useMemo(() => z.object({
    price: z.number({ error: t('form.errors.number') }).positive(t('form.errors.positive')).max(1e9, t('form.errors.tooLarge')),
    message: z.string().max(500, t('form.errors.max', { n: 500 })),
  }), [t])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) })
  const item = r.items[0]
  React.useEffect(() => {
    if (open) reset({ price: item?.preferred_price ?? r.offer_unit_price ?? NaN, message: '' })
  }, [open, reset, item?.preferred_price, r.offer_unit_price])
  const price = watch('price')
  const total = item && Number.isFinite(price) ? price * item.quantity : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('requests.counterTitle')} description={t('requests.counterBody', { buyer: uz(r.buyer_name) })}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-paper px-3 py-2.5 text-xs">
            <div><span className="text-muted">{t('requests.listed')}: </span><span className="font-mono">{formatNumber(r.offer_unit_price)}</span></div>
            <div><span className="text-muted">{t('requests.preferredPrice')}: </span><span className="font-mono">{formatNumber(item?.preferred_price)}</span></div>
          </div>
          <Field label={t('requests.counterPrice')} error={errors.price?.message} htmlFor="cp-price"
            hint={total != null ? t('requests.counterTotal', { total: formatNumber(total), cur: currencyLabel() }) : undefined}>
            <Input id="cp-price" type="number" step="any" inputMode="decimal" className="font-mono" suffix={currencyLabel()} aria-invalid={!!errors.price}
              {...register('price', { valueAsNumber: true })} />
          </Field>
          <Field label={t('requests.message')} error={errors.message?.message} htmlFor="cp-msg">
            <Textarea id="cp-msg" rows={3} placeholder={t('requests.messagePlaceholder')} {...register('message')} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={loading}><Repeat2 /> {t('requests.sendCounter')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
