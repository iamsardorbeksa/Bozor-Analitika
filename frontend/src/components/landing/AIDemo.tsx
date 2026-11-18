import { ArrowRight, Check, Loader2, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE, Reveal, SectionHead } from './motion'

// Sample figures from the brief (labelled as such in the UI).
const QTY = 1000
const OFFERS = [
  { name: 'A', unit: 4500, delivery: 100_000 },
  { name: 'B', unit: 4200, delivery: 250_000 },
  { name: 'C', unit: 4350, delivery: 0 },
]
const totals = OFFERS.map((o) => QTY * o.unit + o.delivery)
const BEST = totals.indexOf(Math.min(...totals))

function Counter({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    if (!run) { setV(0); return }
    const c = animate(0, to, { duration: 0.9, ease: EASE, onUpdate: setV })
    return () => c.stop()
  }, [to, run])
  return <>{formatNumber(Math.round(v))}</>
}

export function AIDemo() {
  const { t } = useTranslation('landing')
  const steps = t('ai.steps', { returnObjects: true }) as string[]
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30% 0px' })
  const reduce = useReducedMotion()
  const [phase, setPhase] = React.useState(0) // 0 idle,1 question,2 analyzing,3 offers,4 totals,5 result
  const [run, setRun] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    if (reduce) { setPhase(5); return }
    setPhase(1)
    const ids = [setTimeout(() => setPhase(2), 700), setTimeout(() => setPhase(3), 2300), setTimeout(() => setPhase(4), 3500), setTimeout(() => setPhase(5), 4700)]
    return () => ids.forEach(clearTimeout)
  }, [inView, run, reduce])

  return (
    <section id="ai" className="relative scroll-mt-24 py-24 md:py-32">
      <div className="glass-panel mx-auto grid max-w-[1240px] gap-12 px-5 py-10 max-md:mx-3 max-md:rounded-[26px] md:px-12 md:py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <SectionHead index="05" eyebrow={t('ai.eyebrow')} title={t('ai.title')} sub={t('ai.subtitle')} className="mb-8 md:mb-10" />
          <Reveal className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent"><Link to="/app/ai">{t('ai.tryReal')} <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" onClick={() => { setPhase(0); setRun((r) => r + 1) }}>
              <RotateCcw /> {t('ai.replay')}
            </Button>
          </Reveal>
        </div>

        <div ref={ref} className="rounded-[24px] border border-line bg-white/[0.85] p-4 shadow-[var(--shadow-lift)] backdrop-blur-xl md:p-6" aria-live="polite">
          <div className="mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-brand" />{t('ai.eyebrow')}</span>
            <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 font-mono text-[10.5px] text-muted">{t('ai.label')}</span>
          </div>

          <div className="min-h-[430px] space-y-4">
            <AnimatePresence>
              {phase >= 1 && (
                <motion.div key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] text-white">
                  {t('ai.question')}
                </motion.div>
              )}
              {phase >= 2 && (
                <motion.div key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
                  {steps.map((s, i) => {
                    const done = phase >= 3 + i || phase >= 5
                    const active = !done && phase >= 2 + i
                    return (
                      <span key={s} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                        done ? 'border-good/40 bg-good-50 text-good' : active ? 'border-brand/50 text-brand-600' : 'border-line text-muted/70')}>
                        {done ? <Check className="size-3" /> : active ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}{s}
                      </span>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {OFFERS.map((o, i) => {
                const isBest = phase >= 5 && i === BEST
                return (
                  <motion.div key={o.name + run} initial={{ opacity: 0, y: 16 }} animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                    transition={{ delay: phase === 3 ? i * 0.15 : 0, duration: 0.5, ease: EASE }}
                    className={cn('relative rounded-2xl border p-4 transition-[background,border,opacity] duration-500',
                      isBest ? 'border-good bg-good-50 shadow-[0_0_0_4px_rgba(18,133,90,.1)]' : 'border-line bg-white', phase >= 5 && !isBest && 'opacity-55')}>
                    {isBest && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                        className="absolute -top-2.5 right-3 grid size-6 place-items-center rounded-full bg-good text-white"><Trophy className="size-3.5" /></motion.span>
                    )}
                    <p className="text-[13px] font-semibold">{t('ai.supplier', { name: o.name })}</p>
                    <dl className="mt-3 space-y-1.5 text-[12px]">
                      <div className="flex justify-between"><dt className="text-muted">{t('ai.unit')}</dt><dd className="font-mono">{formatNumber(o.unit)}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">{t('ai.delivery')}</dt><dd className="font-mono">{o.delivery ? formatNumber(o.delivery) : t('ai.free')}</dd></div>
                    </dl>
                    <div className="mt-3 border-t border-dashed border-line-strong pt-3">
                      <p className="text-[11px] text-muted">{t('ai.total')}</p>
                      <p className={cn('font-mono text-[18px] font-bold', isBest ? 'text-good' : 'text-ink')}>
                        {phase >= 4 ? <Counter to={totals[i]} run={phase >= 4} /> : '—'}
                      </p>
                      <AnimatePresence>
                        {phase >= 4 && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 font-mono text-[10.5px] text-muted">
                            {formatNumber(QTY)} × {formatNumber(o.unit)} + {formatNumber(o.delivery)}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <AnimatePresence>
              {phase >= 4 && (
                <motion.p key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-mono text-[12px] text-muted">{t('ai.formula')}</motion.p>
              )}
              {phase >= 5 && (
                <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}
                  className="rounded-2xl rounded-bl-md border border-good/25 bg-good-50/70 px-4 py-3.5">
                  <p className="flex items-center gap-2 text-[14px] font-bold text-good"><Check className="size-4" />{t('ai.result')}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{t('ai.resultBody')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
