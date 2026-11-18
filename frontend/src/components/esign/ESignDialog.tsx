import { Check, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { formatDate, formatUZS } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Stable 32-bit FNV-1a hash, used to derive demo certificate details from the signer's name. */
export function fnv(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const hex = (n: number, len: number) => n.toString(16).toUpperCase().padStart(len, '0').slice(0, len)

/**
 * A demo of the E-IMZO key window used in Uzbekistan: one key card, PIN, and a short signing sequence.
 * No real key or cryptography is involved; the server computes the (demo) signature.
 */
export function ESignDialog({ open, onOpenChange, signerName, documentLabel, amount, loading, onSign }: {
  open: boolean; onOpenChange: (o: boolean) => void; signerName: string; documentLabel: string
  amount?: number; loading?: boolean; onSign: (pin: string) => void
}) {
  const { t } = useTranslation('contract')
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState(-1)

  React.useEffect(() => {
    if (open) { setPin(''); setError(null); setStep(-1) }
  }, [open])

  // three visual steps while the request is in flight
  React.useEffect(() => {
    if (!loading) return
    setStep(0)
    const a = setTimeout(() => setStep(1), 450)
    const b = setTimeout(() => setStep(2), 900)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [loading])

  const seed = fnv(signerName || 'signer')
  const serial = 'UZ' + hex(seed, 8) + hex(fnv(signerName + '#'), 6)
  const stir = String(300000000 + (seed % 99999999))
  const validUntil = new Date(Date.now() + 365 * 864e5).toISOString()
  const steps = t('esign.steps').split(' · ')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4,8}$/.test(pin)) { setError(t('esign.pinError')); return }
    setError(null)
    onSign(pin)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o) }}>
      <DialogContent title={t('esign.title')} description={t('esign.subtitle')}>
        <form onSubmit={submit} className="space-y-4">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{t('esign.keys')}</div>
          {/* the key card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#1d5fd1] bg-gradient-to-br from-[#f2f6ff] to-white p-4">
            <span className="absolute top-3 -right-9 rotate-45 bg-brand px-10 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white">{t('esign.demo')}</span>
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1d5fd1] text-white"><KeyRound className="size-5" /></div>
              <div className="min-w-0 pr-8">
                <div className="truncate font-bold tracking-[-0.01em] uppercase">{signerName}</div>
                <div className="text-[12px] text-muted">{t('esign.keyType')}</div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[12px]">
              <dt className="text-muted">{t('esign.stir')}</dt><dd>{stir}</dd>
              <dt className="text-muted">{t('esign.serial')}</dt><dd className="truncate">{serial}</dd>
              <dt className="text-muted">{t('esign.validUntil')}</dt><dd>{formatDate(validUntil)}</dd>
            </dl>
          </div>

          <div className="rounded-xl bg-paper px-3 py-2.5 text-[13px]">
            <div className="flex justify-between gap-3"><span className="text-muted">{t('esign.document')}</span><span className="truncate font-medium">{documentLabel}</span></div>
            {amount != null && <div className="mt-1 flex justify-between gap-3"><span className="text-muted">{t('esign.amount')}</span><span className="font-mono font-semibold">{formatUZS(amount)}</span></div>}
          </div>

          <Field label={t('esign.pin')} htmlFor="esign-pin" error={error ?? undefined} hint={t('esign.pinHint')}>
            <Input id="esign-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={8} autoFocus
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} disabled={loading}
              className="font-mono tracking-[0.4em]" aria-invalid={!!error} />
          </Field>

          <AnimatePresence>
            {loading && (
              <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 text-[13px]">
                {steps.map((s, i) => (
                  <li key={s} className={cn('flex items-center gap-2 transition-colors', i <= step ? 'text-ink' : 'text-muted')}>
                    {i < step ? <Check className="size-4 text-good" /> : i === step ? <Loader2 className="size-4 animate-spin text-brand" /> : <span className="size-4 rounded-full border border-line" />}
                    {s}
                  </li>
                ))}
              </motion.ol>
            )}
          </AnimatePresence>

          <Button type="submit" size="lg" className="w-full" loading={loading}><ShieldCheck />{loading ? t('esign.signing') : t('esign.sign')}</Button>
          <p className="text-center text-[11.5px] text-muted">{t('esign.note')}</p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
