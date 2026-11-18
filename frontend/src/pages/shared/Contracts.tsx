import { useQuery } from '@tanstack/react-query'
import { ChevronRight, FileSignature, PenLine } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TendersApi, type Contract, type ContractStatus } from '@/api/tenders'
import { Badge } from '@/components/market'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { formatDate, formatUZS } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS = ['all', 'awaiting_seller', 'signed', 'declined', 'cancelled'] as const
type Tab = (typeof TABS)[number]

export const CONTRACT_TONE: Record<ContractStatus, 'saffron' | 'good' | 'danger' | 'neutral'> = {
  awaiting_seller: 'saffron', signed: 'good', declined: 'danger', cancelled: 'neutral',
}

export function ContractStatusBadge({ status, className }: { status: ContractStatus; className?: string }) {
  const { t } = useTranslation('contract')
  return <Badge tone={CONTRACT_TONE[status]} className={className}><span className="size-1.5 rounded-full bg-current opacity-70" />{t(`status.${status}`)}</Badge>
}

export default function Contracts() {
  const { t } = useTranslation('contract')
  const [tab, setTab] = React.useState<Tab>('all')
  const q = useQuery({ queryKey: ['contracts'], queryFn: () => TendersApi.contracts() })
  const all = q.data ?? []
  const role = all[0]?.my_role
  const rows = tab === 'all' ? all : all.filter((c) => c.status === tab)
  const counts = React.useMemo(() => {
    const m: Record<string, number> = { all: all.length }
    for (const c of all) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [all])

  return (
    <div>
      <PageHeader title={t('list.title')} description={t('list.description')} />
      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <Segmented id="contract-tabs" value={tab} onChange={setTab} className="w-max"
          options={TABS.map((s) => ({
            value: s,
            label: <span className="flex items-center gap-1.5">{s === 'all' ? t('list.all') : t(`status.${s}`)}
              {counts[s] ? <span className="font-mono text-[11px] opacity-70">{counts[s]}</span> : null}</span>,
          }))} />
      </div>

      {q.isLoading ? <SkeletonList rows={3} className="[&>div]:h-24" />
        : q.isError ? <ErrorState onRetry={() => q.refetch()} />
          : rows.length === 0 ? (
            <EmptyState icon={<FileSignature />} title={t('list.empty')}
              description={role === 'seller' ? t('list.emptyHintSeller') : t('list.emptyHintBuyer')} />
          ) : (
            <div className="space-y-3">
              {rows.map((c, i) => <ContractRow key={c.id} c={c} index={i} />)}
            </div>
          )}
    </div>
  )
}

function ContractRow({ c, index }: { c: Contract; index: number }) {
  const { t } = useTranslation('contract')
  const mine = c.status === 'awaiting_seller' && c.my_role === 'seller'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }}>
      <Link to={`/app/contracts/${c.id}`} className="block">
        <Card className={cn('flex flex-col gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center', mine && 'border-brand/50 ring-2 ring-brand/15')}>
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft">
            {mine ? <PenLine className="size-5 text-brand" /> : <FileSignature className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] font-semibold">№ {c.number}</span>
              <ContractStatusBadge status={c.status} />
              {mine && <Badge tone="brand">{t('list.awaitingYou')}</Badge>}
            </div>
            <div className="mt-1 truncate font-semibold tracking-[-0.01em]">{c.tender_title}</div>
            <div className="mt-0.5 truncate text-[13px] text-muted">{t('list.with')}: {c.counterparty} · {t('list.request')} {c.tender_number} · {formatDate(c.created_at)}</div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
            <div className="text-[11.5px] text-muted">{t('list.total')}</div>
            <div className="font-mono text-[17px] font-bold tracking-[-0.02em]">{formatUZS(c.total_amount)}</div>
          </div>
          <ChevronRight className="hidden size-5 text-muted sm:block" />
        </Card>
      </Link>
    </motion.div>
  )
}
