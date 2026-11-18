import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Search, Send } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import { PriceChange, ProductGlyph } from '@/components/market'
import { Skeleton } from '@/components/ui/feedback'
import { formatNumber, formatPct, ln, uz } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pickBySlug, useAllMovers, useHistory } from './data'
import { DrawChart, EASE, SectionHead, useIsMobile } from './motion'

function useStoryData() {
  const movers = useAllMovers()
  const tomato = pickBySlug(movers.data, 'pomidor')
  const potato = pickBySlug(movers.data, 'kartoshka')
  const search = useQuery({ queryKey: ['landing', 'search', 'pomidor'], queryFn: () => Api.offers({ q: 'pomidor', page_size: 4, sort: 'price_asc' }), staleTime: 120_000 })
  const compare = useQuery({ queryKey: ['landing', 'compare', potato?.product_id], queryFn: () => Api.compare(potato!.product_id, 1000), enabled: !!potato, staleTime: 120_000 })
  const hist = useHistory(tomato?.product_id, 30)
  const sd = useQuery({ queryKey: ['landing', 'sd', tomato?.product_id], queryFn: () => Api.productSupplyDemand(tomato!.product_id), enabled: !!tomato, staleTime: 120_000 })
  const regional = useQuery({ queryKey: ['landing', 'regional', tomato?.product_id], queryFn: () => Api.productRegional(tomato!.product_id), enabled: !!tomato, staleTime: 120_000 })
  return { tomato, potato, search, compare, hist, sd, regional }
}

export function HowItWorks() {
  const { t } = useTranslation('landing')
  const steps = t('how.steps', { returnObjects: true }) as { t: string; d: string }[]
  const [active, setActive] = React.useState(0)
  const mobile = useIsMobile(1024)
  const data = useStoryData()

  return (
    <section id="how" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="03" eyebrow={t('how.eyebrow')} title={t('how.title')} />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="relative">
            {!mobile && (
              <div className="absolute top-2 bottom-2 left-[19px] w-px bg-line-strong" aria-hidden>
                <motion.div className="w-px origin-top bg-brand" style={{ height: '100%' }} animate={{ scaleY: (active + 1) / steps.length }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
            )}
            {steps.map((s, i) => (
              <Step key={i} i={i} step={s} active={active === i} onActive={() => setActive(i)} mobile={mobile}>
                {mobile && <div className="mt-5"><Viz i={i} data={data} /></div>}
              </Step>
            ))}
          </div>
          {!mobile && (
            <div className="sticky top-28 h-fit">
              <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.8] p-6 shadow-[var(--shadow-lift)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                  {steps.map((s, i) => (
                    <span key={i} className={cn('rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors', i === active ? 'bg-ink text-white' : 'bg-ink/5 text-muted')}>0{i + 1} {s.t}</span>
                  ))}
                </div>
                <div className="min-h-[340px]">
                  <AnimatePresence mode="wait">
                    <motion.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: EASE }}>
                      <Viz i={active} data={data} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Step({ i, step, active, onActive, mobile, children }: { i: number; step: { t: string; d: string }; active: boolean; onActive: () => void; mobile: boolean; children?: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  React.useEffect(() => { if (inView) onActive() }, [inView, onActive])
  return (
    <div ref={ref} className={cn('relative flex gap-6', mobile ? 'pb-14' : 'min-h-[52vh] items-start pt-2')}>
      <span className={cn('relative z-10 grid size-10 shrink-0 place-items-center rounded-full border font-mono text-[13px] transition-colors duration-300',
        active || mobile ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white/80 text-muted')}>0{i + 1}</span>
      <div className={cn('min-w-0 flex-1 transition-opacity duration-300', active || mobile ? 'opacity-100' : 'opacity-40')}>
        <h3 className="text-[28px] leading-tight font-extrabold tracking-[-0.035em] md:text-[34px]">{step.t}</h3>
        <p className="mt-3 max-w-[420px] text-[16px] leading-relaxed text-muted">{step.d}</p>
        {children}
      </div>
    </div>
  )
}

function Viz({ i, data }: { i: number; data: ReturnType<typeof useStoryData> }) {
  const { t } = useTranslation(['landing', 'common'])
  const reduce = useReducedMotion()
  if (i === 0) {
    const items = data.search.data?.items ?? []
    return (
      <div>
        <div className="mb-4 flex h-11 items-center gap-2 rounded-full border-2 border-brand bg-white px-4 shadow-[0_0_0_4px_rgba(255,90,31,.12)]">
          <Search className="size-4 text-muted" /><span className="text-sm">pomidor</span><span className="h-4 w-px animate-pulse bg-ink" />
        </div>
        <p className="mb-2 text-xs text-muted">{t('how.viz.results', { count: data.search.data?.total ?? 0 })}</p>
        <div className="space-y-2">
          {items.length ? items.map((o, k) => (
            <motion.div key={o.id} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.08 }}
              className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <ProductGlyph emoji={o.product_emoji} category={o.category_slug} name={ln(o, 'product_name')} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{uz(o.title)}</p>
                <p className="flex items-center gap-1 truncate text-[11.5px] text-muted">{uz(o.business.name)}{o.business.verification_status === 'verified' && <BadgeCheck className="size-3.5 fill-good text-white" />} · {uz(o.region_name)}</p>
              </div>
              <span className="font-mono text-[14px] font-semibold">{formatNumber(o.unit_price)}</span>
            </motion.div>
          )) : [0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-14" />)}
        </div>
      </div>
    )
  }
  if (i === 1) {
    const rows = data.compare.data?.rows.slice(0, 4) ?? []
    const max = Math.max(...rows.map((r) => r.total_cost), 1)
    return (
      <div>
        <p className="mb-3 text-sm font-medium"><span className="emoji mr-1.5" aria-hidden>{data.potato?.emoji}</span>{data.potato ? ln(data.potato, 'name') : ''} · 1 000 {t('common:units.kg')}</p>
        <div className="mb-2 grid grid-cols-[1fr_64px_64px_84px] gap-2 px-2 font-mono sm:grid-cols-[1fr_80px_80px_96px] text-[10.5px] tracking-wide text-muted uppercase">
          <span /><span className="text-right">{t('how.viz.unitPrice')}</span><span className="text-right">{t('how.viz.delivery')}</span><span className="text-right">{t('how.viz.total')}</span>
        </div>
        <div className="space-y-1.5">
          {rows.length ? rows.map((r, k) => (
            <div key={r.offer.id} className={cn('relative grid grid-cols-[1fr_64px_64px_84px] items-center sm:grid-cols-[1fr_80px_80px_96px] gap-2 overflow-hidden rounded-lg px-2 py-2.5 text-[12.5px]', r.is_recommended ? 'bg-good-50' : 'bg-ink/[0.04]')}>
              <motion.span className="absolute inset-y-0 left-0 bg-brand/[0.08]" initial={reduce ? false : { width: 0 }} animate={{ width: `${(r.total_cost / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.15 + k * 0.1, ease: EASE }} />
              <span className="relative truncate">{uz(r.offer.business.name)}</span>
              <span className="relative text-right font-mono">{formatNumber(r.offer.unit_price)}</span>
              <span className="relative text-right font-mono">{r.delivery_cost ? formatNumber(r.delivery_cost) : '—'}</span>
              <span className={cn('relative text-right font-mono font-semibold', r.is_recommended && 'text-good')}>{formatNumber(r.total_cost)}</span>
            </div>
          )) : [0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-10" />)}
        </div>
      </div>
    )
  }
  if (i === 2) {
    const reg = data.regional.data ?? []
    const gap = reg.length > 1 && reg[0].avg ? ((reg[reg.length - 1].avg! - reg[0].avg) / reg[0].avg) * 100 : null
    const sd = data.sd.data
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium"><span className="emoji mr-1.5" aria-hidden>{data.tomato?.emoji}</span>{data.tomato ? ln(data.tomato, 'name') : ''}</span>
          <span className="flex items-center gap-2 text-xs text-muted">{t('how.viz.trend')} <PriceChange value={data.tomato?.change_pct} /></span>
        </div>
        {data.hist.data ? <DrawChart points={data.hist.data.series.map((p) => ({ date: p.date, value: p.avg }))} height={170} /> : <Skeleton className="h-[170px]" />}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [t('how.viz.supply'), sd ? `${sd.observed.active_offers}` : '—'],
            [t('how.viz.interest'), sd ? `${Math.round(sd.estimated.interest_index)}/100` : '—'],
            [t('how.viz.regionGap'), gap != null ? formatPct(gap) : '—'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-ink/[0.04] p-3"><p className="text-[11px] text-muted">{l}</p><p className="mt-1 font-mono text-[17px] font-semibold">{v}</p></div>
          ))}
        </div>
      </div>
    )
  }
  const best = data.compare.data?.rows.find((r) => r.is_recommended)
  const factors = ['cost', 'reliability', 'quality', 'delivery', 'availability'] as const
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-600 uppercase">{t('how.viz.decision')}</p>
      {best ? (
        <div className="rounded-2xl border border-good/25 bg-good-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ProductGlyph emoji={best.offer.product_emoji} category={best.offer.category_slug} size={40} name={ln(best.offer, 'product_name')} />
              <div>
                <p className="flex items-center gap-1 font-semibold">{uz(best.offer.business.name)}{best.offer.business.verification_status === 'verified' && <BadgeCheck className="size-4 fill-good text-white" />}</p>
                <p className="text-xs text-muted">★ {best.offer.business.rating.toFixed(1)} · {uz(best.offer.region_name)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[20px] font-bold text-good">{best.score.toFixed(0)}<span className="text-xs text-muted">/100</span></p>
            </div>
          </div>
          <p className="mt-4 mb-2 text-xs font-medium text-ink-soft">{t('how.viz.why')}</p>
          <div className="space-y-2">
            {factors.map((f, k) => (
              <div key={f} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 text-[12px]">
                <span className="text-muted">{t(`how.viz.factors.${f}`)}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-white"><motion.div className="h-full rounded-full bg-good" initial={reduce ? false : { width: 0 }} animate={{ width: `${best.score_breakdown[f] * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + k * 0.08, ease: EASE }} /></div>
                <span className="text-right font-mono text-muted">{Math.round(best.score_breakdown[f] * 100)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-good/20 pt-3">
            <span className="text-xs text-muted">{t('how.viz.total')}: <span className="font-mono font-semibold text-ink">{formatNumber(best.total_cost)}</span> so‘m</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"><Send className="size-3.5" />{t('how.viz.send')}</span>
          </div>
        </div>
      ) : <Skeleton className="h-[260px]" />}
    </div>
  )
}
