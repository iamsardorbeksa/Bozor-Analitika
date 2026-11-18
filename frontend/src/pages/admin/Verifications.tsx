import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, FileText, Mail, MapPin, Package, Phone, ShieldCheck, Star, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { VerificationRequest } from '@/api/types'
import { ProductGlyph, StatusBadge } from '@/components/market'
import { EASE } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Field, Textarea } from '@/components/ui/input'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useCategories } from '@/hooks/useCatalog'
import { formatDate, ln, timeAgo, uz } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type Tab = 'pending' | 'verified' | 'rejected'

export default function AdminVerifications() {
  const { t } = useTranslation(['admin', 'common'])
  const [tab, setTab] = React.useState<Tab>('pending')
  const q = useQuery({ queryKey: ['admin-verifications', tab], queryFn: () => Api.adminVerifications(tab) })
  const [review, setReview] = React.useState<{ r: VerificationRequest; action: 'approve' | 'reject' } | null>(null)
  return (
    <div>
      <PageHeader eyebrow={t('verifications.eyebrow')} title={t('verifications.title')} description={t('verifications.subtitle')} />
      <Segmented id="ver-tab" className="mb-5" value={tab} onChange={setTab} options={[
        { value: 'pending', label: t('common:status.pending') }, { value: 'verified', label: t('common:status.verified') }, { value: 'rejected', label: t('common:status.rejected') },
      ]} />
      {q.isLoading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} />
        : q.data.length === 0 ? <EmptyState icon={<ShieldCheck />} title={t(`verifications.empty.${tab}`)} />
        : (
          <div className="grid gap-3 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {q.data.map((r, i) => <VerificationCard key={r.id} r={r} i={i} onAction={(action) => setReview({ r, action })} />)}
            </AnimatePresence>
          </div>
        )}
      <ReviewDialog state={review} onClose={() => setReview(null)} />
    </div>
  )
}

function VerificationCard({ r, i, onAction }: { r: VerificationRequest; i: number; onAction: (a: 'approve' | 'reject') => void }) {
  const { t } = useTranslation(['admin', 'common'])
  const cats = useCategories()
  const b = r.business
  const cat = cats.data?.find((c) => c.slug === b.category)
  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35, ease: EASE }}
      className="flex flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <ProductGlyph category={b.category} name={b.name} size={44} />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{uz(b.name)}</h3>
            <p className="text-xs text-muted">{cat ? ln(cat, 'name') : '—'} · {t('verifications.registered', { date: formatDate(b.created_at) })}</p>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </header>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 text-[13px] sm:grid-cols-2">
        <Row icon={<Building2 />} label={t('verifications.owner')} value={uz(b.owner)} />
        <Row icon={<Mail />} label="Email" value={<a className="hover:text-brand" href={`mailto:${b.email}`}>{b.email}</a>} />
        <Row icon={<Phone />} label={t('verifications.phone')} value={b.phone ? <span className="font-mono">{b.phone}</span> : '—'} />
        <Row icon={<MapPin />} label={t('common:fields.region')} value={b.region ? uz(b.region) : '—'} />
        <Row icon={<Package />} label={t('verifications.offers')} value={<span className="font-mono">{b.offers}</span>} />
        <Row icon={<Star />} label={t('common:fields.rating')} value={<span className="font-mono">{b.rating.toFixed(2)}</span>} />
      </dl>
      <div className="mx-5 mb-4 rounded-xl bg-paper px-3 py-2.5 text-[13px]">
        <p className="mb-0.5 flex items-center gap-1.5 text-xs text-muted"><FileText className="size-3.5" />{t('verifications.documentNote')} · {timeAgo(r.created_at)}</p>
        <p className="text-ink-soft">{r.document_note ? uz(r.document_note) : <span className="text-muted">{t('verifications.noNote')}</span>}</p>
      </div>
      {r.review_note && (
        <p className="mx-5 mb-4 text-[13px] text-ink-soft"><span className="text-muted">{t('verifications.reviewNote')}:</span> {uz(r.review_note)}{r.reviewed_at && <span className="text-muted"> · {formatDate(r.reviewed_at)}</span>}</p>
      )}
      {r.status === 'pending' && (
        <footer className="mt-auto flex gap-2 border-t border-line bg-paper/50 px-5 py-3">
          <Button size="sm" onClick={() => onAction('approve')}><Check /> {t('common:actions.approve')}</Button>
          <Button size="sm" variant="danger-outline" onClick={() => onAction('reject')}><X /> {t('common:actions.reject')}</Button>
        </footer>
      )}
    </motion.article>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-muted [&_svg]:size-3.5">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate text-ink-soft">{value}</dd>
    </div>
  )
}

function ReviewDialog({ state, onClose }: { state: { r: VerificationRequest; action: 'approve' | 'reject' } | null; onClose: () => void }) {
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const [note, setNote] = React.useState('')
  const [err, setErr] = React.useState<string | null>(null)
  React.useEffect(() => { if (state) { setNote(''); setErr(null) } }, [state])
  const m = useMutation({
    mutationFn: () => state!.action === 'approve' ? Api.adminApprove(state!.r.id, note.trim() || undefined) : Api.adminReject(state!.r.id, note.trim()),
    onSuccess: () => {
      toast.success(t(state!.action === 'approve' ? 'verifications.approved' : 'verifications.rejected', { name: uz(state!.r.business.name) }))
      qc.invalidateQueries({ queryKey: ['admin-verifications'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const submit = () => {
    if (state?.action === 'reject' && note.trim().length < 5) return setErr(t('verifications.reasonRequired'))
    if (note.length > 500) return setErr(t('verifications.noteTooLong'))
    m.mutate()
  }
  const approve = state?.action === 'approve'
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={approve ? t('verifications.approveTitle') : t('verifications.rejectTitle')}
        description={state ? t(approve ? 'verifications.approveBody' : 'verifications.rejectBody', { name: uz(state.r.business.name) }) : undefined}>
        <Field label={approve ? t('verifications.noteOptional') : t('verifications.reason')} error={err ?? undefined} htmlFor="rv-note">
          <Textarea id="rv-note" rows={3} value={note} aria-invalid={!!err} onChange={(e) => { setNote(e.target.value); setErr(null) }}
            placeholder={approve ? t('verifications.approvePlaceholder') : t('verifications.rejectPlaceholder')} />
        </Field>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Button>
          <Button variant={approve ? 'primary' : 'danger'} loading={m.isPending} onClick={submit}>
            {approve ? <><Check /> {t('common:actions.approve')}</> : <><X /> {t('common:actions.reject')}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
