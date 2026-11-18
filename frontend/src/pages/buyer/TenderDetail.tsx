import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, FileSignature, Hourglass, MessageSquareQuote, Phone, Star, Truck, Wallet, X,
} from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TendersApi, type Bid, type TenderDetail as TD } from '@/api/tenders'
import { ConfirmDialog } from '@/components/buyer/shared'
import { ESignDialog } from '@/components/esign/ESignDialog'
import { Badge, ProductGlyph, QualityBadge } from '@/components/market'
import { BidBadges, BidStatusBadge, Countdown, Facts, TenderStatusBadge, dateInput, endOfDay, usePayment } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { currencyLabel, formatDate, formatNumber, formatUZS, ln } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

type Sort = 'recommended' | 'cheapest' | 'fastest'

export default function TenderDetail() {
  const { id = '' } = useParams()
  const { t } = useTranslation(['tenders', 'common'])
  const q = useQuery({ queryKey: ['tender', id], queryFn: () => TendersApi.detail(id), refetchInterval: 30_000 })
  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-72" /></div>
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  return <Body x={q.data} t={t} />
}

function Body({ x, t }: { x: TD; t: ReturnType<typeof useTranslation>['t'] }) {
  const qc = useQueryClient()
  const pay = usePayment()
  const unit = t(`common:units.${x.unit}`, x.unit)
  const [sort, setSort] = React.useState<Sort>('recommended')
  const [choosing, setChoosing] = React.useState<Bid | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [extendOpen, setExtendOpen] = React.useState(false)
  const live = x.bids.filter((b) => b.status === 'submitted' || b.status === 'accepted')
  const others = x.bids.filter((b) => !live.includes(b))
  const sorted = [...live].sort((a, b) => sort === 'cheapest' ? a.total - b.total : sort === 'fastest' ? a.lead_time_days - b.lead_time_days : (b.score ?? 0) - (a.score ?? 0))
  const canChoose = x.status === 'open' || x.status === 'expired'
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['tender', x.id] }); void qc.invalidateQueries({ queryKey: ['tenders'] }) }

  const cancel = useMutation({
    mutationFn: () => TendersApi.cancel(x.id),
    onSuccess: () => { toast.success(t('detail.cancelled')); setCancelOpen(false); refresh() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const best = live.length ? Math.min(...live.map((b) => b.total)) : null
  const worst = live.length ? Math.max(...live.map((b) => b.total)) : null

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3"><Link to="/app/tenders"><ArrowLeft />{t('nav.myTenders')}</Link></Button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-1.5 ikat-band opacity-60" aria-hidden />
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
            <ProductGlyph category={x.category.slug} name={x.title} emoji={x.product?.emoji} size={64} className="rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="font-mono">{x.number}</span><span>·</span><span>{ln(x.category, 'name')}</span><span>·</span>
                <span>{t('detail.posted', { date: formatDate(x.created_at, true) })}</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] md:text-[28px]">{x.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TenderStatusBadge status={x.status} />
                {x.status === 'open' && <Countdown to={x.closes_at} className="text-[13px]" />}
                <span className="text-[13px] text-muted">{t('detail.views', { count: x.views_count })}</span>
              </div>
              {x.description && <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed whitespace-pre-line text-ink-soft">{x.description}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
              {x.contract_id && <Button asChild><Link to={`/app/contracts/${x.contract_id}`}><FileSignature />{t('detail.openContract')}</Link></Button>}
              {x.status === 'expired' && <Button variant="outline" onClick={() => setExtendOpen(true)}><Hourglass />{t('detail.extend')}</Button>}
              {canChoose && <Button variant="ghost" className="text-danger" onClick={() => setCancelOpen(true)}><X />{t('detail.cancel')}</Button>}
            </div>
          </div>
          <div className="border-t border-dashed border-line p-5">
            <Facts rows={[
              [t('card.qty'), `${formatNumber(x.quantity)} ${unit}`],
              [t('card.budget'), x.target_price ? `${formatUZS(x.target_price)} / ${unit}` : t('card.noBudget')],
              [t('detail.marketPrice'), x.market_price ? `${formatUZS(x.market_price)} / ${unit}` : '—'],
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

      {x.status === 'awarded' && (
        <Banner tone="info" icon={<FileSignature />} title={t('detail.awardedTitle')} body={t('detail.awardedBody')}
          action={x.contract_id && <Button asChild size="sm"><Link to={`/app/contracts/${x.contract_id}`}>{t('detail.openContract')}</Link></Button>} />
      )}
      {x.status === 'contracted' && (
        <Banner tone="good" icon={<CheckCircle2 />} title={t('detail.contractedTitle')} body={t('detail.contractedBody')}
          action={x.contract_id && <Button asChild size="sm"><Link to={`/app/contracts/${x.contract_id}`}>{t('detail.openContract')}</Link></Button>} />
      )}

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">{t('detail.offersTitle', { count: live.length })}</h2>
            <p className="text-[13px] text-muted">{t('detail.offersHint')}</p>
          </div>
          {live.length > 1 && (
            <Segmented id="bid-sort" size="sm" value={sort} onChange={setSort}
              options={(['recommended', 'cheapest', 'fastest'] as Sort[]).map((s) => ({ value: s, label: t(`detail.sort.${s}`) }))} />
          )}
        </div>

        {live.length === 0 ? (
          <EmptyState icon={<MessageSquareQuote />} title={t('detail.noBids')} description={x.status === 'open' ? t('detail.noBidsOpen') : t('detail.noBidsClosed')} />
        ) : (
          <>
            {live.length > 1 && <CompareTable bids={sorted} unit={unit} best={best} />}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {sorted.map((b, i) => (
                <BidCard key={b.id} b={b} i={i} unit={unit} spread={best != null && worst != null && worst > best ? (b.total - best) : 0}
                  canChoose={canChoose && b.status === 'submitted'} onChoose={() => setChoosing(b)} neededBy={x.needed_by} />
              ))}
            </div>
          </>
        )}
        {others.length > 0 && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer text-muted">{t('detail.otherBids', { count: others.length })}</summary>
            <ul className="mt-2 space-y-1.5">
              {others.map((b) => <li key={b.id} className="flex items-center gap-2"><BidStatusBadge status={b.status} />{b.business.name} · {formatUZS(b.unit_price)}</li>)}
            </ul>
          </details>
        )}
      </section>

      <AwardDialog tender={x} bid={choosing} onClose={() => setChoosing(null)} />
      <ExtendDialog tender={x} open={extendOpen} onOpenChange={setExtendOpen} onDone={refresh} />
      <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title={t('detail.cancelTitle')} description={t('detail.cancelBody')}
        confirmLabel={t('detail.cancel')} loading={cancel.isPending} onConfirm={() => cancel.mutate()} />
    </div>
  )
}

function Banner({ tone, icon, title, body, action }: { tone: 'info' | 'good'; icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn('mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', tone === 'good' ? 'border-good/25 bg-good-50' : 'border-[#3b5bdb]/20 bg-[#eef1fd]')}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5', tone === 'good' ? 'bg-good text-white' : 'bg-[#3b5bdb] text-white')}>{icon}</span>
      <div className="flex-1"><div className="font-semibold">{title}</div><div className="text-[13.5px] text-ink-soft">{body}</div></div>
      {action}
    </motion.div>
  )
}

function CompareTable({ bids, unit, best }: { bids: Bid[]; unit: string; best: number | null }) {
  const { t } = useTranslation(['tenders', 'common'])
  const pay = usePayment()
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11.5px] text-muted">
            <th className="px-4 py-2.5 font-medium">{t('detail.col.producer')}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t('detail.col.price', { unit })}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t('detail.col.delivery')}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t('detail.col.total')}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t('detail.col.days')}</th>
            <th className="px-3 py-2.5 font-medium">{t('detail.col.payment')}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t('detail.col.score')}</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((b) => (
            <tr key={b.id} className={cn('border-b border-line/70 last:border-0', b.badges.includes('recommended') && 'bg-mint-50/60')}>
              <td className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1">{b.business.name}{b.business.verified && <BadgeCheck className="size-3.5 fill-good text-white" />}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{formatNumber(b.unit_price)}</td>
              <td className="px-3 py-2.5 text-right font-mono">{b.delivery_price ? formatNumber(b.delivery_price) : <span className="font-sans text-good">{t('detail.included')}</span>}</td>
              <td className={cn('px-3 py-2.5 text-right font-mono font-semibold', b.total === best && 'text-good')}>{formatNumber(b.total)}</td>
              <td className={cn('px-3 py-2.5 text-right font-mono', b.meets_deadline === false && 'text-danger')}>{b.lead_time_days}</td>
              <td className="px-3 py-2.5">{pay(b.payment_terms)}</td>
              <td className="px-4 py-2.5 text-right"><ScoreBar v={b.score ?? 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ScoreBar({ v }: { v: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(4, v)}%` }} /></span>
      <span className="w-7 font-mono text-xs">{Math.round(v)}</span>
    </span>
  )
}

function BidCard({ b, i, unit, spread, canChoose, onChoose, neededBy }: {
  b: Bid; i: number; unit: string; spread: number; canChoose: boolean; onChoose: () => void; neededBy: string
}) {
  const { t } = useTranslation(['tenders', 'common'])
  const pay = usePayment()
  const top = b.badges.includes('recommended')
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      className={cn('relative flex flex-col rounded-[var(--radius-card)] border bg-white/[0.9] shadow-[var(--shadow-card)]', top ? 'border-brand/40 ring-2 ring-brand/15' : 'border-line')}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{b.business.name}</span>
            {b.business.verified && <BadgeCheck className="size-4 shrink-0 fill-good text-white" aria-label="verified" />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span className="inline-flex items-center gap-0.5"><Star className="size-3 fill-saffron text-saffron" />{b.business.rating.toFixed(1)}</span>
            <span>· {t('detail.deals', { count: b.business.completed_deals })}</span>
            {b.business.region && <span>· {b.business.region}</span>}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1"><BidBadges bid={b} />{b.status === 'accepted' && <BidStatusBadge status="accepted" />}</div>
      </div>

      <div className="mx-4 flex items-end justify-between rounded-xl bg-paper px-4 py-3">
        <div>
          <div className="font-mono text-[26px] leading-none font-bold tracking-[-0.03em]">{formatNumber(b.unit_price)}</div>
          <div className="mt-1 text-[11px] text-muted">{currencyLabel()} · {t('common:fields.perUnit', { unit })}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">{t('detail.col.total')}</div>
          <div className="font-mono text-[17px] font-semibold">{formatUZS(b.total)}</div>
          {spread > 0 && <div className="text-[11px] text-danger">+{formatNumber(spread)} {t('detail.vsBest')}</div>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pt-3 text-[13px]">
        <Item icon={<CalendarClock />} k={t('detail.ready')} v={<>{formatDate(b.ready_date)} <span className="text-muted">({t('detail.days', { count: b.lead_time_days })})</span></>} />
        <Item icon={<Truck />} k={t('detail.col.delivery')} v={b.delivery_price ? formatUZS(b.delivery_price) : t('detail.included')} />
        <Item icon={<Wallet />} k={t('detail.col.payment')} v={pay(b.payment_terms)} />
        <Item k={t('form.quality')} v={<QualityBadge quality={b.quality} />} />
        {b.warranty_months > 0 && <Item k={t('bid.warranty')} v={t('detail.months', { count: b.warranty_months })} />}
        <Item k={t('detail.validUntil')} v={formatDate(b.valid_until)} />
        {b.min_quantity != null && <Item k={t('bid.minQty')} v={`${formatNumber(b.min_quantity)} ${unit}`} />}
        {b.business.phone && <Item icon={<Phone />} k={t('detail.phone')} v={<a href={`tel:${b.business.phone}`} className="text-brand">{b.business.phone}</a>} />}
      </dl>

      {(b.meets_deadline === false || b.within_budget === false) && (
        <div className="mx-4 mt-3 flex flex-wrap gap-1.5">
          {b.meets_deadline === false && <Badge tone="danger"><AlertTriangle />{t('detail.late', { date: formatDate(neededBy) })}</Badge>}
          {b.within_budget === false && <Badge tone="saffron">{t('detail.overBudget')}</Badge>}
        </div>
      )}
      {b.comment && <p className="mx-4 mt-3 rounded-xl border border-dashed border-line px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line text-ink-soft">“{b.comment}”</p>}

      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-xs text-muted">{t('detail.score')}: <ScoreBar v={b.score ?? 0} /></span>
        {canChoose && <Button size="sm" variant={top ? 'accent' : 'outline'} onClick={onChoose}><FileSignature />{t('detail.choose')}</Button>}
      </div>
    </motion.article>
  )
}

function Item({ icon, k, v }: { icon?: React.ReactNode; k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11.5px] text-muted [&_svg]:size-3.5">{icon}{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  )
}

/** Choose a bid: confirm contract details, then sign with the (demo) e-signature. */
function AwardDialog({ tender, bid, onClose }: { tender: TD; bid: Bid | null; onClose: () => void }) {
  const { t } = useTranslation(['tenders', 'common'])
  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const pay = usePayment()
  const [company, setCompany] = React.useState('')
  const [title, setTitle] = React.useState('Direktor')
  const [address, setAddress] = React.useState('')
  const [extra, setExtra] = React.useState('')
  const [signOpen, setSignOpen] = React.useState(false)
  const [err, setErr] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!bid) return
    setCompany((c) => c || (user?.business_category ? `“${user.full_name.split(' ')[0]} ${user.business_category}” MChJ` : `${user?.full_name ?? ''}`))
    setAddress((a) => a || [tender.delivery_address, ln(tender.region, 'name')].filter(Boolean).join(', '))
  }, [bid, tender, user])

  const award = useMutation({
    mutationFn: (pin: string) => TendersApi.award(tender.id, { bid_id: bid!.id, buyer_company: company.trim(), signer_title: title.trim(),
      delivery_address: address.trim(), extra_terms: extra.trim() || null, pin }),
    onSuccess: (c) => {
      toast.success(t('award.sent'), { description: t('award.sentHint', { name: bid?.business.name }) })
      void qc.invalidateQueries({ queryKey: ['tender'] })
      void qc.invalidateQueries({ queryKey: ['tenders'] })
      void qc.invalidateQueries({ queryKey: ['contracts'] })
      setSignOpen(false)
      onClose()
      nav(`/app/contracts/${c.id}`)
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const next = () => {
    const er: Record<string, string> = {}
    if (company.trim().length < 2) er.company = t('award.err.company')
    if (title.trim().length < 2) er.title = t('award.err.title')
    if (address.trim().length < 3) er.address = t('award.err.address')
    setErr(er)
    if (!Object.keys(er).length) setSignOpen(true)
  }

  return (
    <>
      <Dialog open={!!bid && !signOpen} onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent title={t('award.title')} description={t('award.description')} className="max-w-xl">
          {bid && (
            <div className="space-y-4">
              <div className="rounded-xl bg-paper p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{bid.business.name}</span>
                  <span className="font-mono text-[17px] font-bold">{formatUZS(bid.total)}</span>
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {formatNumber(tender.quantity)} {t(`common:units.${tender.unit}`, tender.unit)} × {formatUZS(bid.unit_price)}
                  {' · '}{t('detail.days', { count: bid.lead_time_days })}{' · '}{pay(bid.payment_terms)}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('award.company')} hint={t('award.companyHint')} error={err.company} htmlFor="aw-company">
                  <Input id="aw-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={160} />
                </Field>
                <Field label={t('award.signerTitle')} error={err.title} htmlFor="aw-title">
                  <Input id="aw-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
                </Field>
              </div>
              <Field label={t('award.address')} error={err.address} htmlFor="aw-addr">
                <Input id="aw-addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
              </Field>
              <Field label={t('award.extra')} hint={t('award.extraHint')} htmlFor="aw-extra">
                <Textarea id="aw-extra" value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={1500} className="min-h-[72px]" />
              </Field>
              <p className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">{t('award.note')}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>{t('common:actions.cancel')}</Button>
                <Button onClick={next}><FileSignature />{t('award.continue')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ESignDialog open={signOpen} onOpenChange={(o) => { if (!o) setSignOpen(false) }} signerName={user?.full_name ?? ''}
        documentLabel={t('award.docLabel', { number: tender.number, name: bid?.business.name ?? '' })} amount={bid?.total}
        loading={award.isPending} onSign={(pin) => award.mutate(pin)} />
    </>
  )
}

function ExtendDialog({ tender, open, onOpenChange, onDone }: { tender: TD; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { t } = useTranslation(['tenders', 'common'])
  const [date, setDate] = React.useState(dateInput(3))
  const mut = useMutation({
    mutationFn: () => TendersApi.extend(tender.id, endOfDay(date)),
    onSuccess: () => { toast.success(t('detail.extended')); onOpenChange(false); onDone() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('detail.extendTitle')} description={t('detail.extendBody')} className="max-w-sm">
        <Field label={t('form.closesAt')} htmlFor="ext-date">
          <Input id="ext-date" type="date" value={date} min={dateInput(0)} max={tender.needed_by.slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common:actions.cancel')}</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate()}>{t('detail.extend')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
