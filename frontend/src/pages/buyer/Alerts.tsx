import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellPlus, BellRing, CheckCircle2, Pencil, RefreshCw, Scale, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { AlertCondition, PriceAlert } from '@/api/types'
import { ProductPicker } from '@/components/buyer/ProductPicker'
import { ConfirmDialog, useProductCategory } from '@/components/buyer/shared'
import { Badge, Money, ProductGlyph, ProductSymbol } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { Dialog, DialogContent, Switch, Tooltip } from '@/components/ui/primitives'
import { useProducts, useRegions } from '@/hooks/useCatalog'
import { currencyLabel, formatNumber, formatUZS, ln, timeAgo } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const CONDITIONS: AlertCondition[] = ['below', 'above', 'change_pct', 'verified_listing']

export default function Alerts() {
  const { t } = useTranslation(['buyer', 'common'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: Api.alerts })
  const [editing, setEditing] = React.useState<PriceAlert | 'new' | null>(null)
  const [deleting, setDeleting] = React.useState<PriceAlert | null>(null)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['alerts'] })
    void qc.invalidateQueries({ queryKey: ['buyer-dashboard'] })
  }

  const toggle = useMutation({
    mutationFn: (a: PriceAlert) => Api.updateAlert(a.id, { is_active: !a.is_active }),
    onMutate: (a) => qc.setQueryData<PriceAlert[]>(['alerts'], (d) => d?.map((x) => (x.id === a.id ? { ...x, is_active: !a.is_active } : x))),
    onSuccess: (r) => toast.success(r.is_active ? t('buyer:alerts.enabledToast') : t('buyer:alerts.pausedToast')),
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
    onSettled: invalidate,
  })
  const del = useMutation({
    mutationFn: (a: PriceAlert) => Api.deleteAlert(a.id),
    onSuccess: () => { toast.success(t('common:toast.deleted')); setDeleting(null) },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
    onSettled: invalidate,
  })
  const check = useMutation({
    mutationFn: Api.checkAlerts,
    onSuccess: (r) => {
      if (r.triggered > 0) toast.success(t('buyer:alerts.checkTriggered', { count: r.triggered }), { action: { label: t('common:nav.notifications'), onClick: () => navigate('/app/notifications') } })
      else toast.info(t('buyer:alerts.checkNone'))
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      invalidate()
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const activeCount = alerts.data?.filter((a) => a.is_active).length ?? 0

  return (
    <div>
      <PageHeader title={t('common:nav.alerts')} description={t('buyer:alerts.description')}
        actions={<>
          <Button variant="outline" onClick={() => check.mutate()} loading={check.isPending} disabled={!alerts.data?.length}><RefreshCw />{t('buyer:alerts.checkNow')}</Button>
          <Button onClick={() => setEditing('new')}><BellPlus />{t('buyer:alerts.create')}</Button>
        </>} />

      {alerts.data && alerts.data.length > 0 && (
        <p className="mb-4 text-sm text-muted">{t('buyer:alerts.summary', { active: activeCount, total: alerts.data.length })}</p>
      )}

      {alerts.isLoading ? <SkeletonList rows={3} className="[&>div]:h-24" />
        : alerts.isError || !alerts.data ? <ErrorState onRetry={() => alerts.refetch()} />
          : alerts.data.length === 0 ? (
            <EmptyState icon={<BellRing />} title={t('buyer:alerts.emptyTitle')} description={t('buyer:alerts.emptyHint')}
              action={<Button onClick={() => setEditing('new')}><BellPlus />{t('buyer:alerts.create')}</Button>} />
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {alerts.data.map((a, i) => (
                  <AlertRow key={a.id} a={a} index={i} onToggle={() => toggle.mutate(a)} onEdit={() => setEditing(a)} onDelete={() => setDeleting(a)} />
                ))}
              </AnimatePresence>
            </div>
          )}

      <AlertDialog alert={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }} title={t('buyer:alerts.deleteTitle')}
        confirmLabel={t('common:actions.delete')} loading={del.isPending} onConfirm={() => deleting && del.mutate(deleting)} />
    </div>
  )
}

/** Plain-language description of an alert rule. */
function useSentence() {
  const { t } = useTranslation(['buyer', 'common'])
  const regions = useRegions()
  return (a: Pick<PriceAlert, 'condition' | 'threshold' | 'region_id'> & { product?: { name_uz: string; name_ru: string; name_en: string; unit: string } | null }) => {
    const product = a.product ? ln(a.product, 'name') : '…'
    const unit = a.product ? t(`common:units.${a.product.unit}`, a.product.unit) : ''
    const base = t(`buyer:alerts.sentence.${a.condition}`, {
      product,
      price: a.threshold != null ? `${formatUZS(a.threshold)}/${unit}` : '…',
      pct: a.threshold != null ? formatNumber(a.threshold, a.threshold % 1 ? 1 : 0) : '…',
    })
    const region = regions.data?.find((r) => r.id === a.region_id)
    return region ? `${base} ${t('buyer:alerts.inRegion', { region: ln(region, 'name') })}` : base
  }
}

function AlertRow({ a, index, onToggle, onEdit, onDelete }: { a: PriceAlert; index: number; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation(['buyer', 'common'])
  const sentence = useSentence()
  const catOf = useProductCategory()
  const name = ln(a.product, 'name')
  const met = a.current_price != null && a.threshold != null && (
    (a.condition === 'below' && a.current_price <= a.threshold) || (a.condition === 'above' && a.current_price >= a.threshold))
  const gap = a.current_price != null && a.threshold != null && (a.condition === 'below' || a.condition === 'above')
    ? ((a.current_price - a.threshold) / a.threshold) * 100 : null
  const changePct = a.condition === 'change_pct' && a.current_price != null && a.baseline_price
    ? ((a.current_price - a.baseline_price) / a.baseline_price) * 100 : null

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: Math.min(index, 10) * 0.04 }}>
      <Card className={cn('transition-opacity', !a.is_active && 'opacity-70')}>
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <ProductGlyph category={catOf(a.product_id, a.product.category_id)} name={name} emoji={a.product.emoji} size={44} />
            <div className="min-w-0">
              <p className="text-[15px] leading-snug font-medium">{sentence(a)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge tone="outline">{t(`buyer:alerts.conditions.${a.condition}`)}</Badge>
                {met && <Badge tone="brand"><CheckCircle2 />{t('buyer:alerts.metNow')}</Badge>}
                {a.last_triggered_at
                  ? <span className="inline-flex items-center gap-1"><BellRing className="size-3.5" />{t('buyer:alerts.lastTriggered', { time: timeAgo(a.last_triggered_at) })}</span>
                  : <span>{t('buyer:alerts.neverTriggered')}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 md:gap-8">
            <div className="text-sm">
              <div className="text-[11.5px] text-muted">{t('buyer:alerts.currentPrice')}</div>
              <div className="font-mono font-semibold"><Money value={a.current_price} unit={a.product.unit} /></div>
            </div>
            {a.condition !== 'verified_listing' && (
              <div className="text-sm">
                <div className="text-[11.5px] text-muted">{a.condition === 'change_pct' ? t('buyer:alerts.changeSoFar') : t('buyer:alerts.vsThreshold')}</div>
                <div className={cn('font-mono font-semibold tabular', met ? 'text-brand' : 'text-ink-soft')}>
                  {a.condition === 'change_pct'
                    ? (changePct != null ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% / ±${formatNumber(a.threshold)}%` : '—')
                    : gap != null ? `${gap > 0 ? '+' : ''}${gap.toFixed(1)}%` : '—'}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-t border-line pt-3 md:border-0 md:pt-0">
            <Tooltip content={a.is_active ? t('buyer:alerts.pause') : t('buyer:alerts.enable')}>
              <span className="mr-2 inline-flex"><Switch checked={a.is_active} onCheckedChange={onToggle} aria-label={t('buyer:alerts.activeLabel')} /></span>
            </Tooltip>
            <Button asChild variant="ghost" size="icon-sm" aria-label={t('common:actions.compare')}>
              <Link to={`/app/compare?product=${a.product_id}&qty=100${a.region_id ? `&region_id=${a.region_id}` : ''}`}><Scale /></Link>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t('common:actions.edit')}><Pencil /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={t('common:actions.delete')} className="hover:bg-danger-50 hover:text-danger"><Trash2 /></Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------- create / edit
type TFn = (k: string, o?: Record<string, unknown>) => string
const makeSchema = (t: TFn) => z.object({
  product_id: z.string().min(1, t('buyer:alerts.errors.product')),
  region_id: z.string(),
  condition: z.enum(['below', 'above', 'change_pct', 'verified_listing']),
  threshold: z.string().trim(),
}).superRefine((v, ctx) => {
  if (v.condition === 'verified_listing') return
  const n = Number(v.threshold)
  if (v.threshold === '' || !Number.isFinite(n) || n <= 0) ctx.addIssue({ code: 'custom', path: ['threshold'], message: t('buyer:alerts.errors.threshold') })
  else if (v.condition === 'change_pct' && n > 100) ctx.addIssue({ code: 'custom', path: ['threshold'], message: t('buyer:alerts.errors.pct') })
})
type FormValues = z.infer<ReturnType<typeof makeSchema>>

function AlertDialog({ alert, onClose, onSaved }: { alert: PriceAlert | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation(['buyer', 'common'])
  const regions = useRegions()
  const products = useProducts()
  const sentence = useSentence()
  const schema = React.useMemo(() => makeSchema(t as unknown as TFn), [t])
  const editing = alert && alert !== 'new' ? alert : null
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: { product_id: '', region_id: '', condition: 'below', threshold: '' },
  })

  React.useEffect(() => {
    if (!alert) return
    if (editing) reset({ product_id: editing.product_id, region_id: editing.region_id ?? '', condition: editing.condition, threshold: editing.threshold != null ? String(editing.threshold) : '' })
    else reset({ product_id: '', region_id: '', condition: 'below', threshold: '' })
  }, [alert, editing, reset])

  const v = useWatch({ control })
  const condition = (v.condition ?? 'below') as AlertCondition
  const product = products.data?.find((p) => p.id === v.product_id)
  const unit = product ? t(`common:units.${product.unit}`, product.unit) : ''

  const save = useMutation({
    mutationFn: (f: FormValues) => {
      const threshold = f.condition === 'verified_listing' ? null : Number(f.threshold)
      return editing
        ? Api.updateAlert(editing.id, { region_id: f.region_id || null, condition: f.condition, threshold })
        : Api.createAlert({ product_id: f.product_id, region_id: f.region_id || null, condition: f.condition, threshold })
    },
    onSuccess: () => { toast.success(editing ? t('common:toast.updated') : t('buyer:alerts.createdToast')); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  return (
    <Dialog open={!!alert} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent title={editing ? t('buyer:alerts.editTitle') : t('buyer:alerts.createTitle')} description={t('buyer:alerts.dialogHint')}>
        <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="space-y-4">
          <Field label={t('common:fields.product')} htmlFor="al-product" error={errors.product_id?.message}>
            {editing
              ? <div className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-paper px-3 text-sm"><ProductSymbol emoji={editing.product.emoji} size={17} />{ln(editing.product, 'name')}</div>
              : <Controller control={control} name="product_id" render={({ field }) => (
                <ProductPicker id="al-product" value={field.value} invalid={!!errors.product_id} onChange={(p) => field.onChange(p.id)} />
              )} />}
          </Field>
          <Field label={t('common:fields.region')} htmlFor="al-region" hint={t('buyer:alerts.regionHint')}>
            <Select id="al-region" {...register('region_id')}>
              <option value="">{t('common:fields.allRegions')}</option>
              {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
            </Select>
          </Field>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink-soft">{t('buyer:alerts.condition')}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => setValue('condition', c, { shouldValidate: !!errors.threshold })} aria-pressed={condition === c}
                  className={cn('rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                    condition === c ? 'border-brand bg-mint-50 font-medium text-forest' : 'border-line text-ink-soft hover:border-line-strong')}>
                  {t(`buyer:alerts.conditions.${c}`)}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {condition !== 'verified_listing' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Field label={condition === 'change_pct' ? t('buyer:alerts.thresholdPct') : t('buyer:alerts.thresholdPrice', { currency: currencyLabel() })}
                  htmlFor="al-threshold" error={errors.threshold?.message}>
                  <Input id="al-threshold" type="number" inputMode="decimal" step="any" min={0} aria-invalid={!!errors.threshold}
                    suffix={condition === 'change_pct' ? '%' : `${currencyLabel()}${unit ? `/${unit}` : ''}`} {...register('threshold')} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          {product && (
            <div className="rounded-xl border border-dashed border-line-strong bg-mint-50/60 px-3.5 py-3 text-sm">
              <div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('buyer:alerts.preview')}</div>
              {sentence({ condition, threshold: Number(v.threshold) > 0 ? Number(v.threshold) : null, region_id: v.region_id || null, product })}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={save.isPending}>{editing ? t('common:actions.save') : t('buyer:alerts.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
