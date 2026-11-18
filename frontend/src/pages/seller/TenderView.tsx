import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FileSignature, Info, Lock, Send, Undo2 } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PAYMENT_TERMS, TendersApi, type BidInput, type PaymentTerms, type TenderDetail } from '@/api/tenders'
import type { Quality } from '@/api/types'
import { ConfirmDialog } from '@/components/buyer/shared'
import { Badge, ProductGlyph } from '@/components/market'
import { BidStatusBadge, Countdown, Facts, TenderStatusBadge, usePayment } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { currencyLabel, formatDate, formatNumber, formatPct, formatUZS, ln } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const QUALITIES: Quality[] = ['premium', 'first', 'standard', 'economy']

export default function TenderView() {
  const { id = '' } = useParams()
  const q = useQuery({ queryKey: ['tender', id], queryFn: () => TendersApi.detail(id) })
  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-72" /></div>
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  return <Body x={q.data} />
}

function Body({ x }: { x: TenderDetail }) {
  const { t } = useTranslation(['tenders', 'common'])
  const pay = usePayment()
  const unit = t(`common:units.${x.unit}`, x.unit)
  const my = x.my_bid
  const open = x.status === 'open' && new Date(x.closes_at).getTime() > Date.now()
  const editable = open && (!my || my.status === 'submitted' || my.status === 'withdrawn')

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3"><Link to="/app/seller/tenders"><ArrowLeft />{t('nav.board')}</Link></Button>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className="h-1.5 ikat-band opacity-60" aria-hidden />
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <ProductGlyph category={x.category.slug} name={x.title} emoji={x.product?.emoji} size={64} className="rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <span className="font-mono">{x.number}</span><span>·</span><span>{ln(x.category, 'name')}</span>
                    {x.matches_me && <Badge tone="brand">{t('card.matches')}</Badge>}
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] md:text-[28px]">{x.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                    <TenderStatusBadge status={x.status} />
                    {x.status === 'open' && <Countdown to={x.closes_at} />}
                    <span className="text-muted">{x.buyer_label}</span>
                    <span className="text-muted">{t('card.bids', { count: x.bids_count })}</span>
                  </div>
                </div>
              </div>
              {x.description && <p className="border-t border-dashed border-line px-5 py-4 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-soft">{x.description}</p>}
              <div className="border-t border-dashed border-line p-5">
                <Facts rows={[
                  [t('card.qty'), `${formatNumber(x.quantity)} ${unit}`],
                  [t('card.budget'), x.target_price ? `${formatUZS(x.target_price)} / ${unit}` : t('card.noBudget')],
                  [t('card.estValue'), x.estimated_value ? `≈ ${formatUZS(x.estimated_value)}` : '—'],
                  [t('form.quality'), x.quality ? t(`common:quality.${x.quality}`) : t('form.any')],
                  [t('form.payment'), pay(x.payment_terms)],
                  [t('form.region'), `${ln(x.region, 'name')}${x.delivery_address ? `, ${x.delivery_address}` : ''}`],
                  [t('form.closesAt'), formatDate(x.closes_at, true)],
                  [t('form.neededBy'), formatDate(x.needed_by)],
                  [t('form.deliveryShort'), x.delivery_required ? t('detail.deliveryYes') : t('detail.pickup')],
                ]} />
              </div>
            </Card>
          </motion.div>
          <Card className="flex gap-3 p-4 text-[13px] leading-relaxed text-ink-soft">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted" />
            <p>{t('bid.sealed')}</p>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {my && my.status === 'accepted' && x.contract_id && (
            <Card className="border-good/30 bg-good-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-good"><CheckCircle2 className="size-5" />{t('bid.wonTitle')}</div>
              <p className="mt-1 text-[13px] text-ink-soft">{t('bid.wonBody')}</p>
              <Button asChild className="mt-3 w-full"><Link to={`/app/contracts/${x.contract_id}`}><FileSignature />{t('bid.openContract')}</Link></Button>
            </Card>
          )}
          {my && my.status === 'rejected' && <Card className="p-4 text-[13px] text-ink-soft"><BidStatusBadge status="rejected" /> <span className="ml-1">{t('bid.lostBody')}</span></Card>}
          <BidForm x={x} editable={editable} />
        </aside>
      </div>
    </div>
  )
}

function BidForm({ x, editable }: { x: TenderDetail; editable: boolean }) {
  const { t } = useTranslation(['tenders', 'common'])
  const qc = useQueryClient()
  const my = x.my_bid
  const unit = t(`common:units.${x.unit}`, x.unit)
  const [f, setF] = React.useState({
    unit_price: my ? String(my.unit_price) : '', delivery_price: my ? String(my.delivery_price) : '0',
    lead_time_days: my ? String(my.lead_time_days) : '5', payment_terms: (my?.payment_terms ?? x.payment_terms ?? 'on_delivery') as PaymentTerms,
    quality: (my?.quality ?? x.quality ?? 'standard') as Quality, warranty_months: my ? String(my.warranty_months) : '0',
    valid_days: my ? String(my.valid_days) : '10', min_quantity: my?.min_quantity ? String(my.min_quantity) : '', comment: my?.comment ?? '',
  })
  const [err, setErr] = React.useState<Record<string, string>>({})
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }))
  const price = Number(f.unit_price) || 0
  const goods = price * x.quantity
  const total = goods + (Number(f.delivery_price) || 0)
  const daysLeft = Math.ceil((new Date(x.needed_by).getTime() - Date.now()) / 86_400_000)
  const vsBudget = x.target_price && price ? (price - x.target_price) / x.target_price * 100 : null
  const vsMarket = x.market_price && price ? (price - x.market_price) / x.market_price * 100 : null

  const refresh = () => { void qc.invalidateQueries({ queryKey: ['tender', x.id] }); void qc.invalidateQueries({ queryKey: ['tenders'] }) }
  const send = useMutation({
    mutationFn: (body: BidInput) => TendersApi.bid(x.id, body),
    onSuccess: () => { toast.success(my?.status === 'submitted' ? t('bid.updated') : t('bid.sent'), { description: t('bid.sentHint') }); refresh() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })
  const withdraw = useMutation({
    mutationFn: () => TendersApi.withdraw(x.id),
    onSuccess: () => { toast.success(t('bid.withdrawn')); setWithdrawOpen(false); refresh() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!(price > 0)) er.unit_price = t('form.err.positive')
    if (!(Number(f.lead_time_days) >= 1)) er.lead_time_days = t('bid.err.days')
    if (Number(f.delivery_price) < 0) er.delivery_price = t('form.err.positive')
    if (f.min_quantity && Number(f.min_quantity) > x.quantity) er.min_quantity = t('bid.err.minQty')
    setErr(er)
    if (Object.keys(er).length) return
    send.mutate({
      unit_price: price, delivery_price: Number(f.delivery_price) || 0, lead_time_days: Number(f.lead_time_days),
      payment_terms: f.payment_terms, quality: f.quality, warranty_months: Number(f.warranty_months) || 0,
      valid_days: Number(f.valid_days) || 10, min_quantity: f.min_quantity ? Number(f.min_quantity) : null, comment: f.comment.trim() || null,
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-ink px-5 py-3.5 text-white">
        <div className="font-semibold">{my && my.status !== 'withdrawn' ? t('bid.yourOffer') : t('bid.title')}</div>
        {my && <BidStatusBadge status={my.status} className="bg-white/15 text-white" />}
      </div>
      <form onSubmit={submit} className="space-y-3.5 p-5" noValidate>
        <fieldset disabled={!editable} className="space-y-3.5 disabled:opacity-70">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('bid.unitPrice', { unit })} error={err.unit_price} htmlFor="b-price">
              <Input id="b-price" type="number" inputMode="decimal" min={0} step="any" className="font-mono" value={f.unit_price} onChange={up('unit_price')} suffix={currencyLabel()} aria-invalid={!!err.unit_price} />
            </Field>
            <Field label={t('bid.delivery')} hint={t('bid.deliveryHint')} error={err.delivery_price} htmlFor="b-del">
              <Input id="b-del" type="number" inputMode="decimal" min={0} step="any" className="font-mono" value={f.delivery_price} onChange={up('delivery_price')} suffix={currencyLabel()} />
            </Field>
          </div>
          {(vsBudget != null || vsMarket != null) && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {vsBudget != null && <Badge tone={vsBudget <= 0 ? 'good' : 'saffron'}>{t('bid.vsBudget', { pct: formatPct(vsBudget) })}</Badge>}
              {vsMarket != null && <Badge tone="outline">{t('bid.vsMarket', { pct: formatPct(vsMarket) })}</Badge>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('bid.leadTime')} error={err.lead_time_days} htmlFor="b-days"
              hint={daysLeft > 0 ? t('bid.daysLeft', { count: daysLeft }) : undefined}>
              <Input id="b-days" type="number" min={1} max={365} className={cn('font-mono', Number(f.lead_time_days) > daysLeft && 'border-saffron')} value={f.lead_time_days} onChange={up('lead_time_days')} />
            </Field>
            <Field label={t('form.quality')} htmlFor="b-q">
              <Select id="b-q" value={f.quality} onChange={up('quality')}>{QUALITIES.map((q) => <option key={q} value={q}>{t(`common:quality.${q}`)}</option>)}</Select>
            </Field>
          </div>
          <Field label={t('form.payment')} htmlFor="b-pay">
            <Select id="b-pay" value={f.payment_terms} onChange={up('payment_terms')}>{PAYMENT_TERMS.map((p) => <option key={p} value={p}>{t(`payment.${p}`)}</option>)}</Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('bid.warranty')} htmlFor="b-war"><Input id="b-war" type="number" min={0} max={120} className="font-mono" value={f.warranty_months} onChange={up('warranty_months')} suffix={t('bid.monthsShort')} /></Field>
            <Field label={t('bid.valid')} htmlFor="b-valid"><Input id="b-valid" type="number" min={1} max={90} className="font-mono" value={f.valid_days} onChange={up('valid_days')} suffix={t('bid.daysShort')} /></Field>
            <Field label={t('bid.minQty')} error={err.min_quantity} htmlFor="b-min"><Input id="b-min" type="number" min={0} className="font-mono" value={f.min_quantity} onChange={up('min_quantity')} placeholder="—" /></Field>
          </div>
          <Field label={t('bid.comment')} htmlFor="b-comment">
            <Textarea id="b-comment" value={f.comment} onChange={up('comment')} maxLength={2000} placeholder={t('bid.commentPh')} className="min-h-[80px]" />
          </Field>
        </fieldset>

        <div className="rounded-xl bg-paper p-3.5 text-sm">
          <div className="flex justify-between text-muted"><span>{formatNumber(x.quantity)} {unit} × {formatNumber(price)}</span><span className="font-mono">{formatNumber(goods)}</span></div>
          <div className="flex justify-between text-muted"><span>{t('bid.delivery')}</span><span className="font-mono">{formatNumber(Number(f.delivery_price) || 0)}</span></div>
          <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold"><span>{t('bid.total')}</span><span className="font-mono">{formatUZS(total)}</span></div>
        </div>

        {editable ? (
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1" loading={send.isPending}><Send />{my?.status === 'submitted' ? t('bid.update') : t('bid.submit')}</Button>
            {my?.status === 'submitted' && <Button type="button" variant="outline" size="lg" onClick={() => setWithdrawOpen(true)} aria-label={t('bid.withdraw')}><Undo2 /></Button>}
          </div>
        ) : (
          <p className="flex gap-1.5 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{t('bid.closedNote')}</p>
        )}
      </form>
      <ConfirmDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} title={t('bid.withdrawTitle')} description={t('bid.withdrawBody')}
        confirmLabel={t('bid.withdraw')} loading={withdraw.isPending} onConfirm={() => withdraw.mutate()} />
    </Card>
  )
}
