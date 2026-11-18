import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import type { Mover, SupplyDemandRow } from '@/api/types'
import { Badge, Money, PriceChange, Sparkline, ProductSymbol } from '@/components/market'
import { EstimateNote, InterestMeter, Panel, SignalBadge, SupplyLevel } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { PageHeader, Segmented, StatCard } from '@/components/ui/layout'
import { formatNumber, ln } from '@/lib/format'

const SPIKE = 8

export default function PriceMonitoring() {
  const { t } = useTranslation(['admin', 'seller', 'common'])
  const q = useQuery({ queryKey: ['admin-prices'], queryFn: Api.adminPriceMonitoring })
  const header = <PageHeader eyebrow={t('prices.eyebrow')} title={t('prices.title')} description={t('prices.subtitle')}
    actions={<Button variant="outline" onClick={() => q.refetch()} loading={q.isFetching && !q.isLoading}><RefreshCw /> {t('common:actions.refresh')}</Button>} />
  if (q.isLoading) return <div>{header}<div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[106px] rounded-2xl" />)}</div><Skeleton className="mt-4 h-96 rounded-2xl" /></div>
  if (q.isError || !q.data) return <div>{header}<ErrorState onRetry={() => q.refetch()} /></div>
  const { movers, spikes, supply } = q.data
  const up = movers.filter((m) => m.change_pct > 0.05).length
  const down = movers.filter((m) => m.change_pct < -0.05).length

  return (
    <div>
      {header}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard delay={0.02} tone={spikes.length ? 'saffron' : 'default'} label={t('prices.kpi.spikes', { pct: SPIKE })} icon={<AlertTriangle />} value={spikes.length} />
        <StatCard delay={0.06} label={t('prices.kpi.rising')} icon={<TrendingUp />} value={up} />
        <StatCard delay={0.1} label={t('prices.kpi.falling')} icon={<TrendingDown />} value={down} />
      </div>

      {spikes.length > 0 && (
        <Panel i={1} className="mt-4 border-[#f0d7b6]" title={t('prices.spikesTitle')} description={t('prices.spikesHint', { pct: SPIKE })}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {spikes.map((m) => (
              <div key={m.product_id} className="flex items-center gap-3 rounded-xl border border-[#f0d7b6] bg-saffron-50/60 px-3 py-2.5">
                <AlertTriangle className="size-4 shrink-0 text-saffron" />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium"><ProductSymbol emoji={m.emoji} size={17} /><span className="truncate">{ln(m, 'name')}</span></p>
                  <p className="font-mono text-xs text-muted">{formatNumber(m.previous_avg)} → {formatNumber(m.current_avg)}</p>
                </div>
                <Sparkline data={m.spark} width={56} height={22} />
                <PriceChange value={m.change_pct} className="text-[13px]" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel i={2} className="mt-4" title={t('prices.moversTitle')} description={t('prices.moversHint')} bodyClassName="px-0 pb-0">
        {movers.length === 0 ? <div className="px-5 pb-5"><EmptyState icon={<Activity />} /></div> : <MoversTable rows={movers} />}
      </Panel>

      <Panel i={3} className="mt-4" title={t('prices.supplyTitle')} description={t('prices.supplyHint')} bodyClassName="px-0 pb-0">
        <div className="px-5"><EstimateNote className="mb-3" /></div>
        {supply.length === 0 ? <div className="px-5 pb-5"><EmptyState /></div> : <SupplyTable rows={supply} />}
      </Panel>
    </div>
  )
}

function MoversTable({ rows }: { rows: Mover[] }) {
  const { t } = useTranslation(['admin', 'common'])
  const [dir, setDir] = React.useState<'all' | 'up' | 'down'>('all')
  const shown = rows.filter((m) => dir === 'all' || (dir === 'up' ? m.change_pct > 0 : m.change_pct < 0))
  const columns: Column<Mover>[] = [
    { key: 'name', header: t('common:fields.product'), sortValue: (m) => ln(m, 'name'),
      cell: (m) => <div className="flex items-center gap-2"><ProductSymbol emoji={m.emoji} size={18} /><span className="font-medium">{ln(m, 'name')}</span>{Math.abs(m.change_pct) >= SPIKE && <Badge tone="saffron"><AlertTriangle /> {t('prices.spike')}</Badge>}</div> },
    { key: 'prev', header: t('prices.col.previous'), align: 'right', sortValue: (m) => m.previous_avg, cell: (m) => <span className="font-mono text-muted">{formatNumber(m.previous_avg)}</span> },
    { key: 'cur', header: t('prices.col.current'), align: 'right', sortValue: (m) => m.current_avg, cell: (m) => <Money value={m.current_avg} unit={m.unit} className="font-mono font-medium" /> },
    { key: 'spark', header: t('prices.col.trend'), align: 'center', cell: (m) => <Sparkline data={m.spark} width={88} height={24} className="mx-auto" /> },
    { key: 'chg', header: t('prices.col.change'), align: 'right', sortValue: (m) => m.change_pct, cell: (m) => <PriceChange value={m.change_pct} /> },
  ]
  return (
    <div>
      <div className="mb-2 px-5">
        <Segmented id="pm-dir" size="sm" value={dir} onChange={setDir} options={[
          { value: 'all', label: t('offers.all') }, { value: 'up', label: t('prices.kpi.rising') }, { value: 'down', label: t('prices.kpi.falling') },
        ]} />
      </div>
      <DataTable dense columns={columns} rows={shown} rowKey={(m) => m.product_id} initialSort={{ key: 'chg', dir: 'desc' }}
        rowClassName={(m) => (Math.abs(m.change_pct) >= SPIKE ? 'bg-saffron-50/60' : undefined)} />
    </div>
  )
}

function SupplyTable({ rows }: { rows: SupplyDemandRow[] }) {
  const { t } = useTranslation(['admin', 'seller', 'common'])
  const columns: Column<SupplyDemandRow>[] = [
    { key: 'name', header: t('common:fields.product'), sortValue: (r) => ln(r, 'name'), cell: (r) => <span className="flex items-center gap-2 font-medium"><ProductSymbol emoji={r.emoji} size={18} />{ln(r, 'name')}</span> },
    { key: 'offers', header: t('seller:sd.activeOffers'), align: 'right', sortValue: (r) => r.observed.active_offers, cell: (r) => <span className="font-mono">{r.observed.active_offers}</span> },
    { key: 'qty', header: t('seller:sd.totalQty'), align: 'right', sortValue: (r) => r.observed.total_available_qty, cell: (r) => <span className="font-mono">{formatNumber(r.observed.total_available_qty)}</span> },
    { key: 'searches', header: t('seller:sd.searches'), align: 'right', sortValue: (r) => r.observed.searches, cell: (r) => <span className="font-mono">{r.observed.searches}</span> },
    { key: 'inq', header: t('seller:sd.inquiries'), align: 'right', sortValue: (r) => r.observed.purchase_inquiries, cell: (r) => <span className="font-mono">{r.observed.purchase_inquiries}</span> },
    { key: 'interest', header: <span className="text-[#8a4a00]">{t('seller:estimate.interest')} *</span>, sortValue: (r) => r.estimated.interest_index,
      headerClassName: 'bg-saffron-50/70', className: 'bg-saffron-50/30', cell: (r) => <InterestMeter value={r.estimated.interest_index} className="min-w-[120px]" /> },
    { key: 'supply', header: <span className="text-[#8a4a00]">{t('seller:estimate.supply')} *</span>, headerClassName: 'bg-saffron-50/70', className: 'bg-saffron-50/30',
      sortValue: (r) => ({ none: 0, low: 1, medium: 2, high: 3 })[r.estimated.supply_level], cell: (r) => <SupplyLevel level={r.estimated.supply_level} /> },
    { key: 'signal', header: <span className="text-[#8a4a00]">{t('seller:estimate.signal')} *</span>, headerClassName: 'bg-saffron-50/70', className: 'bg-saffron-50/30',
      sortValue: (r) => r.estimated.signal, cell: (r) => <SignalBadge signal={r.estimated.signal} /> },
  ]
  return <DataTable dense columns={columns} rows={rows} rowKey={(r) => r.product_id} initialSort={{ key: 'interest', dir: 'desc' }} />
}
