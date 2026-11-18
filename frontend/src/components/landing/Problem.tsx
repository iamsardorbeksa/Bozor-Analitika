import { Check, Clock, FileSpreadsheet, HelpCircle, MapPin, NotebookPen, PhoneCall, Search, Calculator, BadgeCheck, LineChart, Target } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented } from '@/components/ui/layout'
import { cn } from '@/lib/utils'
import { EASE, SectionHead, useIsMobile } from './motion'

const OLD_ICONS = [PhoneCall, MapPin, NotebookPen, FileSpreadsheet, HelpCircle]
const NEW_ICONS = [Search, Calculator, BadgeCheck, LineChart, Target]
// Scattered positions for the "traditional" state: notes thrown on a desk.
const SCATTER = [
  { x: -18, y: 14, r: -5 }, { x: 22, y: -10, r: 4 }, { x: -8, y: 26, r: 3 }, { x: 16, y: 8, r: -3.5 }, { x: -24, y: -6, r: 2.5 },
]

export function Problem() {
  const { t } = useTranslation('landing')
  const [mode, setMode] = React.useState<'old' | 'new'>('old')
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-35% 0px' })
  const touched = React.useRef(false)
  const reduce = useReducedMotion()
  const mobile = useIsMobile()
  React.useEffect(() => {
    if (!inView || touched.current) return
    const id = setTimeout(() => { if (!touched.current) setMode('new') }, 2200)
    return () => clearTimeout(id)
  }, [inView])
  const oldSteps = t('problem.oldSteps', { returnObjects: true }) as { t: string; d: string }[]
  const newSteps = t('problem.newSteps', { returnObjects: true }) as { t: string; d: string }[]
  const isNew = mode === 'new'

  return (
    <section id="problem" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHead index="02" eyebrow={t('problem.eyebrow')} title={t('problem.title')} sub={t('problem.subtitle')} className="lg:mb-16" />
          <div className="mb-12 flex flex-col items-start gap-4 lg:mb-16 lg:items-end">
            <Segmented id="problem" value={mode} onChange={(v) => { touched.current = true; setMode(v) }}
              options={[{ value: 'old', label: t('problem.old') }, { value: 'new', label: t('problem.new') }]} />
            <div className="flex items-center gap-3">
              <Clock className={cn('size-5 transition-colors', isNew ? 'text-good' : 'text-danger')} />
              <div>
                <p className="text-[11.5px] text-muted">{t('problem.timeLabel')}</p>
                <AnimatePresence mode="wait">
                  <motion.p key={mode} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.3 }}
                    className={cn('font-mono text-[24px] leading-none font-bold tracking-tight', isNew ? 'text-good' : 'text-danger')}>
                    {isNew ? t('problem.timeNew') : t('problem.timeOld')}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div ref={ref} className={cn('relative rounded-[28px] border p-4 backdrop-blur-xl transition-colors duration-700 md:p-8', isNew ? 'border-white/80 bg-white/45 shadow-[0_30px_80px_rgba(90,50,20,.14)]' : 'border-line bg-sand/70')}>
          {/* the connecting thread appears only once the process is ordered */}
          <motion.div aria-hidden className="pointer-events-none absolute top-1/2 right-8 left-8 hidden h-[2px] origin-left bg-brand/40 md:block"
            initial={false} animate={{ scaleX: isNew ? 1 : 0 }} transition={{ duration: 0.8, ease: EASE }} />
          <ol className="relative z-10 grid gap-3 md:grid-cols-5 md:gap-4">
            {oldSteps.map((_, i) => {
              const Icon = (isNew ? NEW_ICONS : OLD_ICONS)[i]
              const step = (isNew ? newSteps : oldSteps)[i]
              const sc = mobile || reduce ? { x: 0, y: 0, r: 0 } : SCATTER[i]
              return (
                <motion.li key={i} animate={isNew ? { x: 0, y: 0, rotate: 0 } : { x: sc.x, y: sc.y, rotate: sc.r }}
                  transition={{ type: 'spring', stiffness: 140, damping: 18, delay: isNew ? i * 0.07 : 0 }}
                  className={cn('relative min-h-[170px] rounded-2xl p-5 transition-[background,box-shadow] duration-500',
                    isNew ? 'bg-white shadow-[var(--shadow-card)]' : 'border border-dashed border-line-strong bg-[#fbfaf8] shadow-[0_8px_20px_-14px_rgba(0,0,0,.25)]')}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className={cn('grid size-9 place-items-center rounded-xl transition-colors', isNew ? 'bg-mint text-brand-600' : 'bg-white text-muted ring-1 ring-line')}><Icon className="size-[18px]" /></span>
                    <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, delay: isNew ? i * 0.07 : 0 }}>
                      <p className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
                        {isNew && <Check className="size-4 shrink-0 text-good" />}{step.t}
                      </p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{step.d}</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
