import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, Lightbulb, Loader2, Sparkles, Trash2, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { Offer, OfferInput, Quality } from '@/api/types'
import { ProductPicker } from '@/components/buyer/ProductPicker'
import { OfferCard } from '@/components/market/OfferCard'
import { Money } from '@/components/market'
import { Eyebrow, Panel, RangeBar } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { Switch } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { useCategories, useMarkets, useProducts, useRegions } from '@/hooks/useCatalog'
import { currencyLabel, formatNumber, formatPct, ln, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const QUALITIES: Quality[] = ['premium', 'first', 'standard', 'economy']
const UNITS = ['kg', 't', 'sack', 'l', 'piece', 'm']
const MAX_IMG = 4 * 1024 * 1024
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProductForm() {
  const { offerId } = useParams()
  const { t } = useTranslation(['seller', 'common'])
  const editing = !!offerId
  const offerQ = useQuery({ queryKey: ['offer', offerId], queryFn: () => Api.offer(offerId!), enabled: editing })

  const header = (
    <PageHeader eyebrow={t(editing ? 'form.eyebrowEdit' : 'form.eyebrowNew')} title={t(editing ? 'form.titleEdit' : 'form.titleNew')}
      description={t('form.subtitle')}
      actions={<Button variant="outline" asChild><Link to="/app/seller/products"><ArrowLeft /> {t('form.backToList')}</Link></Button>} />
  )
  if (editing && offerQ.isLoading) return (
    <div>{header}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
  if (editing && (offerQ.isError || !offerQ.data)) return <div>{header}<ErrorState onRetry={() => offerQ.refetch()} /></div>
  return <div>{header}<OfferForm initial={offerQ.data?.offer} key={offerQ.data?.offer.id ?? 'new'} /></div>
}

function useSchema() {
  const { t } = useTranslation('seller')
  return React.useMemo(() => {
    const num = () => z.number({ error: t('form.errors.number') })
    return z.object({
      category: z.string({ error: t('form.errors.required') }).min(1, t('form.errors.required')),
      product_id: z.string({ error: t('form.errors.required') }).min(1, t('form.errors.required')),
      title: z.string().trim().min(2, t('form.errors.min2')).max(160, t('form.errors.max', { n: 160 })),
      description: z.string().max(2000, t('form.errors.max', { n: 2000 })),
      image_url: z.string().nullable(),
      unit: z.string({ error: t('form.errors.required') }).min(1, t('form.errors.required')),
      unit_price: num().positive(t('form.errors.positive')).max(1e9, t('form.errors.tooLarge')),
      available_qty: num().min(0, t('form.errors.nonNegative')).max(1e8, t('form.errors.tooLarge')),
      min_order_qty: num().positive(t('form.errors.positive')).max(1e8, t('form.errors.tooLarge')),
      quality: z.enum(['premium', 'first', 'standard', 'economy']),
      delivery_available: z.boolean(),
      delivery_price: num().min(0, t('form.errors.nonNegative')).max(1e8, t('form.errors.tooLarge')),
      delivery_days: num().int(t('form.errors.integer')).min(0, t('form.errors.nonNegative')).max(60, t('form.errors.maxDays')),
      region_id: z.string({ error: t('form.errors.required') }).min(1, t('form.errors.required')),
      market_id: z.string().catch(''),
      location_note: z.string().max(160, t('form.errors.max', { n: 160 })),
      valid_until: z.string(),
    }).superRefine((v, ctx) => {
      if (Number.isFinite(v.min_order_qty) && Number.isFinite(v.available_qty) && v.available_qty > 0 && v.min_order_qty > v.available_qty)
        ctx.addIssue({ code: 'custom', path: ['min_order_qty'], message: t('form.errors.moqGtStock') })
      if (v.valid_until && v.valid_until < new Date().toISOString().slice(0, 10))
        ctx.addIssue({ code: 'custom', path: ['valid_until'], message: t('form.errors.pastDate') })
    })
  }, [t])
}
type FormV = z.infer<ReturnType<typeof useSchema>>

function OfferForm({ initial }: { initial?: Offer }) {
  const { t } = useTranslation(['seller', 'common'])
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const editing = !!initial
  const schema = useSchema()
  const cats = useCategories()
  const products = useProducts()
  const regions = useRegions()
  const markets = useMarkets()
  const biz = useQuery({ queryKey: ['my-business'], queryFn: Api.myBusiness })

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isDirty } } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      category: initial.category_slug, product_id: initial.product_id, title: initial.title, description: initial.description ?? '',
      image_url: initial.image_url, unit: initial.unit, unit_price: initial.unit_price, available_qty: initial.available_qty ?? NaN,
      min_order_qty: initial.min_order_qty, quality: initial.quality, delivery_available: initial.delivery_available,
      delivery_price: initial.delivery_price, delivery_days: initial.delivery_days, region_id: initial.region_id,
      market_id: initial.market_id ?? '', location_note: initial.location_note ?? '', valid_until: initial.valid_until?.slice(0, 10) ?? '',
    } : {
      category: '', product_id: '', title: '', description: '', image_url: null, unit: 'kg', unit_price: NaN, available_qty: NaN,
      min_order_qty: NaN, quality: 'standard', delivery_available: false, delivery_price: 0, delivery_days: 1,
      region_id: user?.region_id ?? '', market_id: '', location_note: '', valid_until: '',
    },
  })

  // Pre-fill region / market from the business profile for new offers.
  React.useEffect(() => {
    if (editing || !biz.data) return
    if (!getValues('region_id') && biz.data.region_id) setValue('region_id', biz.data.region_id)
    if (!getValues('market_id') && biz.data.market_id && getValues('region_id') === biz.data.region_id) setValue('market_id', biz.data.market_id)
  }, [biz.data, editing, getValues, setValue])

  const v = watch()
  const cat = cats.data?.find((c) => c.slug === v.category)
  const product = products.data?.find((p) => p.id === v.product_id)
  const regionMarkets = (markets.data ?? []).filter((m) => m.region_id === v.region_id)
  const suggestion = product ? `${ln(product, 'name')} — ${t(`common:quality.${v.quality}`)}` : ''

  // Auto-suggest the title while the user hasn't written their own.
  const lastSuggestion = React.useRef('')
  React.useEffect(() => {
    if (!suggestion) return
    const cur = getValues('title')
    if (!cur || cur === lastSuggestion.current) setValue('title', suggestion, { shouldValidate: !!cur })
    lastSuggestion.current = suggestion
  }, [suggestion, getValues, setValue])

  const stats = useQuery({ queryKey: ['product-stats', v.product_id], queryFn: () => Api.productStats(v.product_id), enabled: !!v.product_id })

  const save = useMutation({
    mutationFn: async (f: FormV) => {
      const common = {
        title: f.title.trim(), description: f.description.trim() || null, image_url: f.image_url,
        unit_price: f.unit_price, available_qty: f.available_qty, min_order_qty: f.min_order_qty, quality: f.quality,
        delivery_available: f.delivery_available, delivery_price: f.delivery_available ? f.delivery_price : 0,
        delivery_days: f.delivery_available ? f.delivery_days : 0,
        market_id: f.market_id || null, location_note: f.location_note.trim() || null,
        valid_until: f.valid_until ? `${f.valid_until}T23:59:59Z` : null,
      }
      if (initial) return Api.updateOffer(initial.id, common)
      const body: OfferInput = { ...common, product_id: f.product_id, unit: f.unit, region_id: f.region_id }
      return Api.createOffer(body)
    },
    onSuccess: () => {
      toast.success(t(editing ? 'form.updated' : 'form.created'))
      qc.invalidateQueries({ queryKey: ['my-offers'] })
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] })
      if (initial) qc.invalidateQueries({ queryKey: ['offer', initial.id] })
      navigate('/app/seller/products')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const region = regions.data?.find((r) => r.id === v.region_id)
  const market = markets.data?.find((m) => m.id === v.market_id)
  const preview: Offer = {
    id: initial?.id ?? 'preview', title: v.title || suggestion || t('form.previewTitle'), description: v.description || null,
    image_url: v.image_url, unit: v.unit, unit_price: Number.isFinite(v.unit_price) ? v.unit_price : 0,
    available_qty: Number.isFinite(v.available_qty) ? v.available_qty : 0, min_order_qty: Number.isFinite(v.min_order_qty) ? v.min_order_qty : 0,
    quality: v.quality, delivery_available: v.delivery_available, delivery_price: Number.isFinite(v.delivery_price) ? v.delivery_price : 0,
    delivery_days: Number.isFinite(v.delivery_days) ? v.delivery_days : 0, location_note: v.location_note || null,
    valid_until: v.valid_until || null, status: 'active', source: 'seller', is_demo: initial?.is_demo ?? false, views_count: initial?.views_count ?? 0,
    created_at: initial?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString(), product_id: v.product_id,
    region_id: v.region_id, market_id: v.market_id || null,
    business: {
      id: biz.data?.id ?? '', name: biz.data?.name ?? user?.business?.name ?? '—', rating: biz.data?.rating ?? 0,
      verification_status: biz.data?.verification_status ?? 'unverified', completed_deals: biz.data?.completed_deals ?? 0, phone: biz.data?.phone ?? null,
    },
    product_name_uz: product?.name_uz ?? t('form.previewTitle'), product_name_ru: product?.name_ru ?? t('form.previewTitle'),
    product_name_en: product?.name_en ?? t('form.previewTitle'), category_slug: v.category || 'other', product_emoji: product?.emoji ?? '',
    region_name: region ? ln(region, 'name') : '—', market_name: market?.name ?? null, is_favorite: false,
  }

  const num = (name: 'unit_price' | 'available_qty' | 'min_order_qty' | 'delivery_price' | 'delivery_days') => register(name, { valueAsNumber: true })

  return (
    <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Panel i={0} title={t('form.sections.product')} description={editing ? t('form.lockedHint') : t('form.sections.productHint')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('common:fields.category')} error={errors.category?.message} htmlFor="pf-cat">
              {editing ? <Locked id="pf-cat" value={cat ? ln(cat, 'name') : v.category} /> : <Select id="pf-cat" aria-invalid={!!errors.category} {...register('category', {
                onChange: () => setValue('product_id', ''),
              })}>
                <option value="">{t('form.choose')}</option>
                {cats.data?.map((c) => <option key={c.id} value={c.slug}>{ln(c, 'name')}</option>)}
              </Select>}
            </Field>
            <Field label={t('common:fields.product')} error={errors.product_id?.message} htmlFor="pf-prod">
              {editing ? <Locked id="pf-prod" value={product ? ln(product, 'name') : ln(initial, 'product_name')} /> : (
                <ProductPicker id="pf-prod" value={v.product_id} categoryId={cat?.id} invalid={!!errors.product_id}
                  placeholder={t('form.choose')}
                  onChange={(p) => {
                    setValue('product_id', p.id, { shouldValidate: true, shouldDirty: true })
                    const pc = cats.data?.find((c) => c.id === p.category_id)
                    if (pc && pc.slug !== v.category) setValue('category', pc.slug, { shouldValidate: true, shouldDirty: true })
                    setValue('unit', p.unit)
                  }} />
              )}
            </Field>
            <Field className="sm:col-span-2" label={t('form.fields.title')} error={errors.title?.message} htmlFor="pf-title">
              <div className="flex gap-2">
                <div className="flex-1"><Input id="pf-title" aria-invalid={!!errors.title} placeholder={suggestion || t('form.titlePlaceholder')} {...register('title')} /></div>
                <Button type="button" variant="outline" disabled={!suggestion} onClick={() => setValue('title', suggestion, { shouldValidate: true, shouldDirty: true })}
                  title={t('form.suggestTitle')}><Sparkles /> <span className="hidden sm:inline">{t('form.suggestTitle')}</span></Button>
              </div>
            </Field>
            <Field label={t('common:fields.quality')} htmlFor="pf-q">
              <Select id="pf-q" {...register('quality')}>
                {QUALITIES.map((q) => <option key={q} value={q}>{t(`common:quality.${q}`)}</option>)}
              </Select>
            </Field>
            <Field label={t('form.fields.unit')} error={errors.unit?.message} htmlFor="pf-unit" hint={product ? t('form.unitHint', { unit: t(`common:unitsLong.${product.unit}`, product.unit) }) : undefined}>
              {editing ? <Locked id="pf-unit" value={t(`common:unitsLong.${v.unit}`, v.unit)} /> : <Select id="pf-unit" {...register('unit')}>
                {UNITS.map((u) => <option key={u} value={u}>{t(`common:unitsLong.${u}`)}</option>)}
              </Select>}
            </Field>
            <Field className="sm:col-span-2" label={t('form.fields.description')} error={errors.description?.message} htmlFor="pf-desc" hint={t('form.descriptionHint')}>
              <Textarea id="pf-desc" rows={3} {...register('description')} />
            </Field>
          </div>
        </Panel>

        <Panel i={1} title={t('form.sections.price')} description={t('form.sections.priceHint')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('common:fields.unitPrice')} error={errors.unit_price?.message} htmlFor="pf-price">
              <Input id="pf-price" type="number" inputMode="decimal" step="any" min={0} className="font-mono" suffix={currencyLabel()} aria-invalid={!!errors.unit_price} {...num('unit_price')} />
            </Field>
            <Field label={t('form.fields.available')} error={errors.available_qty?.message} htmlFor="pf-qty">
              <Input id="pf-qty" type="number" inputMode="decimal" step="any" min={0} className="font-mono" suffix={t(`common:units.${v.unit}`, v.unit)} aria-invalid={!!errors.available_qty} {...num('available_qty')} />
            </Field>
            <Field label={t('form.fields.moq')} error={errors.min_order_qty?.message} htmlFor="pf-moq" hint={t('form.moqHint')}>
              <Input id="pf-moq" type="number" inputMode="decimal" step="any" min={0} className="font-mono" suffix={t(`common:units.${v.unit}`, v.unit)} aria-invalid={!!errors.min_order_qty} {...num('min_order_qty')} />
            </Field>
          </div>
          {editing && <p className="mt-3 text-xs text-muted">{t('products.historyNote')}</p>}
        </Panel>

        <Panel i={2} title={t('form.sections.delivery')}>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-paper/60 px-4 py-3">
              <span>
                <span className="block text-sm font-medium">{t('form.fields.deliveryAvailable')}</span>
                <span className="block text-xs text-muted">{t('form.deliveryHint')}</span>
              </span>
              <Switch checked={v.delivery_available} onCheckedChange={(c) => setValue('delivery_available', c, { shouldDirty: true })} aria-label={t('form.fields.deliveryAvailable')} />
            </label>
            <AnimatePresence initial={false}>
              {v.delivery_available && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid gap-4 pb-1 sm:grid-cols-2">
                    <Field label={t('form.fields.deliveryPrice')} error={errors.delivery_price?.message} htmlFor="pf-dp" hint={t('form.deliveryPriceHint')}>
                      <Input id="pf-dp" type="number" inputMode="decimal" step="any" min={0} className="font-mono" suffix={currencyLabel()} {...num('delivery_price')} />
                    </Field>
                    <Field label={t('form.fields.deliveryDays')} error={errors.delivery_days?.message} htmlFor="pf-dd">
                      <Input id="pf-dd" type="number" inputMode="numeric" step={1} min={0} max={60} className="font-mono" suffix={t('common:fields.days')} {...num('delivery_days')} />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('common:fields.region')} error={errors.region_id?.message} htmlFor="pf-region">
                {editing ? <Locked id="pf-region" value={region ? ln(region, 'name') : ''} /> : <Select id="pf-region" aria-invalid={!!errors.region_id} {...register('region_id', { onChange: () => setValue('market_id', '') })}>
                  <option value="">{t('form.choose')}</option>
                  {regions.data?.map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
                </Select>}
              </Field>
              <Field label={t('common:fields.market')} htmlFor="pf-market" hint={v.region_id && regionMarkets.length === 0 ? t('form.noMarkets') : undefined}>
                <Select id="pf-market" disabled={!v.region_id || regionMarkets.length === 0} {...register('market_id')}>
                  <option value="">{t('form.noMarket')}</option>
                  {regionMarkets.map((m) => <option key={m.id} value={m.id}>{uz(m.name)}</option>)}
                </Select>
              </Field>
              <Field label={t('form.fields.locationNote')} error={errors.location_note?.message} htmlFor="pf-loc">
                <Input id="pf-loc" placeholder={t('form.locationPlaceholder')} {...register('location_note')} />
              </Field>
              <Field label={t('form.fields.validUntil')} error={errors.valid_until?.message} htmlFor="pf-valid" hint={t('form.validHint')}>
                <Input id="pf-valid" type="date" min={new Date().toISOString().slice(0, 10)} aria-invalid={!!errors.valid_until} {...register('valid_until')} />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel i={3} title={t('form.sections.photo')} description={t('form.photoHint')}>
          <ImageField value={v.image_url} onChange={(url) => setValue('image_url', url, { shouldDirty: true })} />
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-t border-line bg-paper/95 px-1 py-3 backdrop-blur sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild><Link to="/app/seller/products">{t('common:actions.cancel')}</Link></Button>
          <Button type="submit" loading={save.isPending} disabled={editing && !isDirty}>{editing ? t('common:actions.save') : t('form.publish')}</Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div>
          <Eyebrow className="mb-2">{t('form.preview')}</Eyebrow>
          <div className="pointer-events-none select-none" aria-hidden><OfferCard offer={preview} to="#" /></div>
        </div>
        <MarketHint productId={v.product_id} price={v.unit_price} unit={v.unit} stats={stats}
          onUseAvg={(p) => setValue('unit_price', Math.round(p), { shouldDirty: true, shouldValidate: true })} />
      </aside>
    </form>
  )
}

/** Read-only stand-in for fields the API does not allow to change after publishing. */
function Locked({ id, value }: { id: string; value: string }) {
  return <Input id={id} value={value} readOnly disabled className="cursor-not-allowed" />
}

function MarketHint({ productId, price, unit, stats, onUseAvg }: {
  productId: string; price: number; unit: string
  stats: { data?: Awaited<ReturnType<typeof Api.productStats>>; isLoading: boolean; isError: boolean; refetch: () => unknown }
  onUseAvg: (p: number) => void
}) {
  const { t } = useTranslation(['seller', 'common'])
  if (!productId) return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white/60 p-4 text-[13px] text-muted">
      <Lightbulb className="mb-2 size-4 text-saffron" />{t('form.hintEmpty')}
    </div>
  )
  if (stats.isLoading) return <Skeleton className="h-44 rounded-2xl" />
  if (stats.isError || !stats.data) return <ErrorState onRetry={() => stats.refetch()} className="py-6" />
  const s = stats.data
  const has = s.count > 0 && s.avg != null
  const valid = Number.isFinite(price) && price > 0
  const diff = has && valid ? ((price - s.avg!) / s.avg!) * 100 : null
  const verdict = diff == null ? null : diff <= -15 ? 'low' : diff < -2 ? 'below' : diff <= 2 ? 'at' : diff <= 15 ? 'above' : 'high'
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>{t('form.hintTitle')}</Eyebrow>
        <span className="text-xs text-muted">{t('form.hintCount', { count: s.count })}</span>
      </div>
      {!has ? <p className="text-[13px] text-muted">{t('form.hintNoData')}</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([['min', s.min], ['avg', s.avg], ['max', s.max]] as const).map(([k, val]) => (
              <div key={k} className={cn('rounded-lg px-2 py-2', k === 'avg' ? 'bg-mint-50' : 'bg-paper')}>
                <div className="text-[10.5px] tracking-wide text-muted uppercase">{t(`range.${k}`)}</div>
                <div className="font-mono text-[13px] font-semibold tabular">{formatNumber(val)}</div>
              </div>
            ))}
          </div>
          {valid && <RangeBar className="mt-3" min={s.min} max={s.max} avg={s.avg} value={price} showLabels={false} />}
          <AnimatePresence mode="wait">
            {verdict && (
              <motion.p key={verdict} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={cn('mt-3 rounded-lg px-3 py-2 text-[13px] leading-snug',
                  verdict === 'high' || verdict === 'low' ? 'bg-saffron-50 text-[#8a4a00]' : 'bg-good-50 text-good')}>
                {t(`form.verdict.${verdict}`, { pct: formatPct(diff) })}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
            <span>{t('form.hintMedian')}: <Money value={s.median} unit={unit} className="font-mono text-ink-soft" /></span>
            <Button type="button" variant="link" size="sm" className="text-xs" onClick={() => onUseAvg(s.avg!)}>{t('form.useAvg')}</Button>
          </div>
        </>
      )}
    </div>
  )
}

function ImageField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useTranslation(['seller', 'common'])
  const input = React.useRef<HTMLInputElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [drag, setDrag] = React.useState(false)
  const up = useMutation({
    mutationFn: (f: File) => Api.uploadImage(f),
    onSuccess: (r) => { onChange(r.url); toast.success(t('form.imageUploaded')) },
    onError: (e) => { const m = errorMessage(e); setError(m); toast.error(m) },
  })
  const pick = (f: File | undefined) => {
    if (!f) return
    setError(null)
    if (!IMG_TYPES.includes(f.type)) return setError(t('form.errors.imageType'))
    if (f.size > MAX_IMG) return setError(t('form.errors.imageSize'))
    up.mutate(f)
  }
  return (
    <div>
      <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {value ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img src={value} alt="" className="h-36 w-full rounded-xl border border-line object-cover sm:w-52" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} loading={up.isPending}><Upload /> {t('form.replaceImage')}</Button>
            <Button type="button" variant="danger-outline" size="sm" onClick={() => onChange(null)}><Trash2 /> {t('form.removeImage')}</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={up.isPending}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
          className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
            drag ? 'border-brand bg-mint-50' : 'border-line-strong bg-paper/50 hover:border-brand hover:bg-mint-50/60')}>
          {up.isPending ? <Loader2 className="size-6 animate-spin text-brand" /> : <ImagePlus className="size-6 text-brand" />}
          <span className="text-sm font-medium">{up.isPending ? t('form.uploading') : t('form.dropImage')}</span>
          <span className="text-xs text-muted">{t('form.imageRules')}</span>
        </button>
      )}
      {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}
