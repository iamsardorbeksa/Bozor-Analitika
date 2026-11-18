import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Info, Megaphone, Send, Users } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import { PAYMENT_TERMS, TendersApi, type PaymentTerms } from '@/api/tenders'
import type { Quality } from '@/api/types'
import { ProductSymbol, catStyle } from '@/components/market'
import { dateInput, endOfDay } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { useCategories, useProducts, useRegions } from '@/hooks/useCatalog'
import { currencyLabel, formatNumber, formatUZS, ln } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const UNITS = ['piece', 'kg', 'l', 'sack', 'm', 't']
const QUALITIES: Quality[] = ['premium', 'first', 'standard', 'economy']

export default function TenderForm() {
  const { t } = useTranslation(['tenders', 'common'])
  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const cats = useCategories()
  const regions = useRegions()

  const [category, setCategory] = React.useState(params.get('category') ?? '')
  const [productId, setProductId] = React.useState(params.get('product') ?? '')
  const products = useProducts(category || undefined)
  const product = products.data?.find((p) => p.id === productId)
  const [title, setTitle] = React.useState('')
  const [titleTouched, setTitleTouched] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [quantity, setQuantity] = React.useState(params.get('qty') ?? '')
  const [unit, setUnit] = React.useState('piece')
  const [target, setTarget] = React.useState('')
  const [quality, setQuality] = React.useState<Quality | ''>('')
  const [payment, setPayment] = React.useState<PaymentTerms | ''>('on_delivery')
  const [delivery, setDelivery] = React.useState(true)
  const [regionId, setRegionId] = React.useState(user?.region_id ?? '')
  const [address, setAddress] = React.useState('')
  const [closes, setCloses] = React.useState(dateInput(5))
  const [needed, setNeeded] = React.useState(dateInput(14))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // the product decides the category (when it came from a link) and the unit
  React.useEffect(() => {
    if (!product) return
    setUnit(product.unit)
    if (!category) setCategory(cats.data?.find((c) => c.id === product.category_id)?.slug ?? '')
  }, [product, category, cats.data])
  React.useEffect(() => { if (!regionId && regions.data?.length) setRegionId(user?.region_id ?? regions.data[0].id) }, [regions.data, regionId, user])
  // a helpful default title: "1 000 dona Sharikli ruchka"
  React.useEffect(() => {
    if (titleTouched || !product) return
    const q = Number(quantity)
    setTitle(`${q > 0 ? `${formatNumber(q)} ${t(`common:units.${product.unit}`, product.unit)} ` : ''}${ln(product, 'name')}`)
  }, [product, quantity, titleTouched, t])

  const stats = useQuery({ queryKey: ['product-stats', productId], queryFn: () => Api.productStats(productId), enabled: !!productId, staleTime: 60_000 })
  const market = stats.data?.median ?? null

  const mut = useMutation({
    mutationFn: () => TendersApi.create({
      category, product_id: productId || null, title: title.trim(), description: description.trim() || null,
      quantity: Number(quantity), unit, target_price: target ? Number(target) : null, quality: quality || null,
      payment_terms: payment || null, delivery_required: delivery, delivery_region_id: regionId,
      delivery_address: address.trim() || null, needed_by: endOfDay(needed), closes_at: endOfDay(closes),
    }),
    onSuccess: (x) => {
      toast.success(t('form.posted'), { description: t('form.postedHint') })
      void qc.invalidateQueries({ queryKey: ['tenders'] })
      nav(`/app/tenders/${x.id}`)
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!category) er.category = t('form.err.category')
    if (title.trim().length < 3) er.title = t('form.err.title')
    if (!(Number(quantity) > 0)) er.quantity = t('form.err.quantity')
    if (target && !(Number(target) > 0)) er.target = t('form.err.positive')
    if (!regionId) er.region = t('form.err.region')
    if (new Date(endOfDay(closes)).getTime() < Date.now() + 3_600_000) er.closes = t('form.err.closesFuture')
    if (needed < closes) er.needed = t('form.err.neededAfter')
    setErrors(er)
    if (Object.keys(er).length === 0) mut.mutate()
  }

  const qty = Number(quantity) || 0
  const budgetTotal = target ? qty * Number(target) : market ? qty * market : null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t('form.eyebrow')} title={t('form.title')} description={t('form.description')}
        actions={<Button asChild variant="ghost"><Link to="/app/tenders"><ArrowLeft />{t('nav.myTenders')}</Link></Button>} />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="space-y-5">
          {/* 1. what */}
          <Card className="p-5">
            <Step n={1} title={t('form.what')} />
            <Field label={t('form.category')} error={errors.category}>
              <div className="flex flex-wrap gap-2">
                {(cats.data ?? []).map((c) => {
                  const s = catStyle(c.slug)
                  const on = c.slug === category
                  return (
                    <button type="button" key={c.slug} onClick={() => { setCategory(c.slug); setProductId('') }}
                      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                        on ? 'border-transparent text-white' : 'border-line bg-white hover:border-line-strong')}
                      style={on ? { background: s.fg } : undefined} aria-pressed={on}>
                      <s.icon className="size-3.5" />{ln(c, 'name')}
                    </button>
                  )
                })}
              </div>
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('form.product')} hint={t('form.productHint')} htmlFor="tf-product">
                <Select id="tf-product" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!category}>
                  <option value="">{t('form.productOther')}</option>
                  {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.emoji} {ln(p, 'name')}</option>)}
                </Select>
              </Field>
              <Field label={t('form.titleLabel')} error={errors.title} htmlFor="tf-title">
                <Input id="tf-title" value={title} maxLength={160} placeholder={t('form.titlePh')} aria-invalid={!!errors.title}
                  onChange={(e) => { setTitle(e.target.value); setTitleTouched(true) }} />
              </Field>
            </div>
            <Field label={t('form.details')} hint={t('form.detailsHint')} className="mt-4" htmlFor="tf-desc">
              <Textarea id="tf-desc" value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} placeholder={t('form.detailsPh')} />
            </Field>
          </Card>

          {/* 2. how much */}
          <Card className="p-5">
            <Step n={2} title={t('form.howMuch')} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('form.quantity')} error={errors.quantity} htmlFor="tf-qty">
                <Input id="tf-qty" type="number" inputMode="decimal" min={0} step="any" className="font-mono" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)} aria-invalid={!!errors.quantity} />
              </Field>
              <Field label={t('form.unit')} htmlFor="tf-unit">
                <Select id="tf-unit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!!product}>
                  {UNITS.map((u) => <option key={u} value={u}>{t(`common:units.${u}`, u)}</option>)}
                </Select>
              </Field>
              <Field label={t('form.target')} error={errors.target} htmlFor="tf-target"
                hint={market ? t('form.marketHint', { price: formatUZS(market) }) : t('form.targetHint')}>
                <Input id="tf-target" type="number" inputMode="decimal" min={0} step="any" className="font-mono" value={target}
                  suffix={`${currencyLabel()}/${t(`common:units.${unit}`, unit)}`} onChange={(e) => setTarget(e.target.value)} placeholder={t('form.optional')} />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('form.quality')} htmlFor="tf-quality">
                <Select id="tf-quality" value={quality} onChange={(e) => setQuality(e.target.value as Quality | '')}>
                  <option value="">{t('form.any')}</option>
                  {QUALITIES.map((q) => <option key={q} value={q}>{t(`common:quality.${q}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('form.payment')} hint={t('form.paymentHint')} htmlFor="tf-pay">
                <Select id="tf-pay" value={payment} onChange={(e) => setPayment(e.target.value as PaymentTerms | '')}>
                  <option value="">{t('form.any')}</option>
                  {PAYMENT_TERMS.map((p) => <option key={p} value={p}>{t(`payment.${p}`)}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          {/* 3. where & when */}
          <Card className="p-5">
            <Step n={3} title={t('form.whereWhen')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.region')} error={errors.region} htmlFor="tf-region">
                <Select id="tf-region" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                  {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
                </Select>
              </Field>
              <Field label={t('form.address')} htmlFor="tf-addr">
                <Input id="tf-addr" value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} placeholder={t('form.addressPh')} />
              </Field>
              <Field label={t('form.closesAt')} hint={t('form.closesHint')} error={errors.closes} htmlFor="tf-closes">
                <Input id="tf-closes" type="date" value={closes} min={dateInput(0)} onChange={(e) => setCloses(e.target.value)} aria-invalid={!!errors.closes} />
              </Field>
              <Field label={t('form.neededBy')} error={errors.needed} htmlFor="tf-needed">
                <Input id="tf-needed" type="date" value={needed} min={closes} onChange={(e) => setNeeded(e.target.value)} aria-invalid={!!errors.needed} />
              </Field>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
              {t('form.deliveryRequired')}
            </label>
          </Card>
        </div>

        {/* summary */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="overflow-hidden">
              <div className="bg-ink px-5 py-4 text-white">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-white/60 uppercase"><Megaphone className="size-3.5" />{t('form.preview')}</div>
                <div className="mt-2 flex items-start gap-2">
                  {product && <ProductSymbol emoji={product.emoji} size={22} />}
                  <div className="text-[17px] leading-snug font-bold">{title || t('form.titlePh')}</div>
                </div>
              </div>
              <div className="space-y-2.5 p-5 text-sm">
                <Row k={t('card.qty')} v={qty ? `${formatNumber(qty)} ${t(`common:units.${unit}`, unit)}` : '—'} />
                <Row k={target ? t('form.budgetTotal') : t('card.estValue')} v={budgetTotal ? `≈ ${formatUZS(budgetTotal)}` : '—'} />
                <Row k={t('form.closesAt')} v={closes} />
                <Row k={t('form.neededBy')} v={needed} />
                <Button type="submit" size="lg" className="mt-3 w-full" loading={mut.isPending}><Send />{t('form.submit')}</Button>
              </div>
            </Card>
          </motion.div>
          <Card className="p-4 text-[13px] leading-relaxed text-ink-soft">
            <div className="mb-2 flex items-center gap-2 font-semibold text-ink"><Users className="size-4 text-brand" />{t('form.howTitle')}</div>
            <ol className="list-decimal space-y-1 pl-4">
              <li>{t('form.how1')}</li><li>{t('form.how2')}</li><li>{t('form.how3')}</li><li>{t('form.how4')}</li>
            </ol>
            <p className="mt-3 flex gap-1.5 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{t('form.privacy')}</p>
          </Card>
        </aside>
      </form>
    </div>
  )
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[13px] font-bold text-white">{n}</span>
      <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>
}
