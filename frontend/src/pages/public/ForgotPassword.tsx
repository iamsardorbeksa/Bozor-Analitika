import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MailCheck, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/utils'

export default function ForgotPassword() {
  const { t } = useTranslation('auth')
  const [sent, setSent] = React.useState(false)
  const schema = z.object({ email: z.string().min(1, t('validation.required')).email(t('validation.email')) })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: { email: string }) => {
    try {
      await Api.forgotPassword(v.email)
      setSent(true)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <AuthShell>
      <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{t('forgot.back')}</Link>
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-mint text-brand"><MailCheck className="size-6" /></span>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{t('forgot.title')}</h1>
          <p className="mt-3 text-ink-soft">{t('forgot.sent')}</p>
          <p className="mt-4 rounded-xl bg-saffron-50 px-3 py-2.5 text-xs text-[#8a4a00]">{t('forgot.sentNote')}</p>
        </motion.div>
      ) : (
        <>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em]">{t('forgot.title')}</h1>
          <p className="mt-1.5 text-muted">{t('forgot.subtitle')}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <Field label={t('login.email')} error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" icon={<Mail />} autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{t('forgot.submit')}</Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
