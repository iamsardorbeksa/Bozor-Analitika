import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck, ChevronRight, ClipboardList, Info, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { Notification } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { formatDate, timeAgo, uz } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const KINDS = ['price_alert', 'request', 'verification', 'system'] as const
type Kind = (typeof KINDS)[number]

const KIND_STYLE: Record<Kind, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  price_alert: { icon: BellRing, cls: 'bg-saffron-50 text-[#8a4a00]' },
  request: { icon: ClipboardList, cls: 'bg-mint text-brand' },
  verification: { icon: ShieldCheck, cls: 'bg-[#e8ecfb] text-[#3b5bdb]' },
  system: { icon: Info, cls: 'bg-ink/[0.06] text-ink-soft' },
}
const kindOf = (k: string): Kind => ((KINDS as readonly string[]).includes(k) ? (k as Kind) : 'system')

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function Notifications(_props: { basePath?: string }) {
  const { t } = useTranslation(['account', 'common'])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [show, setShow] = React.useState<'all' | 'unread'>('all')
  const [kind, setKind] = React.useState<Kind | 'any'>('any')

  const list = useQuery({ queryKey: ['notifications', 'page', show], queryFn: () => Api.notifications(show === 'unread') })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] })

  const markRead = useMutation({ mutationFn: (id: string) => Api.markRead(id), onSuccess: invalidate })
  const markAll = useMutation({
    mutationFn: Api.markAllRead,
    onSuccess: () => { toast.success(t('notifications.allRead')); void invalidate() },
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
  })

  const open = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  const items = React.useMemo(() => (list.data ?? []).filter((n) => kind === 'any' || kindOf(n.kind) === kind), [list.data, kind])
  const unread = (list.data ?? []).filter((n) => !n.is_read).length
  const counts = React.useMemo(() => {
    const c: Record<string, number> = {}
    for (const n of list.data ?? []) c[kindOf(n.kind)] = (c[kindOf(n.kind)] ?? 0) + 1
    return c
  }, [list.data])

  const groups = React.useMemo(() => {
    const out: { key: string; label: string; items: Notification[] }[] = []
    const today = dayKey(new Date().toISOString())
    const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString())
    for (const n of items) {
      const k = dayKey(n.created_at)
      let g = out.find((x) => x.key === k)
      if (!g) {
        g = { key: k, label: k === today ? t('notifications.today') : k === yesterday ? t('notifications.yesterday') : formatDate(n.created_at), items: [] }
        out.push(g)
      }
      g.items.push(n)
    }
    return out
  }, [items, t])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={unread === 0 && show === 'all'}>
            <CheckCheck />{t('common:actions.markAllRead')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Segmented id="notif-show" value={show} onChange={setShow} className="w-fit"
          options={[{ value: 'all', label: t('notifications.all') }, { value: 'unread', label: <>{t('notifications.unread')}{unread > 0 && show === 'all' ? <span className="ml-1.5 font-mono text-[11px] opacity-70">{unread}</span> : null}</> }]} />
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin sm:pb-0">
          {(['any', ...KINDS] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
              className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                kind === k ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong')}>
              {k !== 'any' && React.createElement(KIND_STYLE[k].icon, { className: 'size-3.5' })}
              {t(`notifications.kinds.${k}`)}
              {k !== 'any' && counts[k] ? <span className="font-mono opacity-60">{counts[k]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <QueryState query={list}
        skeleton={<div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full" />)}</div>}
        isEmpty={() => items.length === 0}
        empty={<EmptyState icon={<Bell />} title={show === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty')} description={t('notifications.emptyHint')} />}>
        {() => (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="mb-2 px-1 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{g.label}</h2>
                <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white/[0.78] backdrop-blur-xl shadow-[var(--shadow-card)]">
                  <AnimatePresence initial={false}>
                    {g.items.map((n, i) => {
                      const ks = KIND_STYLE[kindOf(n.kind)]
                      return (
                        <motion.button key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 8) * 0.02 }}
                          onClick={() => open(n)}
                          className={cn('group flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-mint-50/50',
                            !n.is_read && 'bg-mint-50/40')}>
                          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', ks.cls)}><ks.icon className="size-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <p className={cn('flex-1 text-[14px] leading-snug', n.is_read ? 'text-ink-soft' : 'font-semibold text-ink')}>{uz(n.title)}</p>
                              {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label={t('notifications.unread')} />}
                            </div>
                            <p className="mt-0.5 text-[13px] leading-snug text-muted">{uz(n.body)}</p>
                            <p className="mt-1 text-[11.5px] text-muted" title={formatDate(n.created_at, true)}>
                              {t(`notifications.kinds.${kindOf(n.kind)}`)} · {timeAgo(n.created_at)}
                            </p>
                          </div>
                          {n.link && <ChevronRight className="mt-2 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
