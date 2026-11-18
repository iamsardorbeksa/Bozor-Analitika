import { useQuery } from '@tanstack/react-query'
import {
  Activity, ArrowRight, BadgeCheck, Flag, FileText, SearchX, ShieldCheck, ShoppingBag, Store, Tag, UserCheck, Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Api } from '@/api/endpoints'
import type { AdminDashboard } from '@/api/types'
import { CHART, ChartTooltip, axisProps } from '@/components/charts/theme'
import { Money, PriceChange, Sparkline, catStyle, ProductSymbol } from '@/components/market'
import { DemandGaps, SignupsChart } from '@/components/admin/charts'
import { BarList, Panel } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { AnimatedNumber, PageHeader, StatCard } from '@/components/ui/layout'
import { ln } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function AdminOverview() {
  const { t } = useTranslation(['admin', 'common'])
  const q = useQuery({ queryKey: ['admin-dashboard'], queryFn: Api.adminDashboard })
  const header = <PageHeader eyebrow={t('overview.eyebrow')} title={t('overview.title')} description={t('overview.subtitle')} />
  if (q.isLoading) return (
    <div>{header}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[106px] rounded-2xl" />)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
    </div>
  )
  if (q.isError || !q.data) return <div>{header}<ErrorState onRetry={() => q.refetch()} /></div>
  const d = q.data
  const k = d.kpis

  return (
    <div>
      {header}
      <QueueStrip d={d} />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard delay={0.02} label={t('kpi.totalUsers')} icon={<Users />} value={<AnimatedNumber value={k.total_users} />} hint={t('kpi.usersSplit', { buyers: k.buyers, sellers: k.sellers })} />
        <StatCard delay={0.05} label={t('kpi.activeBuyers')} icon={<ShoppingBag />} value={<AnimatedNumber value={k.active_buyers} />} />
        <StatCard delay={0.08} label={t('kpi.activeSellers')} icon={<Store />} value={<AnimatedNumber value={k.active_sellers} />} />
        <StatCard delay={0.11} tone="brand" label={t('kpi.verifiedSellers')} icon={<BadgeCheck />} value={<AnimatedNumber value={k.verified_sellers} />}
          hint={k.sellers ? t('kpi.ofSellers', { pct: Math.round((k.verified_sellers / k.sellers) * 100) }) : undefined} />
        <StatCard delay={0.14} tone={k.pending_verifications ? 'saffron' : 'default'} label={t('kpi.pendingVerifications')} icon={<ShieldCheck />} value={<AnimatedNumber value={k.pending_verifications} />} />
        <StatCard delay={0.17} label={t('kpi.totalOffers')} icon={<Tag />} value={<AnimatedNumber value={k.total_offers} />} hint={t('kpi.activeOffers', { n: k.active_offers })} />
        <StatCard delay={0.2} label={t('kpi.requests')} icon={<FileText />} value={<AnimatedNumber value={k.purchase_requests} />} />
        <StatCard delay={0.23} tone={k.open_reports ? 'dark' : 'default'} label={t('kpi.openReports')} icon={<Flag />} value={<AnimatedNumber value={k.open_reports} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel i={2} title={t('overview.byCategory')} description={t('overview.byCategoryHint')}>
          {d.by_category.length === 0 ? <EmptyState className="py-10" /> : <CategoryBars rows={d.by_category} />}
        </Panel>
        <Panel i={3} title={t('overview.byRegion')} description={t('overview.byRegionHint')}>
          {d.by_region.length === 0 ? <EmptyState className="py-10" /> : (
            <BarList rows={[...d.by_region].sort((a, b) => b.offers - a.offers).map((r) => ({
              key: r.code, label: ln(r, 'name'), value: r.offers, sub: <>· {t('overview.views', { n: r.views })}</>,
            }))} />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel i={4} className="lg:col-span-2" title={t('overview.signups')} description={t('overview.signupsHint')}>
          <SignupsChart data={d.signups} />
        </Panel>
        <Panel i={5} title={t('overview.spikes')} description={t('overview.spikesHint')}
          actions={<Button variant="ghost" size="sm" asChild><Link to="/app/admin/prices">{t('common:actions.viewAll')} <ArrowRight /></Link></Button>}>
          {d.spikes.length === 0 ? <EmptyState icon={<Activity />} title={t('overview.noSpikes')} className="py-8" /> : (
            <ul className="divide-y divide-line">
              {d.spikes.slice(0, 6).map((m) => (
                <li key={m.product_id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium"><ProductSymbol emoji={m.emoji} size={17} /><span className="truncate">{ln(m, 'name')}</span></p>
                    <Money value={m.current_avg} unit={m.unit} className="font-mono text-xs text-muted" />
                  </div>
                  <Sparkline data={m.spark} width={64} height={22} />
                  <PriceChange value={m.change_pct} className="w-16 justify-end text-[13px]" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel i={6} className="mt-4" title={t('overview.demandGaps')} description={t('overview.demandGapsHint')}>
        {d.demand_gaps.length === 0 ? <EmptyState icon={<SearchX />} title={t('overview.noGaps')} className="py-8" /> : <DemandGaps gaps={d.demand_gaps} />}
      </Panel>
    </div>
  )
}

function QueueStrip({ d }: { d: AdminDashboard }) {
  const { t } = useTranslation('admin')
  const items = [
    { to: '/app/admin/verifications', icon: ShieldCheck, label: t('queues.verifications'), n: d.kpis.pending_verifications },
    { to: '/app/admin/reports', icon: Flag, label: t('queues.reports'), n: d.kpis.open_reports },
    { to: '/app/admin/offers?flagged=1', icon: Store, label: t('queues.flagged'), n: null },
    { to: '/app/admin/users', icon: UserCheck, label: t('queues.users'), n: null },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map(({ to, icon: Icon, label, n }) => (
        <Link key={to} to={to}
          className={cn('group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
            n ? 'border-[#f0d7b6] bg-saffron-50 hover:bg-[#f8e6cf]' : 'border-line bg-white hover:bg-mint-50')}>
          <Icon className={cn('size-4 shrink-0', n ? 'text-[#8a4a00]' : 'text-brand')} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
          {n != null && <span className={cn('rounded-md px-1.5 font-mono text-[12px] font-semibold', n ? 'bg-saffron text-forest-900' : 'bg-mint text-brand')}>{n}</span>}
          <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  )
}

function CategoryBars({ rows }: { rows: AdminDashboard['by_category'] }) {
  const { t } = useTranslation('admin')
  const data = [...rows].sort((a, b) => b.offers - a.offers).map((r) => ({ name: ln(r, 'name'), offers: r.offers, slug: r.slug }))
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="name" {...axisProps} width={110} />
          <RTooltip content={<ChartTooltip />} cursor={{ fill: '#fff4ee' }} />
          <Bar dataKey="offers" name={t('overview.offers')} radius={[0, 5, 5, 0]} barSize={16}>
            {data.map((r) => <Cell key={r.slug} fill={catStyle(r.slug).accent} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

