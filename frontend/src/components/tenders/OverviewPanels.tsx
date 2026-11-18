/* Dashboard panels for the request -> offer -> contract flow (buyer and producer overviews). */
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileSignature, Megaphone, MessageSquareQuote, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TendersApi, type Tender } from '@/api/tenders'
import { ProductGlyph } from '@/components/market'
import { Countdown, TenderStatusBadge } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'

function Shell({ title, body, stats, actions, list, empty, to }: {
  title: string; body: string; stats: [string, number | undefined][]; actions: React.ReactNode
  list: Tender[] | undefined; empty: string; to: (x: Tender) => string
}) {
  const { t } = useTranslation(['tenders', 'common'])
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mb-6 grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-white/[0.85] shadow-[var(--shadow-card)] backdrop-blur-xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="relative overflow-hidden bg-ink p-6 text-white">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-brand/30 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-white/60 uppercase"><Megaphone className="size-3.5" />{t('overview.eyebrow')}</div>
          <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-white/70">{body}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.08] px-3 py-2.5">
                <div className="font-mono text-[22px] leading-none font-bold">{v ?? '—'}</div>
                <div className="mt-1 text-[11px] leading-tight text-white/60">{k}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
      <div className="p-4">
        {!list?.length ? (
          <div className="grid h-full place-items-center p-6 text-center text-[13.5px] text-muted">{empty}</div>
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 4).map((x) => (
              <li key={x.id}>
                <Link to={to(x)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink/[0.03]">
                  <ProductGlyph category={x.category.slug} name={x.title} emoji={x.product?.emoji} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{x.title}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{formatNumber(x.quantity)} {t(`common:units.${x.unit}`, x.unit)}</span>
                      <span>· {t('card.bids', { count: x.bids_count })}</span>
                      {x.status === 'open' && <Countdown to={x.closes_at} className="text-xs" />}
                    </div>
                  </div>
                  <TenderStatusBadge status={x.status} className="hidden sm:inline-flex" />
                  <ArrowRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  )
}

export function BuyerTenderPanel() {
  const { t } = useTranslation('tenders')
  const s = useQuery({ queryKey: ['tenders', 'summary'], queryFn: TendersApi.summary })
  const mine = useQuery({ queryKey: ['tenders', 'mine'], queryFn: () => TendersApi.mine() })
  return (
    <Shell title={t('overview.buyerTitle')} body={t('overview.buyerBody')} to={(x) => `/app/tenders/${x.id}`}
      stats={[[t('mine.statOpen'), s.data?.open], [t('overview.newBids'), s.data?.bids], [t('mine.statSigned'), s.data?.contracts_signed]]}
      list={mine.data?.filter((x) => x.status === 'open' || x.status === 'expired' || x.status === 'awarded')} empty={t('overview.buyerEmpty')}
      actions={<>
        <Button asChild variant="accent"><Link to="/app/tenders/new"><Plus />{t('nav.newTender')}</Link></Button>
        <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Link to="/app/tenders">{t('nav.myTenders')}</Link></Button>
      </>} />
  )
}

export function SellerTenderPanel() {
  const { t } = useTranslation('tenders')
  const s = useQuery({ queryKey: ['tenders', 'summary'], queryFn: TendersApi.summary })
  const board = useQuery({ queryKey: ['tenders', 'board', 'overview'], queryFn: () => TendersApi.board({ matching: true, hide_mine: true, sort: 'closing_soon', page_size: 4 }) })
  return (
    <Shell title={t('overview.sellerTitle')} body={t('overview.sellerBody')} to={(x) => `/app/seller/tenders/${x.id}`}
      stats={[[t('board.statMatching'), s.data?.open_matching], [t('board.statMyBids'), s.data?.my_bids], [t('board.statToSign'), s.data?.to_sign]]}
      list={board.data?.items} empty={t('overview.sellerEmpty')}
      actions={<>
        <Button asChild variant="accent"><Link to="/app/seller/tenders"><MessageSquareQuote />{t('nav.board')}</Link></Button>
        {(s.data?.to_sign ?? 0) > 0
          ? <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Link to="/app/contracts"><FileSignature />{t('nav.contracts')}</Link></Button>
          : <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Link to="/app/seller/bids">{t('nav.myBids')}</Link></Button>}
      </>} />
  )
}
