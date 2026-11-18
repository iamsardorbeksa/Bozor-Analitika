import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Building2, Check, Lock, Mail, Phone, ShoppingBasket, User } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { homeFor, useAuth } from '@/features/auth/AuthContext'
import { useRegions } from '@/hooks/useCatalog'
import { currentLang, ln } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const CATS = ['supermarket', 'restaurant', 'shop', 'manufacturer', 'farmer', 'wholesaler', 'distributor', 'construction', 'other'] as const

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++
  if (/[^a-z0-9]/i.test(pw) || /[A-Z]/.test(pw)) s++
  return Math.min(s, 4)
}

export default function Register() {
  const { t } = useTranslation(['auth', 'common'])
  const { register: signUp } = useAuth()
  const nav = useNavigate()
  const regions = useRegions()
  const [params] = useSearchParams()
  const initialRole = params.get('role')
  const [role, setRole] = React.useState<'buyer' | 'seller' | null>(initialRole === 'seller' || initialRole === 'buyer' ? initialRole : null)

  const schema = z.object({
    full_name: z.string().trim().min(2, t('validation.min2')),
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
    phone: z.string().regex(/^\+?[0-9 ()-]{7,32}$/, t('validation.phone')),
    password: z.string().min(8, t('validation.password')).refine((v) => /[a-z]/i.test(v) && /\d/.test(v), t('validation.password')),
    business_name: z.string().optional(),
    region_id: z.string().min(1, t('validation.required')),
    business_category: z.string().optional(),
  }).refine((v) => role !== 'seller' || (v.business_name?.trim().length ?? 0) >= 2, { message: t('validation.business'), path: ['business_name'] })
  type Form = z.infer<typeof schema>

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { phone: '+998 ', region_id: '' },
  })
  const pw = useWatch({ control, name: 'password' }) ?? ''
  const score = strength(pw)

  const onSubmit = async (v: Form) => {
    try {
      const u = await signUp({
        ...v, role: role!, language: currentLang(),
        business_name: role === 'seller' ? v.business_name?.trim() : undefined,
        business_category: v.business_category ? t(`register.categories.${v.business_category}`) : undefined,
      })
      toast.success(t('common:toast.saved'))
      nav(homeFor(u.role), { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted">
        {[t('register.step1'), t('register.step2')].map((s, i) => (
          <React.Fragment key={s}>
            <span className={cn('flex items-center gap-1.5', (i === 0 || role) && 'text-ink')}>
              <span className={cn('grid size-5 place-items-center rounded-full text-[10px]', i === 0 && role ? 'bg-good text-white' : i === 0 || role ? 'bg-ink text-white' : 'bg-line text-muted')}>
                {i === 0 && role ? <Check className="size-3" /> : i + 1}
              </span>{s}
            </span>
            {i === 0 && <span className="h-px w-8 bg-line-strong" />}
          </React.Fragment>
        ))}
      </div>
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">{t('register.title')}</h1>
      <p className="mt-1.5 text-muted">{role ? t('register.subtitle') : t('register.chooseRole')}</p>

      <AnimatePresence mode="wait">
        {!role ? (
          <motion.div key="roles" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-8 grid gap-3">
            {([['buyer', ShoppingBasket], ['seller', Building2]] as const).map(([r, Icon]) => (
              <button key={r} onClick={() => setRole(r)}
                className="group flex items-start gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[var(--shadow-lift)]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-brand-600 transition-colors group-hover:bg-brand group-hover:text-white"><Icon className="size-5" /></span>
                <span>
                  <span className="block font-semibold">{t(`register.${r}T`)}</span>
                  <span className="mt-1 block text-sm text-muted">{t(`register.${r}D`)}</span>
                </span>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <button type="button" onClick={() => setRole(null)} className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink hover:bg-ink/10">
              <ArrowLeft className="size-3.5" />{t(`register.${role}T`)}
            </button>
            <Field label={t('register.fullName')} error={errors.full_name?.message} htmlFor="full_name">
              <Input id="full_name" icon={<User />} autoComplete="name" aria-invalid={!!errors.full_name} {...register('full_name')} />
            </Field>
            {role === 'seller' && (
              <Field label={t('register.businessName')} error={errors.business_name?.message} htmlFor="business_name">
                <Input id="business_name" icon={<Building2 />} autoComplete="organization" aria-invalid={!!errors.business_name} {...register('business_name')} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('register.email')} error={errors.email?.message} htmlFor="email">
                <Input id="email" type="email" icon={<Mail />} autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
              </Field>
              <Field label={t('register.phone')} error={errors.phone?.message} htmlFor="phone">
                <Input id="phone" type="tel" icon={<Phone />} autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('register.region')} error={errors.region_id?.message} htmlFor="region_id">
                <Select id="region_id" aria-invalid={!!errors.region_id} {...register('region_id')}>
                  <option value="">{t('register.chooseRegion')}</option>
                  {regions.data?.map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
                </Select>
              </Field>
              <Field label={t('register.category')} htmlFor="business_category">
                <Select id="business_category" {...register('business_category')}>
                  <option value="">{t('register.chooseCategory')}</option>
                  {CATS.map((c) => <option key={c} value={c}>{t(`register.categories.${c}`)}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={t('register.password')} error={errors.password?.message} hint={t('register.passwordHint')} htmlFor="password">
              <Input id="password" type="password" icon={<Lock />} autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
            </Field>
            {pw && (
              <div className="-mt-1 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < score ? (score <= 1 ? 'bg-danger' : score === 2 ? 'bg-saffron' : 'bg-good') : 'bg-line')} />
                  ))}
                </div>
                <span className="text-[11px] text-muted">{(t('register.strength', { returnObjects: true }) as string[])[score]}</span>
              </div>
            )}
            {role === 'seller' && <p className="rounded-xl bg-mint-50 px-3 py-2.5 text-xs text-ink-soft">{t('register.sellerNote')}</p>}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t('register.submit')}</Button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-sm text-muted">
        {t('register.haveAccount')} <Link to="/login" className="font-medium text-brand-600 hover:underline">{t('register.login')}</Link>
      </p>
    </AuthShell>
  )
}
