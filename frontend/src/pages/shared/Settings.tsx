import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import { Badge, VerifiedBadge } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { useAuth } from '@/features/auth/AuthContext'
import { useRegions } from '@/hooks/useCatalog'
import { LANGS } from '@/i18n'
import { formatDate, ln, timeAgo } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

export default function Settings(_props: { basePath?: string }) {
  const { t } = useTranslation(['account', 'common'])
  const { user } = useAuth()
  if (!user) return <Skeleton className="h-96 w-full" />
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <ProfileForm />
          <PasswordForm />
        </div>
        <AccountInfo />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- profile
function ProfileForm() {
  const { t, i18n } = useTranslation(['account', 'common'])
  const { user, setUser } = useAuth()
  const regions = useRegions()

  const schema = React.useMemo(() => z.object({
    full_name: z.string().trim().min(2, t('validation.nameMin')).max(120),
    phone: z.string().trim().max(32).refine((v) => !v || /^\+?[\d\s()-]{7,}$/.test(v), t('validation.phone')),
    region_id: z.string(),
    business_category: z.string().trim().max(80, t('validation.max', { n: 80 })),
    language: z.enum(['uz', 'ru', 'en']),
  }), [t])
  type Values = z.infer<typeof schema>

  const defaults = React.useCallback((): Values => ({
    full_name: user?.full_name ?? '', phone: user?.phone ?? '', region_id: user?.region_id ?? '',
    business_category: user?.business_category ?? '', language: user?.language ?? 'uz',
  }), [user])

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() })
  const { register, handleSubmit, formState: { errors, isDirty }, reset } = form

  // once regions load, re-apply so the native select shows the saved region
  React.useEffect(() => { if (regions.data && !isDirty) reset(defaults()) }, [regions.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (v: Values) => Api.updateMe({
      full_name: v.full_name, phone: v.phone || null, region_id: v.region_id || null,
      business_category: v.business_category || null, language: v.language,
    }),
    onSuccess: (u) => {
      setUser(u)
      if (u.language && u.language !== i18n.resolvedLanguage) void i18n.changeLanguage(u.language)
      reset({ full_name: u.full_name, phone: u.phone ?? '', region_id: u.region_id ?? '', business_category: u.business_category ?? '', language: u.language })
      toast.success(t('settings.profileSaved'))
    },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><UserRound className="size-4 text-brand" />{t('settings.profile')}</CardTitle>
          <CardDescription>{t('settings.profileHint')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label={t('settings.fullName')} htmlFor="full_name" error={errors.full_name?.message} className="sm:col-span-2">
            <Input id="full_name" autoComplete="name" aria-invalid={!!errors.full_name} {...register('full_name')} />
          </Field>
          <Field label={t('settings.phone')} htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" aria-invalid={!!errors.phone} {...register('phone')} />
          </Field>
          <Field label={t('common:fields.region')} htmlFor="region_id">
            <Select id="region_id" disabled={regions.isLoading} {...register('region_id')}>
              <option value="">{t('settings.noRegion')}</option>
              {regions.data?.map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
            </Select>
          </Field>
          <Field label={t('settings.businessCategory')} htmlFor="business_category" error={errors.business_category?.message} hint={t('settings.businessCategoryHint')}>
            <Input id="business_category" aria-invalid={!!errors.business_category} {...register('business_category')} />
          </Field>
          <Field label={t('common:lang.label')} htmlFor="language" hint={t('settings.languageHint')}>
            <Select id="language" {...register('language')}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" disabled={!isDirty || save.isPending} onClick={() => reset(defaults())}>{t('common:actions.reset')}</Button>
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>{t('common:actions.save')}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- password
function PasswordForm() {
  const { t } = useTranslation(['account', 'common'])
  const [show, setShow] = React.useState(false)
  const schema = React.useMemo(() => z.object({
    current_password: z.string().min(1, t('validation.required')),
    new_password: z.string()
      .min(8, t('validation.pwMin'))
      .regex(/[A-Za-z]/, t('validation.pwLetter'))
      .regex(/\d/, t('validation.pwDigit')),
    confirm: z.string().min(1, t('validation.required')),
  }).refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: t('validation.pwMatch') })
    .refine((v) => v.new_password !== v.current_password, { path: ['new_password'], message: t('validation.pwSame') }), [t])
  type Values = z.infer<typeof schema>

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { current_password: '', new_password: '', confirm: '' },
  })

  const change = useMutation({
    mutationFn: (v: Values) => Api.changePassword(v.current_password, v.new_password),
    onSuccess: () => { toast.success(t('settings.passwordChanged')); reset() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const type = show ? 'text' : 'password'
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-brand" />{t('settings.password')}</CardTitle>
          <CardDescription>{t('settings.passwordHint')}</CardDescription>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? <EyeOff /> : <Eye />}{show ? t('settings.hide') : t('settings.show')}
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => change.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label={t('settings.currentPassword')} htmlFor="current_password" error={errors.current_password?.message} className="sm:col-span-2">
            <Input id="current_password" type={type} autoComplete="current-password" aria-invalid={!!errors.current_password} {...register('current_password')} />
          </Field>
          <Field label={t('settings.newPassword')} htmlFor="new_password" error={errors.new_password?.message} hint={t('settings.passwordRules')}>
            <Input id="new_password" type={type} autoComplete="new-password" aria-invalid={!!errors.new_password} {...register('new_password')} />
          </Field>
          <Field label={t('settings.confirmPassword')} htmlFor="confirm" error={errors.confirm?.message}>
            <Input id="confirm" type={type} autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="dark" loading={change.isPending}>{t('settings.updatePassword')}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- account info
function AccountInfo() {
  const { t } = useTranslation(['account', 'common'])
  const { user } = useAuth()
  if (!user) return null
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('settings.role'), value: <Badge tone={user.role === 'admin' ? 'dark' : user.role === 'seller' ? 'saffron' : 'brand'}>{t(`common:roles.${user.role}`)}</Badge> },
    { label: t('settings.email'), value: <span className="inline-flex items-center gap-1.5 break-all"><Mail className="size-3.5 shrink-0 text-muted" />{user.email}</span> },
    { label: t('settings.memberSince'), value: <span title={timeAgo(user.created_at)}>{formatDate(user.created_at)}</span> },
    { label: t('settings.status'), value: <Badge tone={user.is_active ? 'brand' : 'danger'}>{user.is_active ? t('common:status.active') : t('common:status.suspended')}</Badge> },
  ]
  if (user.business) rows.push({ label: t('settings.business'), value: <span className="inline-flex flex-wrap items-center gap-1.5">{user.business.name}<VerifiedBadge status={user.business.verification_status} /></span> })
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand" />{t('settings.account')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-ink text-lg font-extrabold text-white">
              {user.full_name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{user.full_name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
          </div>
          <dl className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">{r.label}</dt>
                <dd className="text-right font-medium text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
