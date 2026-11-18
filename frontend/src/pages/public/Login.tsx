import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Lock, Mail, ShieldCheck, ShoppingBasket } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { homeFor, useAuth } from '@/features/auth/AuthContext'
import { errorMessage } from '@/lib/utils'

// Quick-access accounts created by backend/scripts/seed.py (documented in README).
const QUICK = {
  buyer: { email: 'buyer@demo.bozor.uz', password: 'Demo12345', icon: ShoppingBasket },
  seller: { email: 'seller@demo.bozor.uz', password: 'Demo12345', icon: Building2 },
  admin: { email: 'admin@demo.bozor.uz', password: 'Admin12345', icon: ShieldCheck },
} as const

export default function Login() {
  const { t } = useTranslation(['auth', 'common'])
  const { login, user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const from = (loc.state as { from?: string } | null)?.from

  const schema = z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.email')),
    password: z.string().min(1, t('validation.required')),
  })
  type Form = z.infer<typeof schema>
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  React.useEffect(() => {
    const d = params.get('demo') as keyof typeof QUICK | null
    if (d && QUICK[d]) { setValue('email', QUICK[d].email); setValue('password', QUICK[d].password) }
  }, [params, setValue])

  React.useEffect(() => { if (user) nav(from ?? homeFor(user.role), { replace: true }) }, [user, from, nav])

  const onSubmit = async (v: Form) => {
    try {
      const u = await login(v.email, v.password)
      nav(from ?? homeFor(u.role), { replace: true })
    } catch (e) {
      toast.error((e as { response?: { status?: number } })?.response?.status === 401 ? t('login.error') : errorMessage(e))
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">{t('login.title')}</h1>
      <p className="mt-1.5 text-muted">{t('login.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Field label={t('login.email')} error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" icon={<Mail />} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label={<span className="flex justify-between">{t('login.password')}<Link to="/forgot-password" className="font-normal text-brand-600 hover:underline">{t('login.forgot')}</Link></span>}
          error={errors.password?.message} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" icon={<Lock />} aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t('login.submit')}</Button>
      </form>

      <div className="mt-8 rounded-2xl border border-line bg-paper/70 p-4">
        <p className="text-sm font-medium">{t('login.quickTitle')}</p>
        <p className="mb-3 text-xs text-muted">{t('login.quickHint')}</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(QUICK) as (keyof typeof QUICK)[]).map((k) => {
            const Icon = QUICK[k].icon
            return (
              <button key={k} type="button" onClick={() => { setValue('email', QUICK[k].email); setValue('password', QUICK[k].password) }}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-3 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[var(--shadow-card)]">
                <Icon className="size-4 text-brand" />{t(`common:roles.${k}`)}
              </button>
            )
          })}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        {t('login.noAccount')} <Link to="/register" className="font-medium text-brand-600 hover:underline">{t('login.register')}</Link>
      </p>
    </AuthShell>
  )
}
