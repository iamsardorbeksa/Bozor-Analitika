import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Scale, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Api } from '@/api/endpoints'
import type { Mover } from '@/api/types'
import { PriceChange, ProductGlyph, Sparkline, catStyle } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/feedback'
import { useCategories } from '@/hooks/useCatalog'
import { formatNumber, ln } from '@/lib/format'
import { cn } from '@/lib/utils'
import { STAPLES, useAllMovers, useHistory } from './data'
import { DrawChart, EASE, SectionHead } from './motion'

export function MarketSnapshot() {
  const { t } = useTranslation(['landing', 'common'])
  const cats = useCategories()
  const movers = useAllMovers()
  const [tab, setTab] = React.useState('featured')
  const [sel, setSel] = React.useState<string | null>(null)
  const reduce = useReducedMotion()

  const list: Mover[] = React.useMemo(() => {
    const all = movers.data ?? []
    if (tab === 'featured') return STAPLES.map((s) => all.find((m) => m.slug === s)).filter(Boolean) as Mover[]
    return all.filter((m) => m.category_slug === tab).sort((a, b) => (b.offers ?? 0) - (a.offers ?? 0) || Math.abs(b.change_pct) - Math.abs(a.change_pct)).slice(0, 8)
  }, [movers.data, tab])
  const selected = list.find((m) => m.product_id === sel) ?? null

  const tabs = [{ slug: 'featured', label: t('snapshot.featured') }, ...(cats.data ?? []).map((c) => ({ slug: c.slug, label: ln(c, 'name') }))]

  return (
    <section id="market" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="01" eyebrow={t('snapshot.eyebrow')} title={t('snapshot.title')} sub={t('snapshot.subtitle')} />

        <div role="tablist" aria-label={t('snapshot.eyebrow')} className="scrollbar-thin -mx-5 mb-8 flex gap-1.5 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0">
          {tabs.map((c) => (
            <button key={c.slug} role="tab" aria-selected={tab === c.slug} onClick={() => { setTab(c.slug); setSel(null) }}
              className={cn('relative shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
                tab === c.slug ? 'text-white' : 'border border-line bg-white/60 text-ink-soft backdrop-blur hover:bg-white hover:text-ink')}>
              {tab === c.slug && <motion.span layoutId="snap-tab" className="absolute inset-0 rounded-full bg-ink shadow-[0_4px_14px_rgba(17,19,23,.2)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>

        {movers.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)}</div>
        ) : !list.length ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white/50 p-10 text-center text-muted">{t('snapshot.empty')}</p>
        ) : (
          <motion.div layout className={cn('grid gap-3 sm:grid-cols-2', list.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            <AnimatePresence mode="popLayout">
              {list.map((m, i) => (
                <motion.button key={m.product_id} layout initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }} onClick={() => setSel(sel === m.product_id ? null : m.product_id)}
                  aria-expanded={sel === m.product_id}
                  className={cn('group rounded-[var(--radius-card)] border bg-white/[0.78] p-4 text-left shadow-[var(--shadow-card)] backdrop-blur-xl transition-[border,box-shadow] duration-200 hover:shadow-[var(--shadow-lift)]',
                    sel === m.product_id ? 'border-brand shadow-[0_0_0_4px_rgba(255,90,31,.12),var(--shadow-lift)]' : 'border-line')}>
                  <div className="flex items-start justify-between gap-2">
                    <ProductGlyph emoji={m.emoji} category={m.category_slug} name={ln(m, 'name')} size={42} />
                    <Sparkline data={m.spark} width={72} height={30} />
                  </div>
                  <p className="mt-3 truncate font-semibold">{ln(m, 'name')}</p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[19px] font-bold tracking-tight">{formatNumber(m.current_avg)}<span className="ml-1 font-sans text-[11px] font-normal text-muted">so‘m/{t(`common:units.${m.unit}`)}</span></span>
                    <PriceChange value={m.change_pct} className="text-[12.5px]" />
                  </div>
                  <p className="mt-2 text-[12px] text-muted">{t('snapshot.offers', { count: m.offers ?? 0 })}</p>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <AnimatePresence>
          {selected && <SnapshotDetail key={selected.product_id} m={selected} onClose={() => setSel(null)} />}
        </AnimatePresence>
      </div>
    </section>
  )
}

function SnapshotDetail({ m, onClose }: { m: Mover; onClose: () => void }) {
  const { t } = useTranslation(['landing', 'common'])
  const hist = useHistory(m.product_id, 30)
  const stats = useQuery({ queryKey: ['stats', m.product_id], queryFn: () => Api.productStats(m.product_id), staleTime: 120_000 })
  const s = catStyle(m.category_slug)
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
      <div className="mt-4 grid gap-6 rounded-[24px] border border-line bg-white/[0.85] p-5 shadow-[var(--shadow-lift)] backdrop-blur-xl md:grid-cols-[1fr_260px] md:p-7">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium"><span className="emoji mr-2" aria-hidden>{m.emoji}</span>{ln(m, 'name')} · <span className="text-muted">{t('snapshot.chart')}</span></p>
            <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label={t('snapshot.close')}><X className="size-4" /></button>
          </div>
          {hist.data ? <DrawChart points={hist.data.series.map((p) => ({ date: p.date, value: p.avg }))} height={190} color={s.fg} /> : <Skeleton className="h-[190px]" />}
        </div>
        <div className="flex flex-col gap-3">
          {[
            [t('snapshot.avg'), stats.data?.avg], [t('snapshot.min'), stats.data?.min], [t('snapshot.max'), stats.data?.max],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex items-baseline justify-between border-b border-dashed border-line pb-2.5">
              <span className="text-sm text-muted">{l}</span>
              <span className="font-mono font-semibold">{v != null ? formatNumber(Number(v)) : '—'}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-b border-dashed border-line pb-2.5 text-sm">
            <span className="text-muted">{t('snapshot.change')}</span><PriceChange value={m.change_pct} />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Button asChild variant="dark"><Link to={`/market?q=${encodeURIComponent(m.name_uz)}`}>{t('snapshot.explore')} <ArrowUpRight /></Link></Button>
            <Button asChild variant="outline"><Link to={`/app/compare?product=${m.product_id}&qty=100`}><Scale /> {t('snapshot.compare')}</Link></Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
