import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Api } from '@/api/endpoints'
import { Sparkline } from '@/components/market'
import { Button } from '@/components/ui/button'
import { formatNumber, ln } from '@/lib/format'
import { pickBySlug, useAllMovers } from './data'
import { EASE, Reveal, SectionHead } from './motion'

export function Business() {
  const { t } = useTranslation(['landing', 'common'])
  const buyer = t('business.buyers.items', { returnObjects: true }) as { t: string; d: string }[]
  const seller = t('business.sellers.items', { returnObjects: true }) as { t: string; d: string }[]
  const movers = useAllMovers()
  const rice = pickBySlug(movers.data, 'guruch')
  const onion = pickBySlug(movers.data, 'piyoz')
  const stats = useQuery({ queryKey: ['stats', rice?.product_id], queryFn: () => Api.productStats(rice!.product_id), enabled: !!rice, staleTime: 120_000 })
  const reduce = useReducedMotion()
  const s = stats.data
  // A seller priced 3% under the market average, placed on the real min–max range.
  const yours = s?.avg ? s.avg * 0.97 : null
  const pos = s?.min != null && s?.max != null && yours != null && s.max > s.min ? ((yours - s.min) / (s.max - s.min)) * 100 : 50

  return (
    <section id="business" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="07" eyebrow={t('business.eyebrow')} title={t('business.title')} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-[28px] border border-white/80 bg-white/[0.78] p-7 shadow-[var(--shadow-card)] backdrop-blur-xl md:p-9">
            <p className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-brand-600 uppercase">{t('business.buyers.eyebrow')}</p>
            <h3 className="mt-3 text-[30px] leading-tight font-extrabold tracking-[-0.035em]">{t('business.buyers.title')}</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {buyer.map((b) => (
                <li key={b.t}><p className="flex items-center gap-2 font-medium"><Check className="size-4 text-good" />{b.t}</p><p className="mt-1 pl-6 text-sm text-muted">{b.d}</p></li>
              ))}
            </ul>
            {onion && (
              <div className="mt-8 flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
                <span className="emoji text-[28px]" aria-hidden>{onion.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{ln(onion, 'name')}</p>
                  <p className="font-mono text-lg font-semibold">{formatNumber(onion.current_avg)} <span className="font-sans text-xs font-normal text-muted">so‘m/{t(`common:units.${onion.unit}`)}</span></p>
                </div>
                <Sparkline data={onion.spark} width={110} height={38} />
              </div>
            )}
            <Button asChild variant="dark" size="lg" className="mt-8 w-fit"><Link to="/register">{t('business.buyers.cta')} <ArrowRight /></Link></Button>
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col rounded-[28px] border border-brand/30 bg-gradient-to-br from-mint/95 via-white/80 to-white/70 p-7 shadow-[var(--shadow-card)] backdrop-blur-xl md:p-9">
            <p className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-brand-600 uppercase">{t('business.sellers.eyebrow')}</p>
            <h3 className="mt-3 text-[30px] leading-tight font-extrabold tracking-[-0.035em]">{t('business.sellers.title')}</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {seller.map((b) => (
                <li key={b.t}><p className="flex items-center gap-2 font-medium"><Check className="size-4 text-brand" />{b.t}</p><p className="mt-1 pl-6 text-sm text-muted">{b.d}</p></li>
              ))}
            </ul>
            {s && rice && yours != null && (
              <div className="mt-8 rounded-2xl border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span><span className="emoji mr-1.5" aria-hidden>{rice.emoji}</span>{ln(rice, 'name')}</span>
                  <span className="text-xs font-semibold text-brand-600">{t('business.sellers.position')}</span>
                </div>
                <div className="relative h-2 rounded-full bg-gradient-to-r from-good/40 via-ink/10 to-up/40">
                  <motion.span className="absolute -top-1.5 grid size-5 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-brand shadow-[0_1px_4px_rgba(0,0,0,.25)]"
                    initial={reduce ? false : { left: '0%' }} whileInView={{ left: `${pos}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} />
                </div>
                <div className="mt-3 flex justify-between font-mono text-[11.5px] text-muted">
                  <span>{formatNumber(s.min)}</span><span className="font-semibold text-ink">{t('business.sellers.yourPrice')}: {formatNumber(yours)}</span><span>{formatNumber(s.max)}</span>
                </div>
              </div>
            )}
            <Button asChild size="lg" variant="accent" className="mt-8 w-fit"><Link to="/register">{t('business.sellers.cta')} <ArrowRight /></Link></Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
