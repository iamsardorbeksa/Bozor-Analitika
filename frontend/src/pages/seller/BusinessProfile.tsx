import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Building2, CircleDashed, Clock, FileText, ShieldCheck, ShieldX, Star } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { Business, VerificationStatus } from '@/api/types'
import { StatusBadge } from '@/components/market'
import { Eyebrow, Panel, Reveal } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { useCategories, useMarkets, useRegions } from '@/hooks/useCatalog'
import { formatDate, formatNumber, ln, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

export default function BusinessProfile() {
  const { t } = useTranslation(['seller', 'common'])
  const q = useQuery({ queryKey: ['my-business'], queryFn: Api.myBusiness })
  return (
    <div>
      <PageHeader eyebrow={t('profile.eyebrow')} title={t('profile.title')} description={t('profile.subtitle')} />
      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]"><Skeleton className="h-[520px] rounded-2xl" /><Skeleton className="h-[420px] rounded-2xl" /></div>
      ) : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <ProfileForm b={q.data} key={q.data.id} />
          <VerificationPanel b={q.data} />
        </div>
      )}
    </div>
  )
}

function ProfileForm({ b }: { b: Business }) {
  const { t } = useTranslation(['seller', 'common'])
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const cats = useCategories()
  const regions = useRegions()
  const markets = useMarkets()
  const schema = React.useMemo(() => z.object({
    name: z.string().trim().min(2, t('form.errors.min2')).max(160, t('form.errors.max', { n: 160 })),
    category: z.string(),
    description: z.string().max(2000, t('form.errors.max', { n: 2000 })),
    phone: z.string().trim().refine((v) => v === '' || /^\+?[\d\s()-]{7,20}$/.test(v), t('profile.errors.phone')),
    region_id: z.string(),
    market_id: z.string().catch(''),
  }), [t])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { name: b.name, category: b.category ?? '', description: b.description ?? '', phone: b.phone ?? '', region_id: b.region_id ?? '', market_id: b.market_id ?? '' },
  })
  const region = watch('region_id')
  const regionMarkets = (markets.data ?? []).filter((m) => m.region_id === region)
  const m = useMutation({
    mutationFn: (v: V) => Api.updateBusiness({
      name: v.name.trim(), category: v.category || null, description: v.description.trim() || null, phone: v.phone.trim() || null,
      region_id: v.region_id || null, market_id: v.market_id || null,
    }),
    onSuccess: (nb) => {
      toast.success(t('common:toast.saved'))
      qc.setQueryData(['my-business'], nb)
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] })
      reset({ name: nb.name, category: nb.category ?? '', description: nb.description ?? '', phone: nb.phone ?? '', region_id: nb.region_id ?? '', market_id: nb.market_id ?? '' })
      void refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Panel title={t('profile.formTitle')} description={t('profile.formHint')}>
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-paper px-4 py-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-saffron text-saffron" /><span className="font-mono font-semibold">{b.rating.toFixed(1)}</span><span className="text-muted">{t('overview.rating')}</span></span>
        <span><span className="font-mono font-semibold">{formatNumber(b.completed_deals)}</span> <span className="text-muted">{t('overview.deals')}</span></span>
        <span className="text-muted">{t('profile.memberSince', { date: formatDate(b.created_at) })}</span>
      </div>
      <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label={t('profile.fields.name')} error={errors.name?.message} htmlFor="bp-name">
          <Input id="bp-name" icon={<Building2 />} aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label={t('common:fields.category')} htmlFor="bp-cat">
          <Select id="bp-cat" {...register('category')}>
            <option value="">{t('form.choose')}</option>
            {cats.data?.map((c) => <option key={c.id} value={c.slug}>{ln(c, 'name')}</option>)}
          </Select>
        </Field>
        <Field label={t('profile.fields.phone')} error={errors.phone?.message} htmlFor="bp-phone">
          <Input id="bp-phone" type="tel" inputMode="tel" placeholder="+998 90 123 45 67" className="font-mono" aria-invalid={!!errors.phone} {...register('phone')} />
        </Field>
        <Field label={t('common:fields.region')} htmlFor="bp-region">
          <Select id="bp-region" {...register('region_id', { onChange: () => setValue('market_id', '', { shouldDirty: true }) })}>
            <option value="">{t('form.choose')}</option>
            {regions.data?.map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
          </Select>
        </Field>
        <Field label={t('common:fields.market')} htmlFor="bp-market" hint={region && regionMarkets.length === 0 ? t('form.noMarkets') : undefined}>
          <Select id="bp-market" disabled={!region || regionMarkets.length === 0} {...register('market_id')}>
            <option value="">{t('form.noMarket')}</option>
            {regionMarkets.map((mk) => <option key={mk.id} value={mk.id}>{uz(mk.name)}</option>)}
          </Select>
        </Field>
        <Field className="sm:col-span-2" label={t('profile.fields.description')} error={errors.description?.message} htmlFor="bp-desc" hint={t('profile.descriptionHint')}>
          <Textarea id="bp-desc" rows={5} {...register('description')} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset()}>{t('common:actions.reset')}</Button>
          <Button type="submit" loading={m.isPending} disabled={!isDirty}>{t('common:actions.save')}</Button>
        </div>
      </form>
    </Panel>
  )
}

const STATUS_ICON: Record<VerificationStatus, React.ComponentType<{ className?: string }>> = {
  verified: BadgeCheck, pending: Clock, rejected: ShieldX, unverified: CircleDashed,
}

function VerificationPanel({ b }: { b: Business }) {
  const { t } = useTranslation(['seller', 'common'])
  const qc = useQueryClient()
  const hist = useQuery({ queryKey: ['verification-history'], queryFn: Api.verificationHistory })
  const status = b.verification_status
  const Icon = STATUS_ICON[status]
  const canRequest = status === 'unverified' || status === 'rejected'
  const schema = React.useMemo(() => z.object({
    document_note: z.string().trim().min(10, t('profile.errors.noteMin')).max(1000, t('form.errors.max', { n: 1000 })),
  }), [t])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, reset, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { document_note: '' } })
  const m = useMutation({
    mutationFn: (v: V) => Api.requestVerification(v.document_note.trim()),
    onSuccess: () => {
      toast.success(t('profile.requested'))
      reset()
      qc.invalidateQueries({ queryKey: ['my-business'] })
      qc.invalidateQueries({ queryKey: ['verification-history'] })
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const tone = { verified: 'border-good/25 bg-good-50 text-good', pending: 'border-[#f0d7b6] bg-saffron-50 text-[#8a4a00]', rejected: 'border-[#ecc7c3] bg-danger-50 text-danger', unverified: 'border-line bg-ink/[0.04] text-ink-soft' }[status]

  return (
    <div className="space-y-4">
      <Reveal i={1} className="rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-5 shadow-[var(--shadow-card)]">
        <Eyebrow className="mb-3 flex items-center gap-1.5"><ShieldCheck className="size-3.5" />{t('profile.verification')}</Eyebrow>
        <div className={cn('flex items-start gap-3 rounded-xl border p-4', tone)}>
          <Icon className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="font-semibold">{t(`profile.status.${status}.title`)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{t(`profile.status.${status}.body`)}</p>
            {status === 'verified' && b.verified_at && <p className="mt-1 text-xs text-muted">{t('profile.verifiedAt', { date: formatDate(b.verified_at) })}</p>}
          </div>
        </div>

        {canRequest && (
          <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="mt-4 space-y-3">
            <Field label={t('profile.documentNote')} error={errors.document_note?.message} htmlFor="vr-note" hint={t('profile.documentHint')}>
              <Textarea id="vr-note" rows={4} placeholder={t('profile.documentPlaceholder')} aria-invalid={!!errors.document_note} {...register('document_note')} />
            </Field>
            <Button type="submit" className="w-full" loading={m.isPending}><ShieldCheck /> {t('profile.requestBtn')}</Button>
          </form>
        )}
      </Reveal>

      <Panel i={2} title={t('profile.history')}>
        {hist.isLoading ? <SkeletonList rows={3} /> : hist.isError || !hist.data ? <ErrorState onRetry={() => hist.refetch()} className="py-6" />
          : hist.data.length === 0 ? <EmptyState icon={<FileText />} title={t('profile.noHistory')} className="py-8" /> : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {hist.data.map((h) => {
                const HI = STATUS_ICON[h.status]
                return (
                  <li key={h.id} className="relative">
                    <span className="absolute top-0.5 -left-[29px] grid size-[18px] place-items-center rounded-full bg-white ring-1 ring-line"><HI className="size-3 text-brand" /></span>
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.status} /><span className="text-xs text-muted">{formatDate(h.created_at, true)}</span></div>
                    {h.document_note && <p className="mt-1.5 text-[13px] text-ink-soft"><span className="text-muted">{t('profile.yourNote')}:</span> {uz(h.document_note)}</p>}
                    {h.review_note && <p className="mt-1 rounded-lg bg-paper px-2.5 py-1.5 text-[13px] text-ink-soft"><span className="text-muted">{t('profile.reviewNote')}:</span> {uz(h.review_note)}</p>}
                    {h.reviewed_at && <p className="mt-1 text-[11.5px] text-muted">{t('profile.reviewedAt', { date: formatDate(h.reviewed_at, true) })}</p>}
                  </li>
                )
              })}
            </ol>
          )}
      </Panel>
    </div>
  )
}
