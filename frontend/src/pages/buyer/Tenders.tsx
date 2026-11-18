import { useQuery } from '@tanstack/react-query'
import { FileSignature, Megaphone, Plus } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TendersApi, type TenderStatus } from '@/api/tenders'
import { TenderCard } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { PageHeader, Segmented, StatCard } from '@/components/ui/layout'

const TABS = ['all', 'open', 'awarded', 'contracted', 'expired', 'closed'] as const
type Tab = (typeof TABS)[number]

export default function Tenders() {
  const { t } = useTranslation(['tenders', 'common'])
  const [tab, setTab] = React.useState<Tab>('all')
  const list = useQuery({ queryKey: ['tenders', 'mine'], queryFn: () => TendersApi.mine() })
  const summary = useQuery({ queryKey: ['tenders', 'summary'], queryFn: TendersApi.summary })
  const items = (list.data ?? []).filter((x) => tab === 'all' || x.status === (tab as TenderStatus))
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: list.data?.length ?? 0 }
    for (const x of list.data ?? []) c[x.status] = (c[x.status] ?? 0) + 1
    return c
  }, [list.data])

  return (
    <div>
      <PageHeader eyebrow={t('mine.eyebrow')} title={t('nav.myTenders')} description={t('mine.description')}
        actions={<>
          <Button asChild variant="outline"><Link to="/app/contracts"><FileSignature />{t('nav.contracts')}</Link></Button>
          <Button asChild><Link to="/app/tenders/new"><Plus />{t('nav.newTender')}</Link></Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('mine.statOpen')} value={summary.data?.open ?? '—'} tone="brand" />
        <StatCard label={t('mine.statToChoose')} value={summary.data?.awaiting_choice ?? '—'} hint={t('mine.statToChooseHint')} delay={0.05} />
        <StatCard label={t('mine.statAwaiting')} value={summary.data?.contracts_awaiting ?? '—'} delay={0.1} />
        <StatCard label={t('mine.statSigned')} value={summary.data?.contracts_signed ?? '—'} tone="dark" delay={0.15} />
      </div>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <Segmented id="tender-tabs" value={tab} onChange={setTab} className="w-max"
          options={TABS.map((s) => ({
            value: s,
            label: <span className="flex items-center gap-1.5">{s === 'all' ? t('mine.all') : t(`status.${s}`)}
              {counts[s] ? <span className="font-mono text-[11px] opacity-70">{counts[s]}</span> : null}</span>,
          }))} />
      </div>

      {list.isLoading ? <SkeletonList rows={3} className="[&>div]:h-44" />
        : list.isError ? <ErrorState onRetry={() => list.refetch()} />
          : items.length === 0 ? (
            <EmptyState icon={<Megaphone />} title={tab === 'all' ? t('mine.emptyTitle') : t('mine.emptyTab')} description={t('mine.emptyHint')}
              action={<Button asChild><Link to="/app/tenders/new"><Plus />{t('nav.newTender')}</Link></Button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((x, i) => <TenderCard key={x.id} tender={x} index={i} to={`/app/tenders/${x.id}`} showBuyer={false} />)}
            </div>
          )}
    </div>
  )
}
