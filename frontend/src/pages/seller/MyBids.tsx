import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileSignature, MessageSquareQuote } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TendersApi, type BidStatus } from '@/api/tenders'
import { ProductGlyph } from '@/components/market'
import { BidStatusBadge, Countdown, TenderStatusBadge, usePayment } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { formatDate, formatNumber, formatUZS } from '@/lib/format'

const TABS = ['all', 'submitted', 'accepted', 'rejected', 'withdrawn'] as const
type Tab = (typeof TABS)[number]

export default function MyBids() {
  const { t } = useTranslation(['tenders', 'common'])
  const pay = usePayment()
  const [tab, setTab] = React.useState<Tab>('all')
  const list = useQuery({ queryKey: ['tenders', 'my-bids'], queryFn: () => TendersApi.myBids() })
  const rows = (list.data ?? []).filter((r) => tab === 'all' || r.bid.status === (tab as BidStatus))
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: list.data?.length ?? 0 }
    for (const r of list.data ?? []) c[r.bid.status] = (c[r.bid.status] ?? 0) + 1
    return c
  }, [list.data])

  return (
    <div>
      <PageHeader eyebrow={t('myBids.eyebrow')} title={t('nav.myBids')} description={t('myBids.description')}
        actions={<Button asChild><Link to="/app/seller/tenders"><MessageSquareQuote />{t('nav.board')}</Link></Button>} />
      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <Segmented id="bid-tabs" value={tab} onChange={setTab} className="w-max"
          options={TABS.map((s) => ({ value: s, label: <span className="flex items-center gap-1.5">{s === 'all' ? t('mine.all') : t(`bidStatus.${s}`)}{counts[s] ? <span className="font-mono text-[11px] opacity-70">{counts[s]}</span> : null}</span> }))} />
      </div>
      {list.isLoading ? <SkeletonList rows={4} className="[&>div]:h-24" />
        : list.isError ? <ErrorState onRetry={() => list.refetch()} />
          : rows.length === 0 ? (
            <EmptyState icon={<MessageSquareQuote />} title={t('myBids.emptyTitle')} description={t('myBids.emptyHint')}
              action={<Button asChild><Link to="/app/seller/tenders">{t('nav.board')}</Link></Button>} />
          ) : (
            <div className="space-y-3">
              {rows.map(({ bid: b, tender: x }, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                  <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                    <ProductGlyph category={x.category.slug} name={x.title} emoji={x.product?.emoji} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted"><span className="font-mono">{x.number}</span><TenderStatusBadge status={x.status} />
                        {x.status === 'open' && <Countdown to={x.closes_at} className="text-[12px]" />}</div>
                      <Link to={`/app/seller/tenders/${x.id}`} className="mt-0.5 block truncate font-semibold hover:text-brand">{x.title}</Link>
                      <div className="mt-1 text-[13px] text-muted">
                        {formatNumber(x.quantity)} {t(`common:units.${x.unit}`, x.unit)} × {formatUZS(b.unit_price)} · {t('detail.days', { count: b.lead_time_days })} · {pay(b.payment_terms)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <div className="font-mono text-[17px] font-bold">{formatUZS(b.total)}</div>
                      <div className="flex items-center gap-2"><BidStatusBadge status={b.status} /><span className="text-xs text-muted">{formatDate(b.updated_at)}</span></div>
                    </div>
                    {b.status === 'accepted' && x.contract_id
                      ? <Button asChild size="sm"><Link to={`/app/contracts/${x.contract_id}`}><FileSignature />{t('bid.openContract')}</Link></Button>
                      : <Button asChild size="sm" variant="ghost"><Link to={`/app/seller/tenders/${x.id}`}><ArrowRight /></Link></Button>}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
    </div>
  )
}
