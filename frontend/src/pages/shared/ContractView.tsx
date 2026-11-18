import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Check, CircleSlash, Clock, FileCheck2, PenLine, Printer, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TendersApi, type Contract, type ContractTerms, type Party } from '@/api/tenders'
import { ConfirmDialog } from '@/components/buyer/shared'
import { ESignDialog, fnv } from '@/components/esign/ESignDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { currentLang, formatNumber, formatUZS, type Lang } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { ContractStatusBadge } from './Contracts'

// ------------------------------------------------------------------ helpers

/** Official documents use dd.mm.yyyy in all three languages. */
const dmy = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}
const dmyhm = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${dmy(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}
const money = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 2)

const UZ_ONES = ['', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz']
const UZ_TENS = ['', 'oʻn', 'yigirma', 'oʻttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'toʻqson']
const UZ_SCALES = ['', 'ming', 'million', 'milliard', 'trillion']
/** 1 350 000 -> "bir million uch yuz ellik ming" (Uzbek amounts in words, as written in contracts). */
export function uzWords(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'nol'
  const three = (x: number) => {
    const h = Math.floor(x / 100), r = x % 100
    return [h ? `${UZ_ONES[h]} yuz` : '', UZ_TENS[Math.floor(r / 10)], UZ_ONES[r % 10]].filter(Boolean).join(' ')
  }
  const parts: string[] = []
  for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
    const g = n % 1000
    if (g) parts.unshift([three(g), UZ_SCALES[i]].filter(Boolean).join(' '))
  }
  return parts.join(' ')
}

/** Deterministic QR-like mark from the document hash (decorative; verification is shown next to it). */
function HashMark({ hash, size = 92 }: { hash: string; size?: number }) {
  const n = 25
  const bits: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    const c = parseInt(hash[i % hash.length] || '0', 16)
    bits.push(((c >> (i % 4)) & 1) === 1 !== ((fnv(hash + i) & 3) === 0))
  }
  const finder = (x: number, y: number) => {
    const inBox = (px: number, py: number) => px >= x && px < x + 7 && py >= y && py < y + 7
    return { inBox, ring: (px: number, py: number) => inBox(px, py) && (px === x || px === x + 6 || py === y || py === y + 6 || (px >= x + 2 && px <= x + 4 && py >= y + 2 && py <= y + 4)) }
  }
  const fs = [finder(0, 0), finder(n - 7, 0), finder(0, n - 7)]
  const cells: React.ReactNode[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = fs.find((q) => q.inBox(x, y))
    const on = f ? f.ring(x, y) : bits[y * n + x]
    if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />)
  }
  return <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} className="shrink-0 bg-white" aria-hidden><g fill="#111">{cells}</g></svg>
}

// ------------------------------------------------------------------ page

export default function ContractView() {
  const { id = '' } = useParams()
  const { t } = useTranslation('contract')
  const q = useQuery({ queryKey: ['contract', id], queryFn: () => TendersApi.contract(id), enabled: !!id })

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-[720px]" /></div>
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />
  if (!q.data) return <EmptyState title={t('view.notFound')} />
  return <ContractBody c={q.data} />
}

function ContractBody({ c }: { c: Contract }) {
  const { t } = useTranslation('contract')
  const back = c.my_role === 'buyer' ? `/app/tenders/${c.tender_id}` : c.my_role === 'seller' ? `/app/seller/tenders/${c.tender_id}` : null
  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        {back ? <Button asChild variant="ghost" size="sm"><Link to={back}><ArrowLeft />{t('view.back')}</Link></Button> : <span />}
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />{t('view.print')}</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 xl:order-1">
          <Paper c={c} />
        </div>
        <div className="no-print space-y-4 xl:sticky xl:top-20 xl:order-2 xl:self-start">
          <ActionPanel c={c} />
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ action panel

function ActionPanel({ c }: { c: Contract }) {
  const { t } = useTranslation('contract')
  const qc = useQueryClient()
  const [signer, setSigner] = React.useState(c.terms.seller.director)
  const [title, setTitle] = React.useState(t('doc.director'))
  const [signOpen, setSignOpen] = React.useState(false)
  const [declineOpen, setDeclineOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)

  const refresh = (fresh: Contract) => {
    qc.setQueryData(['contract', c.id], fresh)
    for (const k of [['contracts'], ['contract', c.id], ['tender'], ['tenders']]) void qc.invalidateQueries({ queryKey: k })
  }
  const sign = useMutation({
    mutationFn: (pin: string) => TendersApi.sign(c.id, { signer_name: signer.trim(), signer_title: title.trim(), pin }),
    onSuccess: (r) => { refresh(r); setSignOpen(false); toast.success(t('view.signedToast')) },
    onError: (e) => toast.error(errorMessage(e, 'Error')),
  })
  const decline = useMutation({
    mutationFn: () => TendersApi.decline(c.id, reason.trim()),
    onSuccess: (r) => { refresh(r); setDeclineOpen(false); toast.success(t('view.declinedToast')) },
    onError: (e) => toast.error(errorMessage(e, 'Error')),
  })
  const withdraw = useMutation({
    mutationFn: () => TendersApi.cancelContract(c.id),
    onSuccess: (r) => { refresh(r); setWithdrawOpen(false); toast.success(t('view.withdrawnToast')) },
    onError: (e) => toast.error(errorMessage(e, 'Error')),
  })

  const awaiting = c.status === 'awaiting_seller'
  const steps: { label: string; at?: string | null; state: 'done' | 'current' | 'todo' | 'bad' }[] = [
    { label: t('view.stepCreated'), at: c.created_at, state: 'done' },
    { label: t('view.stepBuyer'), at: c.buyer_signed_at, state: 'done' },
    c.status === 'declined' ? { label: t('view.stepDeclined'), at: c.updated_at, state: 'bad' }
      : c.status === 'cancelled' ? { label: t('view.stepCancelled'), at: c.updated_at, state: 'bad' }
        : { label: t('view.stepSeller'), at: c.seller_signed_at, state: c.seller_signed_at ? 'done' : 'current' },
    ...(c.status === 'signed' || awaiting ? [{ label: t('view.stepInForce'), at: c.seller_signed_at, state: (c.status === 'signed' ? 'done' : 'todo') as 'done' | 'todo' }] : []),
  ]

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[12px] whitespace-nowrap text-muted">№ {c.number}</div>
          <ContractStatusBadge status={c.status} className="max-w-[65%] truncate" />
        </div>
        <div className="mt-1.5 font-semibold leading-snug tracking-[-0.01em]">{c.tender_title}</div>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
          <div className="bg-white px-3 py-2.5"><dt className="text-[11.5px] text-muted">{t('view.total')}</dt><dd className="mt-0.5 font-mono font-semibold">{formatUZS(c.total_amount)}</dd></div>
          <div className="bg-white px-3 py-2.5"><dt className="text-[11.5px] text-muted">{t('view.with')}</dt><dd className="mt-0.5 truncate font-medium">{c.counterparty}</dd></div>
        </dl>

        <div className="mt-5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{t('view.progress')}</div>
        <ol className="mt-3 space-y-0">
          {steps.map((s, i) => (
            <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && <span className={cn('absolute top-6 left-[11px] h-[calc(100%-20px)] w-px', s.state === 'done' ? 'bg-good' : 'bg-line')} />}
              <span className={cn('relative grid size-6 shrink-0 place-items-center rounded-full border text-white',
                s.state === 'done' && 'border-good bg-good', s.state === 'bad' && 'border-danger bg-danger',
                s.state === 'current' && 'border-brand bg-white text-brand', s.state === 'todo' && 'border-line bg-white text-muted')}>
                {s.state === 'done' ? <Check className="size-3.5" /> : s.state === 'bad' ? <Ban className="size-3.5" /> : s.state === 'current' ? <Clock className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className={cn('text-[13.5px] font-medium', s.state === 'todo' && 'text-muted')}>{s.label}</div>
                {s.at && s.state !== 'todo' && s.state !== 'current' && <div className="font-mono text-[11.5px] text-muted">{dmyhm(s.at)}</div>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {awaiting && c.my_role === 'seller' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-brand/40 p-5 ring-2 ring-brand/10">
            <div className="flex items-center gap-2 font-semibold"><PenLine className="size-4 text-brand" />{t('view.yourTurn')}</div>
            <p className="mt-1 text-[13px] leading-snug text-muted">{t('view.yourTurnHint')}</p>
            <div className="mt-4 space-y-3">
              <Field label={t('view.signerName')} htmlFor="sg-name"><Input id="sg-name" value={signer} onChange={(e) => setSigner(e.target.value)} /></Field>
              <Field label={t('view.signerTitle')} htmlFor="sg-title"><Input id="sg-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            </div>
            <div className="mt-4 grid gap-2">
              <Button size="lg" variant="accent" disabled={signer.trim().length < 3 || title.trim().length < 2} onClick={() => setSignOpen(true)}><ShieldCheck />{t('view.sign')}</Button>
              <Button variant="danger-outline" onClick={() => setDeclineOpen(true)}><CircleSlash />{t('view.decline')}</Button>
            </div>
          </Card>
        </motion.div>
      )}
      {awaiting && c.my_role === 'buyer' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold"><Clock className="size-4 text-saffron" />{t('view.waitingSeller')}</div>
          <p className="mt-1 text-[13px] leading-snug text-muted">{t('view.waitingSellerHint')}</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => setWithdrawOpen(true)}><Undo2 />{t('view.withdraw')}</Button>
        </Card>
      )}
      {c.status === 'signed' && (
        <Card className="flex items-center gap-3 border-good/30 bg-good-50/60 p-4 text-[13.5px] font-medium text-good"><FileCheck2 className="size-5 shrink-0" />{t('view.inForce')}</Card>
      )}
      {c.status === 'declined' && c.decline_reason && (
        <Card className="border-danger/25 p-4">
          <div className="text-[12px] font-semibold text-danger">{t('view.declinedReason')}</div>
          <p className="mt-1 text-[13.5px]">{c.decline_reason}</p>
        </Card>
      )}

      <ESignDialog open={signOpen} onOpenChange={setSignOpen} signerName={signer} documentLabel={`№ ${c.number}`} amount={c.total_amount}
        loading={sign.isPending} onSign={(pin) => sign.mutate(pin)} />
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent title={t('view.declineTitle')} description={t('view.declineBody')}>
          <Field label={t('view.declineReason')} htmlFor="dc-reason">
            <Textarea id="dc-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>{t('view.cancel')}</Button>
            <Button variant="danger" disabled={reason.trim().length < 3} loading={decline.isPending} onClick={() => decline.mutate()}>{t('view.declineConfirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} title={t('view.withdrawTitle')} description={t('view.withdrawBody')}
        confirmLabel={t('view.withdrawConfirm')} loading={withdraw.isPending} onConfirm={() => withdraw.mutate()} />
    </>
  )
}

// ------------------------------------------------------------------ the document

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #contract-paper, #contract-paper * { visibility: visible !important; }
  #contract-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
}`

function Paper({ c }: { c: Contract }) {
  const { t } = useTranslation('contract')
  const lang = currentLang()
  const T = c.terms
  const product = (T.item[`product_${lang}` as 'product_uz'] as string | null) || T.item.title
  const unit = t(`common:units.${T.item.unit}`, T.item.unit)
  const quality = t(`common:quality.${T.item.quality}`)
  const words = lang === 'uz' ? ` (${uzWords(T.total_amount)} soʻm)` : ''
  const deliveryPaid = !T.delivery.included && T.delivery.price > 0
  const pay = T.payment
  const extras = [T.seller_conditions && t('doc.sellerConditions', { text: T.seller_conditions }),
    T.buyer_extra_terms && t('doc.buyerConditions', { text: T.buyer_extra_terms })].filter(Boolean) as string[]

  const sections: { title: string; items: string[] }[] = [
    { title: t('doc.s1'), items: [t('doc.s1p1', { product, qty: formatNumber(T.item.quantity, Number.isInteger(T.item.quantity) ? 0 : 2), unit }), t('doc.s1p2'), t('doc.s1p3', { tender: T.tender_number })] },
    { title: t('doc.s2'), items: [
      t('doc.s2p1', { unitPrice: money(T.item.unit_price), goods: money(T.item.goods_amount) }),
      deliveryPaid ? t('doc.s2p2Paid', { delivery: money(T.delivery.price) }) : t('doc.s2p2Included'),
      t('doc.s2p3', { total: money(T.total_amount), words }), t('doc.s2p4')] },
    { title: t('doc.s3'), items: [
      ...(pay.prepay_pct > 0
        ? [t('doc.s3Prepay', { pct: pay.prepay_pct, amount: money(pay.prepay_amount) }),
          ...(pay.rest_amount > 0 ? [t('doc.s3RestAfter', { amount: money(pay.rest_amount), days: 5 })] : [])]
        : pay.deferral_days > 0 ? [t('doc.s3Deferred', { amount: money(T.total_amount), days: pay.deferral_days })]
          : [t('doc.s3OnDelivery', { amount: money(T.total_amount) })]),
      t('doc.s3Transfer')] },
    { title: t('doc.s4'), items: [
      t('doc.s4p1', { date: dmy(T.delivery.date), days: T.delivery.lead_time_days, address: T.delivery.address }),
      deliveryPaid ? t('doc.s4p2Paid', { price: money(T.delivery.price) }) : t('doc.s4p2Included'),
      t('doc.s4p3'), t('doc.s4p4', { date: dmy(T.delivery.needed_by) })] },
    { title: t('doc.s5'), items: [t('doc.s5p1', { quality }), t('doc.s5p2'),
      T.warranty_months > 0 ? t('doc.s5Warranty', { months: T.warranty_months }) : t('doc.s5NoWarranty')] },
    { title: t('doc.s6'), items: [t('doc.s6p1', { pct: T.penalty_pct_per_day, cap: T.penalty_cap_pct }), t('doc.s6p2', { pct: T.penalty_pct_per_day, cap: T.penalty_cap_pct }), t('doc.s6p3')] },
    { title: t('doc.s7'), items: [t('doc.s7p1'), t('doc.s7p2')] },
    { title: t('doc.s8'), items: [t('doc.s8p1'), t('doc.s8p2')] },
    { title: t('doc.s9'), items: [t('doc.s9p1'), t('doc.s9p2'), ...(extras.length ? [`${t('doc.s9Extra')} ${extras.join(' ')}`] : [])] },
  ]

  return (
    <motion.article id="contract-paper" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative mx-auto max-w-[840px] overflow-hidden rounded-[6px] border border-[#e4e1da] bg-[#fffefb] px-5 py-8 text-[13px] leading-[1.6] text-[#1b1b1b] shadow-[0_1px_2px_rgba(0,0,0,.06),0_18px_50px_-18px_rgba(17,19,23,.28)] sm:px-12 sm:py-12 sm:text-[14px]"
      style={{ fontFamily: "Georgia, 'Times New Roman', 'PT Serif', serif" }}>
      {/* watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
        <span className="rotate-[-32deg] text-[64px] font-bold tracking-[0.12em] whitespace-nowrap text-[#c8102e]/[0.06] select-none sm:text-[110px]">{t('doc.watermark')}</span>
      </div>

      <div className="relative">
        <header className="text-center">
          <h1 className="text-[17px] font-bold tracking-[0.06em] sm:text-[20px]">{t('doc.title')} {t('doc.no')} {c.number}</h1>
          <div className="mt-4 flex justify-between text-[13px]">
            <span>{t('doc.cityLine', { city: T.city })}</span>
            <span>{dmy(T.date)}</span>
          </div>
        </header>

        <p className="mt-6 indent-8 text-justify">
          {t('doc.preamble', { buyer: T.buyer.name, buyerTitle: (T.buyer.signer_title || t('doc.director')).toLowerCase(), buyerDirector: T.buyer.director,
            seller: T.seller.name, sellerDirector: T.seller.director })}
        </p>

        {sections.map((s, i) => (
          <section key={s.title} className="mt-5 break-inside-avoid">
            <h2 className="text-center text-[13.5px] font-bold tracking-[0.04em]">{i + 1}. {s.title}</h2>
            {s.items.map((p, j) => <p key={j} className="mt-1.5 text-justify"><span className="font-semibold">{i + 1}.{j + 1}.</span> {p}</p>)}
          </section>
        ))}

        {/* Annex 1: specification */}
        <section className="mt-10 break-before-page">
          <div className="text-right text-[12.5px] leading-snug">
            <div className="font-semibold">{t('doc.annex')}</div>
            <div>{t('doc.annexTo', { number: c.number, date: dmy(T.date) })}</div>
          </div>
          <h2 className="mt-4 text-center text-[14px] font-bold tracking-[0.08em]">{t('doc.spec')}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#f4f2ec]">
                  {['colNo', 'colName', 'colQty', 'colUnit', 'colQuality', 'colPrice', 'colSum'].map((k) => (
                    <th key={k} className="border border-[#bdb8ad] px-2 py-1.5 text-center font-semibold">{t(`doc.${k}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-center">1</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5">{product}{T.item.description ? <div className="text-[11.5px] text-[#555]">{T.item.description}</div> : null}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right tabular-nums">{formatNumber(T.item.quantity, Number.isInteger(T.item.quantity) ? 0 : 2)}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-center">{unit}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-center">{quality}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right tabular-nums">{money(T.item.unit_price)}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right tabular-nums">{money(T.item.goods_amount)}</td>
                </tr>
                <tr>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-center">2</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5" colSpan={5}>{t('doc.deliveryRow')}{!deliveryPaid && <span className="text-[#555]"> — {t('doc.included')}</span>}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right tabular-nums">{money(deliveryPaid ? T.delivery.price : 0)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right" colSpan={6}>{t('doc.totalRow')}</td>
                  <td className="border border-[#bdb8ad] px-2 py-1.5 text-right tabular-nums">{money(T.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-[#555]">{T.vat_note && lang === 'uz' ? T.vat_note : null}</p>
        </section>

        {/* Requisites and signatures */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-center text-[13.5px] font-bold tracking-[0.04em]">10. {t('doc.requisites')}</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <PartyBlock role={t('doc.buyerRole')} p={T.buyer} title={c.buyer_signer_title}
              sig={{ signer: c.buyer_signer, at: c.buyer_signed_at, cert: c.buyer_cert, hash: c.buyer_signature }} />
            <PartyBlock role={t('doc.sellerRole')} p={T.seller} title={c.seller_signer_title || t('doc.director')}
              sig={c.seller_signature ? { signer: c.seller_signer || '', at: c.seller_signed_at, cert: c.seller_cert || '', hash: c.seller_signature } : null}
              closed={c.status === 'declined' || c.status === 'cancelled'} statusText={c.status !== 'awaiting_seller' && !c.seller_signature ? t(`status.${c.status}`) : undefined} />
          </div>
        </section>

        <Verification c={c} />

        <footer className="mt-8 border-t border-[#d9d5cc] pt-3 text-center text-[11px] leading-snug text-[#6b6b6b]">
          {t('doc.demoNote')}
        </footer>
      </div>
    </motion.article>
  )
}

function PartyBlock({ role, p, title, sig, closed, statusText }: {
  role: string; p: Party; title: string; sig: { signer: string; at: string | null; cert: string; hash: string } | null; closed?: boolean; statusText?: string
}) {
  const { t } = useTranslation('contract')
  const rows: [string, string | null][] = [
    [t('doc.address'), p.address], [t('doc.stir'), p.stir], [t('doc.oked'), p.oked], [t('doc.bank'), p.bank],
    [t('doc.mfo'), p.mfo], [t('doc.account'), p.account], [t('doc.phone'), p.phone],
  ]
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-bold tracking-[0.06em] uppercase">{role}</div>
      <div className="mt-1 font-semibold">{p.name}</div>
      <dl className="mt-2 space-y-0.5 text-[12.5px]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex gap-2"><dt className="shrink-0 text-[#555]">{k}:</dt><dd className="min-w-0 break-words tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-3 text-[12.5px]">{title}: <span className="font-semibold">{sig?.signer || p.director}</span></div>
      {sig ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
          className="mt-2 rounded-md border-2 border-[#1d5fd1] bg-[#f3f7ff] p-2.5 font-sans text-[11.5px] leading-snug text-[#173f8a]">
          <div className="flex items-center gap-1.5 font-bold"><ShieldCheck className="size-3.5 shrink-0" />{t('doc.stamp')}</div>
          <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2">
            <span className="opacity-70">{t('doc.signer')}</span><span className="truncate font-semibold">{sig.signer}, {title}</span>
            <span className="opacity-70">{t('doc.signedAt')}</span><span className="font-mono">{dmyhm(sig.at)}</span>
            <span className="opacity-70">{t('doc.cert')}</span><span className="font-mono">{sig.cert}</span>
            <span className="opacity-70">{t('doc.hash')}</span><span className="font-mono">{sig.hash.slice(0, 16)}…</span>
          </div>
        </motion.div>
      ) : (
        <div className={cn('mt-2 grid h-[92px] place-items-center rounded-md border-2 border-dashed font-sans text-[12px]',
          closed ? 'border-[#e3b7b2] text-[#a8392f]' : 'border-[#c9c4b8] text-[#7a7466]')}>
          <span className="flex items-center gap-1.5">{closed ? <Ban className="size-3.5" /> : <Clock className="size-3.5" />}{statusText || t('doc.awaiting')}</span>
        </div>
      )}
    </div>
  )
}

function Verification({ c }: { c: Contract }) {
  const { t } = useTranslation('contract')
  const v = c.verification
  if (!v) return null
  const bad = !v.buyer_valid || v.seller_valid === false
  const text = bad ? t('doc.verifyBad') : v.seller_valid ? t('doc.verifyOk') : t('doc.verifyPartial')
  return (
    <section className="mt-8 flex break-inside-avoid items-center gap-4 rounded-md border border-[#d9d5cc] bg-white/70 p-3 font-sans">
      <HashMark hash={v.document_hash} />
      <div className="min-w-0 text-[12px] leading-snug">
        <div className="font-semibold text-[#1b1b1b]">{t('doc.verifyTitle')}</div>
        <div className={cn('mt-1 flex items-start gap-1.5 font-medium', bad ? 'text-danger' : v.seller_valid ? 'text-good' : 'text-[#9a6b00]')}>
          {bad ? <ShieldAlert className="mt-px size-3.5 shrink-0" /> : <ShieldCheck className="mt-px size-3.5 shrink-0" />}{text}
        </div>
        <div className="mt-1.5 text-[#6b6b6b]">{t('doc.docHash')}</div>
        <div className="font-mono text-[10.5px] break-all text-[#333]">{v.document_hash}</div>
      </div>
    </section>
  )
}

export type { ContractTerms, Lang }
