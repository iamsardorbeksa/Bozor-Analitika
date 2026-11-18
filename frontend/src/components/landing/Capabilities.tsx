import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Bot, Map as MapIcon, Network, Radar, Scale, Search } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import { ProductGlyph } from '@/components/market'
import { Skeleton } from '@/components/ui/feedback'
import { formatNumber, ln, uz } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pickBySlug, useAllMovers, useOverview } from './data'
import { EASE, Reveal, SectionHead } from './motion'

function Head({ icon: Icon, title, desc, light }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; light?: boolean }) {
  return (
    <div className="max-w-[420px]">
      <span className={cn('mb-4 grid size-9 place-items-center rounded-lg', light ? 'bg-brand text-white shadow-[0_6px_18px_rgba(255,90,31,.3)]' : 'bg-mint text-brand-600')}><Icon className="size-[18px]" /></span>
      <h3 className={cn('text-[19px] font-bold tracking-[-0.025em] text-ink')}>{title}</h3>
      <p className={cn('mt-2 text-[14.5px] leading-relaxed', 'text-muted')}>{desc}</p>
    </div>
  )
}

export function Capabilities() {
  const { t } = useTranslation('landing')
  const card = 'relative overflow-hidden rounded-[24px] border border-white/80 bg-white/[0.78] p-6 shadow-[var(--shadow-card)] backdrop-blur-xl md:p-7'
  return (
    <section id="platform" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="04" eyebrow={t('platform.eyebrow')} title={t('platform.title')} />
        <div className="grid gap-4 md:grid-cols-6">
          <Reveal className={cn(card, 'md:col-span-4')}><Head icon={Search} title={t('platform.search.t')} desc={t('platform.search.d')} /><SearchDemo /></Reveal>
          <Reveal delay={0.06} className={cn(card, 'border-brand/30 bg-gradient-to-br from-mint/95 to-white/80 md:col-span-2')}><Head light icon={Bot} title={t('platform.ai.t')} desc={t('platform.ai.d')} /><AIMini /></Reveal>
          <Reveal className={cn(card, 'md:col-span-2')}><Head icon={Scale} title={t('platform.compare.t')} desc={t('platform.compare.d')} /><CompareStack /></Reveal>
          <Reveal delay={0.06} className={cn(card, 'bg-white/60 md:col-span-2')}><Head icon={Radar} title={t('platform.supply.t')} desc={t('platform.supply.d')} /><SupplyGauge /></Reveal>
          <Reveal delay={0.12} className={cn(card, 'md:col-span-2')}><Head icon={MapIcon} title={t('platform.regional.t')} desc={t('platform.regional.d')} /><RegionBars /></Reveal>
          <Reveal className={cn(card, 'md:col-span-6')}><Network_ /></Reveal>
        </div>
      </div>
    </section>
  )
}

/** Types queries one after another and shows the real top results for each. */
function SearchDemo() {
  const { t } = useTranslation('landing')
  const queries = t('platform.search.queries', { returnObjects: true }) as string[]
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-80px' })
  const reduce = useReducedMotion()
  const [qi, setQi] = React.useState(0)
  const [typed, setTyped] = React.useState(reduce ? queries[0] : '')
  const q = queries[qi % queries.length]
  React.useEffect(() => {
    if (!inView) return
    if (reduce) { setTyped(q); return }
    let n = 0
    setTyped('')
    const typer = setInterval(() => { n++; setTyped(q.slice(0, n)); if (n >= q.length) clearInterval(typer) }, 80)
    const next = setTimeout(() => setQi((x) => x + 1), 4200)
    return () => { clearInterval(typer); clearTimeout(next) }
  }, [qi, inView, q, reduce])
  const done = typed === q
  const res = useQuery({ queryKey: ['landing', 'search', q], queryFn: () => Api.offers({ q, page_size: 3, sort: 'popular' }), staleTime: 120_000, enabled: inView })
  return (
    <div ref={ref} className="mt-6">
      <div className="flex h-12 items-center gap-2.5 rounded-full border-2 border-brand/70 bg-white px-5">
        <Search className="size-4 text-muted" />
        <span className="text-[15px]">{typed}</span><span className="-ml-1.5 h-5 w-px animate-pulse bg-ink" />
        {done && res.data && <span className="ml-auto font-mono text-xs text-muted">{res.data.total}</span>}
      </div>
      <div className="mt-3 grid min-h-[76px] gap-2 sm:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {done && (res.data?.items ?? []).map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.08, ease: EASE }}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5">
              <ProductGlyph emoji={o.product_emoji} category={o.category_slug} name={ln(o, 'product_name')} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium">{ln(o, 'product_name')}</p>
                <p className="font-mono text-[12.5px]">{formatNumber(o.unit_price)} <span className="font-sans text-[10.5px] text-muted">{uz(o.region_name)}</span></p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function AIMini() {
  const { t } = useTranslation('landing')
  const reduce = useReducedMotion()
  return (
    <div className="mt-6 space-y-2.5">
      <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13px] text-white">{t('platform.ai.q')}</div>
      <motion.div initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
        className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2 text-[12.5px] text-ink-soft">
        <span className="flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="size-1.5 rounded-full bg-brand" animate={reduce ? {} : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: 3, delay: i * 0.2 }} />)}</span>
        {t('platform.ai.a')}
      </motion.div>
    </div>
  )
}

function CompareStack() {
  const movers = useAllMovers()
  const potato = pickBySlug(movers.data, 'kartoshka')
  const reduce = useReducedMotion()
  const cmp = useQuery({ queryKey: ['landing', 'compare', potato?.product_id], queryFn: () => Api.compare(potato!.product_id, 1000), enabled: !!potato, staleTime: 120_000 })
  const rows = cmp.data?.rows.slice(0, 3) ?? []
  const max = Math.max(...rows.map((r) => r.total_cost), 1)
  return (
    <div className="mt-6 space-y-3">
      {rows.length ? rows.map((r, i) => (
        <div key={r.offer.id}>
          <div className="mb-1 flex justify-between text-[12px]"><span className="truncate pr-2">{uz(r.offer.business.name)}</span><span className={cn('font-mono', r.is_recommended && 'font-semibold text-good')}>{formatNumber(r.total_cost)}</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div className={r.is_recommended ? 'bg-good' : 'bg-ink/25'} initial={reduce ? false : { width: 0 }} whileInView={{ width: `${(r.subtotal / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.1, ease: EASE }} />
            <motion.div className="bg-brand/70" initial={reduce ? false : { width: 0 }} whileInView={{ width: `${(r.delivery_cost / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.7 + i * 0.1, ease: EASE }} />
          </div>
        </div>
      )) : [0, 1, 2].map((k) => <Skeleton key={k} className="h-7" />)}
    </div>
  )
}

function SupplyGauge() {
  const { t } = useTranslation('landing')
  const movers = useAllMovers()
  const tomato = pickBySlug(movers.data, 'pomidor')
  const reduce = useReducedMotion()
  const sd = useQuery({ queryKey: ['landing', 'sd', tomato?.product_id], queryFn: () => Api.productSupplyDemand(tomato!.product_id), enabled: !!tomato, staleTime: 120_000 })
  const v = sd.data?.estimated.interest_index ?? 0
  const R = 46, C = Math.PI * R
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-white p-3 ring-1 ring-line">
        <p className="font-mono text-[10.5px] tracking-wider text-muted uppercase">{t('platform.supply.observed')}</p>
        <p className="mt-2 font-mono text-[24px] font-bold">{sd.data?.observed.active_offers ?? '—'}</p>
        <p className="text-[11.5px] text-muted">{tomato?.emoji && <span className="emoji mr-1">{tomato.emoji}</span>}{tomato ? ln(tomato, 'name') : ''}</p>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-line">
        <p className="font-mono text-[10.5px] tracking-wider text-muted uppercase">{t('platform.supply.estimated')}</p>
        <svg viewBox="0 0 110 62" className="mt-1 w-full">
          <path d={`M9 56 A${R} ${R} 0 0 1 101 56`} fill="none" stroke="rgba(17,19,23,.08)" strokeWidth="8" strokeLinecap="round" />
          <motion.path d={`M9 56 A${R} ${R} 0 0 1 101 56`} fill="none" stroke="#ff5a1f" strokeWidth="8" strokeLinecap="round" strokeDasharray={C}
            initial={reduce ? false : { strokeDashoffset: C }} whileInView={{ strokeDashoffset: C * (1 - v / 100) }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          <text x="55" y="54" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="16" fontWeight="600" fill="#111317">{Math.round(v)}</text>
        </svg>
      </div>
    </div>
  )
}

function RegionBars() {
  const movers = useAllMovers()
  const tomato = pickBySlug(movers.data, 'pomidor')
  const reduce = useReducedMotion()
  const reg = useQuery({ queryKey: ['landing', 'regional', tomato?.product_id], queryFn: () => Api.productRegional(tomato!.product_id), enabled: !!tomato, staleTime: 120_000 })
  const rows = reg.data ?? []
  const max = Math.max(...rows.map((r) => r.avg ?? 0), 1)
  return (
    <div className="mt-6 space-y-2">
      {rows.length ? rows.slice(0, 5).map((r, i) => (
        <div key={r.region_id} className="grid grid-cols-[84px_1fr_64px] items-center gap-2 text-[12px]">
          <span className="truncate text-muted">{ln(r, 'region_name')}</span>
          <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div className={i === 0 ? 'h-full bg-brand' : 'h-full bg-ink/20'} initial={reduce ? false : { width: 0 }} whileInView={{ width: `${((r.avg ?? 0) / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }} />
          </div>
          <span className="text-right font-mono">{formatNumber(r.avg)}</span>
        </div>
      )) : [0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-4" />)}
    </div>
  )
}

function Network_() {
  const { t } = useTranslation('landing')
  const overview = useOverview()
  const reduce = useReducedMotion()
  const verified = useQuery({ queryKey: ['landing', 'verified-offers'], queryFn: () => Api.offers({ verified_only: true, page_size: 60, sort: 'popular' }), staleTime: 120_000 })
  const bizs = React.useMemo(() => {
    const seen = new Map<string, NonNullable<typeof verified.data>['items'][number]['business']>()
    for (const o of verified.data?.items ?? []) if (!seen.has(o.business.id)) seen.set(o.business.id, o.business)
    return [...seen.values()].slice(0, 14)
  }, [verified.data])
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
      <div>
        <Head light icon={Network} title={t('platform.network.t')} desc={t('platform.network.d')} />
        <div className="mt-6 flex gap-8">
          <div><p className="font-mono text-[32px] font-bold text-ink">{overview.data?.active_suppliers ?? '—'}</p><p className="text-xs text-muted">{t('platform.network.suppliers')}</p></div>
          <div><p className="font-mono text-[32px] font-bold text-good">{verified.data ? verified.data.total : '—'}</p><p className="text-xs text-muted">{t('platform.network.verifiedOffers')}</p></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {bizs.map((b, i) => (
          <motion.div key={b.id} initial={reduce ? false : { opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04, ease: EASE }}
            className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pr-3 pl-1.5 text-[12.5px] text-ink-soft">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-[10.5px] font-semibold text-white">{b.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</span>
            {uz(b.name)}<BadgeCheck className="size-3.5 fill-good text-white" /><span className="font-mono text-[11px] text-muted">★{b.rating.toFixed(1)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
