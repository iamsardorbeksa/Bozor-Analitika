import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban, Check, ExternalLink, Flag, History, PackageX, RotateCcw, ShieldCheck, ShieldX, Tag, UserCheck, UserX, X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { AuditEntry, OfferReport } from '@/api/types'
import { Badge, Money, ProductGlyph, StatusBadge, offerName } from '@/components/market'
import { ConfirmDialog, EASE } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { useCategories } from '@/hooks/useCatalog'
import { formatDate, ln, timeAgo, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

type Tab = 'open' | 'resolved' | 'dismissed' | 'audit'
type Act = { r: OfferReport; status: 'resolved' | 'dismissed'; remove: boolean }

export default function AdminReports() {
  const { t } = useTranslation(['admin', 'common'])
  const [tab, setTab] = React.useState<Tab>('open')
  return (
    <div>
      <PageHeader eyebrow={t('reports.eyebrow')} title={t('reports.title')} description={t('reports.subtitle')} />
      <div className="-mx-1 mb-5 overflow-x-auto px-1 scrollbar-thin">
        <Segmented id="rep-tab" value={tab} onChange={setTab} options={[
          { value: 'open', label: t('common:status.open') }, { value: 'resolved', label: t('common:status.resolved') },
          { value: 'dismissed', label: t('common:status.dismissed') }, { value: 'audit', label: <span className="inline-flex items-center gap-1.5"><History className="size-3.5" />{t('reports.audit')}</span> },
        ]} />
      </div>
      {tab === 'audit' ? <AuditLog /> : <ReportList status={tab} />}
    </div>
  )
}

function ReportList({ status }: { status: 'open' | 'resolved' | 'dismissed' }) {
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-reports', status], queryFn: () => Api.adminReports(status) })
  const [act, setAct] = React.useState<Act | null>(null)
  const m = useMutation({
    mutationFn: (a: Act) => Api.adminResolveReport(a.r.id, a.status, a.remove),
    onSuccess: (_, a) => {
      toast.success(t(a.remove ? 'reports.doneRemove' : a.status === 'resolved' ? 'reports.doneResolve' : 'reports.doneDismiss'))
      setAct(null)
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-offers'] })
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  if (q.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  if (q.data.length === 0) return <EmptyState icon={<Flag />} title={t(`reports.empty.${status}`)} />
  const key = act ? (act.remove ? 'remove' : act.status === 'resolved' ? 'resolve' : 'dismiss') : 'resolve'
  return (
    <>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {q.data.map((r, i) => (
            <motion.article key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35, ease: EASE }}
              className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-5 shadow-[var(--shadow-card)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={r.reason === 'price_suspicious' ? 'saffron' : r.reason === 'fake_seller' ? 'danger' : 'neutral'}><Flag /> {t(`reports.reason.${r.reason}`, t('reports.reason.other'))}</Badge>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-[13.5px] text-ink-soft">{r.details ? `“${uz(r.details)}”` : <span className="text-muted">{t('reports.noDetails')}</span>}</p>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
                <ProductGlyph category={r.offer.category_slug} name={offerName(r.offer)} image={r.offer.image_url} emoji={r.offer.product_emoji} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[13.5px] font-medium">{uz(r.offer.title)}</span></div>
                  <p className="truncate text-xs text-muted">{uz(r.offer.business.name)} · <Money value={r.offer.unit_price} unit={r.offer.unit} className="font-mono" /></p>
                </div>
                <StatusBadge status={r.offer.status} />
                <Button variant="ghost" size="icon-sm" asChild aria-label={t('offers.open')}><Link to={`/app/market/${r.offer.id}`}><ExternalLink /></Link></Button>
              </div>
              {r.status === 'open' ? (
                <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
                  <Button size="sm" onClick={() => setAct({ r, status: 'resolved', remove: false })}><Check /> {t('reports.resolve')}</Button>
                  <Button size="sm" variant="danger" disabled={r.offer.status === 'removed'} onClick={() => setAct({ r, status: 'resolved', remove: true })}><PackageX /> {t('reports.resolveRemove')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setAct({ r, status: 'dismissed', remove: false })}><X /> {t('reports.dismiss')}</Button>
                </div>
              ) : <span className="text-xs text-muted md:text-right">{formatDate(r.created_at)}</span>}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
      <ConfirmDialog open={!!act} onOpenChange={(o) => !o && setAct(null)} tone={act?.remove ? 'danger' : 'primary'}
        title={t(`reports.confirm.${key}.title`)} description={act ? t(`reports.confirm.${key}.body`, { title: uz(act.r.offer.title) }) : undefined}
        confirmLabel={t(`reports.confirm.${key}.cta`)} loading={m.isPending} onConfirm={() => act && m.mutate(act)} />
    </>
  )
}

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'seller.approve': ShieldCheck, 'seller.reject': ShieldX, 'user.suspend': UserX, 'user.reactivate': UserCheck,
  'offer.remove': PackageX, 'offer.restore': RotateCcw, 'report.resolved': Check, 'report.dismissed': Ban, 'category.create': Tag, 'category.update': Tag,
}

function AuditLog() {
  const { t } = useTranslation(['admin', 'common'])
  const [limit, setLimit] = React.useState(50)
  const q = useQuery({ queryKey: ['admin-audit', limit], queryFn: () => Api.adminAuditLogs(limit), placeholderData: (p) => p })
  const cats = useCategories()
  const catName = (slug: string) => { const c = cats.data?.find((x) => x.slug === slug); return c ? ln(c, 'name') : null }
  if (q.isLoading) return <SkeletonList rows={8} />
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  if (q.data.length === 0) return <EmptyState icon={<History />} title={t('reports.auditEmpty')} />
  // group by day
  const groups: { day: string; items: AuditEntry[] }[] = []
  for (const e of q.data) {
    const day = e.created_at.slice(0, 10)
    const g = groups[groups.length - 1]
    if (g?.day === day) g.items.push(e); else groups.push({ day, items: [e] })
  }
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl p-5 shadow-[var(--shadow-card)]">
      {groups.map((g) => (
        <section key={g.day} className="mb-5 last:mb-0">
          <h4 className="mb-3 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">{formatDate(g.day)}</h4>
          <ol className="relative space-y-3 border-l border-line pl-6">
            {g.items.map((e, i) => {
              const Icon = ACTION_ICON[e.action] ?? History
              const danger = /remove|reject|suspend/.test(e.action)
              return (
                <motion.li key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.025, ease: EASE }} className="relative">
                  <span className={cn('absolute top-0 -left-[37px] grid size-[22px] place-items-center rounded-full ring-4 ring-white', danger ? 'bg-danger-50 text-danger' : 'bg-mint text-brand')}>
                    <Icon className="size-3" />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13.5px] font-medium">{t(`reports.actions.${e.action.replace('.', '_')}`, t('reports.actions.other'))}</span>
                    {detailLabel(e, catName) && <span className="text-[13px] text-ink-soft">— {uz(detailLabel(e, catName)!)}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {e.actor ? uz(e.actor) : t('reports.system')} · {formatDate(e.created_at, true)} · {t(`reports.entity.${e.entity_type}`, t('reports.entity.other'))}
                  </p>
                </motion.li>
              )
            })}
          </ol>
        </section>
      ))}
      {q.data.length >= limit && limit < 500 && (
        <div className="mt-4 text-center"><Button variant="outline" size="sm" loading={q.isFetching} onClick={() => setLimit((l) => l + 100)}>{t('common:actions.loadMore')}</Button></div>
      )}
    </div>
  )
}

function detailLabel(e: AuditEntry, catName: (slug: string) => string | null): string | null {
  const d = e.details
  if (!d) return null
  for (const k of ['business', 'title', 'offer', 'email']) {
    if (typeof d[k] === 'string' && d[k]) return d[k] as string
  }
  // categories are logged by their URL slug — show the category's name instead
  if (typeof d.slug === 'string' && d.slug) return catName(d.slug)
  return null
}
