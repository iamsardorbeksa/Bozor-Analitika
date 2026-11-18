import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useInView } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Api } from '@/api/endpoints'
import { PriceChange } from '@/components/market'
import { Skeleton } from '@/components/ui/feedback'
import { formatNumber, ln, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pickBySlug, useAllMovers } from './data'
import { EASE, SectionHead } from './motion'

const RegionMap = React.lazy(() => import('./RegionMap'))
const PRODUCTS = ['pomidor', 'kartoshka', 'guruch', 'olma', 'sement']

export function Regions() {
  const { t } = useTranslation(['landing', 'common'])
  const movers = useAllMovers()
  const options = PRODUCTS.map((s) => pickBySlug(movers.data, s)).filter(Boolean) as NonNullable<ReturnType<typeof pickBySlug>>[]
  const [slug, setSlug] = React.useState('pomidor')
  const product = options.find((o) => o.slug === slug) ?? options[0]
  const reg = useQuery({ queryKey: ['landing', 'regional', product?.product_id], queryFn: () => Api.productRegional(product!.product_id), enabled: !!product, staleTime: 120_000 })
  const rows = reg.data ?? []
  const [sel, setSel] = React.useState<string | undefined>()
  React.useEffect(() => setSel(undefined), [slug])
  const selected = rows.find((r) => r.region_id === sel)
  const max = Math.max(...rows.map((r) => r.avg ?? 0), 1)
  const ref = React.useRef<HTMLDivElement>(null)
  const near = useInView(ref, { once: true, margin: '400px' })

  return (
    <section id="regions" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="06" eyebrow={t('regions.eyebrow')} title={t('regions.title')} sub={t('regions.subtitle')} />
        <div className="mb-6 flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.slug} onClick={() => setSlug(o.slug)} aria-pressed={slug === o.slug}
              className={cn('flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                slug === o.slug ? 'border-ink bg-ink text-white shadow-[0_4px_14px_rgba(17,19,23,.2)]' : 'border-line bg-white/70 text-ink-soft backdrop-blur hover:border-line-strong hover:bg-white')}>
              <span className="emoji" aria-hidden>{o.emoji}</span>{ln(o, 'name')}
            </button>
          ))}
        </div>
        <div ref={ref} className="grid overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.8] shadow-[var(--shadow-lift)] backdrop-blur-xl lg:grid-cols-[1.35fr_1fr]">
          <div className="relative h-[340px] isolate md:h-[520px]">
            {near ? (
              <React.Suspense fallback={<Skeleton className="size-full rounded-none" />}>
                <RegionMap rows={rows} selected={sel} onSelect={setSel} />
              </React.Suspense>
            ) : <Skeleton className="size-full rounded-none" />}
            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-muted shadow">
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-good" />−</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-saffron" />≈</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-danger" />+</span>
            </div>
          </div>
          <div className="flex flex-col border-t border-line p-5 md:p-7 lg:border-t-0 lg:border-l">
            <AnimatePresence mode="wait">
              <motion.div key={selected?.region_id ?? 'list-' + slug} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3, ease: EASE }}>
                {selected ? (
                  <div>
                    <button onClick={() => setSel(undefined)} className="mb-4 text-xs font-semibold text-brand-600 hover:underline">← {t('regions.hint')}</button>
                    <p className="text-[24px] font-extrabold tracking-[-0.03em]">{ln(selected, 'region_name')}</p>
                    <p className="text-xs text-muted">{product && <span className="emoji mr-1">{product.emoji}</span>}{product ? ln(product, 'name') : ''} · {timeAgo(selected.last_updated)}</p>
                    <dl className="mt-6 space-y-3">
                      {[
                        [t('regions.avg'), <span className="font-mono">{formatNumber(selected.avg)} <span className="text-xs text-muted">so‘m/{product ? t(`common:units.${product.unit}`) : ''}</span></span>],
                        [t('regions.offers'), <span className="font-mono">{selected.count}</span>],
                        [t('regions.range'), <span className="font-mono">{formatNumber(selected.min)} – {formatNumber(selected.max)}</span>],
                        [t('regions.vsNational'), <PriceChange value={selected.diff_vs_national_pct} />],
                      ].map(([l, v], i) => (
                        <div key={i} className="flex items-baseline justify-between border-b border-dashed border-line pb-3"><dt className="text-sm text-muted">{l}</dt><dd className="font-semibold">{v}</dd></div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <div>
                    <p className="mb-4 text-xs text-muted">{t('regions.hint')}</p>
                    {reg.isLoading ? <Skeleton className="h-60" /> : !rows.length ? <p className="text-sm text-muted">{t('regions.noData')}</p> : (
                      <ul className="space-y-1">
                        {rows.map((r, i) => (
                          <li key={r.region_id}>
                            <button onClick={() => setSel(r.region_id)} className="grid w-full grid-cols-[96px_1fr_72px] items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-ink/5">
                              <span className="truncate">{ln(r, 'region_name')}{i === 0 && <span className="ml-1 text-[10px] text-good">★</span>}</span>
                              <span className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                                <motion.span className={cn('block h-full rounded-full', i === 0 ? 'bg-good' : 'bg-ink/20')} initial={{ width: 0 }} animate={{ width: `${((r.avg ?? 0) / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05, ease: EASE }} />
                              </span>
                              <span className="text-right font-mono">{formatNumber(r.avg)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {rows[0] && <p className="mt-5 text-xs text-muted">{t('regions.cheapest')}: <b className="text-ink">{ln(rows[0], 'region_name')}</b></p>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
