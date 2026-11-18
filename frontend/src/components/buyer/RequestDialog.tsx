import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { Offer } from '@/api/types'
import { ProductGlyph, VerifiedBadge, offerName } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { useRegions } from '@/hooks/useCatalog'
import { currencyLabel, formatNumber, formatUZS, ln, uz } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type TFn = (k: string, o?: Record<string, unknown>) => string

const makeSchema = (t: TFn, moq: number, available: number) =>
  z.object({
    quantity: z.string().trim()
      .min(1, t('buyer:request.errors.qtyRequired'))
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, t('buyer:request.errors.qtyNumber'))
      .refine((v) => Number(v) >= moq, t('buyer:request.errors.belowMoq', { moq: formatNumber(moq) }))
      .refine((v) => Number(v) <= available, t('buyer:request.errors.aboveAvailable', { available: formatNumber(available) })),
    preferred_price: z.string().trim()
      .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) > 0), t('buyer:request.errors.price')),
    delivery_region_id: z.string(),
    requirements: z.string().max(1000, t('buyer:request.errors.tooLong')),
  })
type FormValues = z.infer<ReturnType<typeof makeSchema>>

/**
 * Purchase-request dialog. Validates quantity against MOQ / stock and shows a live cost preview:
 * total = quantity × unit_price + delivery_price (when the supplier delivers).
 */
export function RequestDialog({ offer, open, onOpenChange, defaultQty }: {
  offer: Offer | null; open: boolean; onOpenChange: (o: boolean) => void; defaultQty?: number
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const { user } = useAuth()
  const regions = useRegions()
  const qc = useQueryClient()

  const moq = offer?.min_order_qty ?? 1
  const available = offer?.available_qty ?? Number.MAX_SAFE_INTEGER
  const schema = React.useMemo(() => makeSchema(t as unknown as TFn, moq, available), [t, moq, available])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: '', preferred_price: '', delivery_region_id: '', requirements: '' },
  })
  const { register, handleSubmit, reset, control, formState: { errors } } = form

  React.useEffect(() => {
    if (!open || !offer) return
    const q = defaultQty && defaultQty >= offer.min_order_qty && defaultQty <= available ? defaultQty : offer.min_order_qty
    reset({ quantity: String(q), preferred_price: '', delivery_region_id: user?.region_id ?? offer.region_id, requirements: '' })
    // re-init only when the dialog opens or the offer changes — not on background refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?.id, defaultQty, user?.region_id, reset])

  const qtyRaw = useWatch({ control, name: 'quantity' })
  const prefRaw = useWatch({ control, name: 'preferred_price' })
  const qty = Number(qtyRaw) > 0 ? Number(qtyRaw) : 0
  const pref = Number(prefRaw) > 0 ? Number(prefRaw) : null

  const mut = useMutation({
    mutationFn: (v: FormValues) => Api.createRequest({
      offer_id: offer!.id,
      quantity: Number(v.quantity),
      preferred_price: v.preferred_price ? Number(v.preferred_price) : undefined,
      delivery_region_id: v.delivery_region_id || undefined,
      requirements: v.requirements.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success(t('buyer:request.sentToast'), { description: offer ? uz(offer.business.name) : undefined })
      void qc.invalidateQueries({ queryKey: ['requests'] })
      void qc.invalidateQueries({ queryKey: ['buyer-dashboard'] })
      onOpenChange(false)
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  if (!offer) return null
  const unit = t(`common:units.${offer.unit}`, offer.unit)
  const subtotal = qty * offer.unit_price
  const delivery = offer.delivery_available ? offer.delivery_price : 0
  const total = subtotal + delivery

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title={t('buyer:request.title')} description={t('buyer:request.description')}>
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-line bg-paper/70 p-3">
          <ProductGlyph category={offer.category_slug} name={offerName(offer)} image={offer.image_url} emoji={offer.product_emoji} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{offerName(offer)}</span>
              
            </div>
            <div className="flex items-center gap-1 truncate text-[13px] text-muted">
              {uz(offer.business.name)} <VerifiedBadge status={offer.business.verification_status} compact />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold tracking-tight text-forest">{formatNumber(offer.unit_price)}</div>
            <div className="text-[11px] text-muted">{currencyLabel()}/{unit}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit((v) => mut.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label={t('buyer:request.quantity')} htmlFor="rq-qty" error={errors.quantity?.message}
            hint={t('buyer:request.qtyHint', { moq: formatNumber(offer.min_order_qty), available: formatNumber(offer.available_qty), unit })}>
            <Input id="rq-qty" type="number" inputMode="decimal" min={offer.min_order_qty} max={offer.available_qty ?? undefined} step="any"
              suffix={unit} aria-invalid={!!errors.quantity} {...register('quantity')} />
          </Field>
          <Field label={t('buyer:request.preferredPrice')} htmlFor="rq-price" error={errors.preferred_price?.message} hint={t('buyer:request.optional')}>
            <Input id="rq-price" type="number" inputMode="decimal" step="any" placeholder={formatNumber(offer.unit_price)}
              suffix={`${currencyLabel()}/${unit}`} aria-invalid={!!errors.preferred_price} {...register('preferred_price')} />
          </Field>
          <Field label={t('buyer:request.deliveryRegion')} htmlFor="rq-region" className="sm:col-span-2"
            hint={offer.delivery_available ? undefined : t('buyer:request.pickupNote')}>
            <Select id="rq-region" {...register('delivery_region_id')}>
              <option value="">{t('common:fields.any')}</option>
              {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
            </Select>
          </Field>
          <Field label={t('buyer:request.requirements')} htmlFor="rq-req" error={errors.requirements?.message} className="sm:col-span-2">
            <Textarea id="rq-req" rows={3} placeholder={t('buyer:request.requirementsPh')} {...register('requirements')} />
          </Field>

          {/* live cost preview */}
          <div className="rounded-xl border border-dashed border-line-strong bg-mint-50/60 p-4 sm:col-span-2">
            <div className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t('buyer:request.preview')}</div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{formatNumber(qty)} {unit} × {formatNumber(offer.unit_price)}</dt>
                <dd className="font-mono tabular">{formatUZS(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('common:fields.deliveryCost')}</dt>
                <dd className="font-mono tabular">{offer.delivery_available ? (delivery > 0 ? formatUZS(delivery) : t('common:delivery.free')) : t('common:delivery.pickup')}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
                <dt className="font-medium">{t('common:fields.total')}</dt>
                <dd className="overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={total} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                      className="block font-mono text-xl font-semibold tracking-tight text-forest tabular">{formatUZS(total)}</motion.span>
                  </AnimatePresence>
                </dd>
              </div>
              {pref != null && qty > 0 && (
                <div className="flex justify-between gap-3 text-xs text-muted">
                  <dt>{t('buyer:request.atYourPrice')}</dt>
                  <dd className="font-mono tabular">{formatUZS(qty * pref + delivery)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={mut.isPending}><Send />{t('common:actions.sendRequest')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RequestDialog
