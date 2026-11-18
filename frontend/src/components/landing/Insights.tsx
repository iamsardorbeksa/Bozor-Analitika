import { ArrowRight, Minus, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EASE, Reveal, SectionHead } from './motion'

type Article = { tag: string; t: string; dek: string; body: string[] }

export function Insights() {
  const { t } = useTranslation('landing')
  const articles = t('insights.articles', { returnObjects: true }) as Article[]
  const [open, setOpen] = React.useState<number | null>(null)
  return (
    <section id="insights" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <SectionHead index="08" eyebrow={t('insights.eyebrow')} title={t('insights.title')} sub={t('insights.subtitle')} />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* lead article */}
          <Reveal as="article" className="glass-panel flex flex-col p-7 md:p-10">
            <ArticleBody a={articles[0]} i={0} open={open === 0} onToggle={() => setOpen(open === 0 ? null : 0)} lead />
          </Reveal>
          <div className="flex flex-col divide-y divide-line rounded-[28px] border border-white/80 bg-white/[0.8] shadow-[var(--shadow-card)] backdrop-blur-xl">
            {articles.slice(1).map((a, k) => (
              <Reveal as="article" key={a.t} delay={k * 0.05} className="p-6">
                <ArticleBody a={a} i={k + 1} open={open === k + 1} onToggle={() => setOpen(open === k + 1 ? null : k + 1)} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ArticleBody({ a, i, open, onToggle, lead }: { a: Article; i: number; open: boolean; onToggle: () => void; lead?: boolean }) {
  const { t } = useTranslation('landing')
  const words = a.body.join(' ').split(/\s+/).length
  const id = `article-${i}`
  return (
    <>
      <div className={cn('flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase', 'text-brand-600')}>
        <span>{a.tag}</span><span className={'text-line-strong'}>/</span>
        <span className={'text-muted'}>{t('insights.minutes', { n: Math.max(1, Math.round(words / 180)) })}</span>
      </div>
      <h3 className={cn('mt-3 tracking-[-0.03em] text-ink', lead ? 'text-[34px] leading-[1.05] font-extrabold md:text-[44px]' : 'text-[19px] font-bold')}>{a.t}</h3>
      <p className={cn('mt-2 text-[14.5px] leading-relaxed', 'text-muted')}>{a.dek}</p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
            <div className={cn('space-y-3 pt-4 text-[15px] leading-relaxed', 'text-ink-soft')}>
              {a.body.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn('flex items-center gap-3', lead ? 'mt-auto pt-8' : 'mt-4')}>
        <button onClick={onToggle} aria-expanded={open} aria-controls={id}
          className={cn('inline-flex items-center gap-1.5 text-sm font-medium', lead ? 'rounded-full bg-ink px-4 py-2 text-white hover:bg-brand' : 'text-brand-600 hover:underline')}>
          {open ? <Minus className="size-4" /> : <Plus className="size-4" />}{open ? t('insights.close') : t('insights.read')}
        </button>
      </div>
    </>
  )
}

export function FAQ() {
  const { t } = useTranslation('landing')
  const items = t('faq.items', { returnObjects: true }) as { q: string; a: string }[]
  const [open, setOpen] = React.useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHead index="09" eyebrow={t('faq.eyebrow')} title={t('faq.title')} className="lg:sticky lg:top-28 lg:h-fit" />
        <div className="divide-y divide-line rounded-[28px] border border-white/80 bg-white/[0.78] px-5 shadow-[var(--shadow-card)] backdrop-blur-xl md:px-7">
          {items.map((it, i) => (
            <div key={it.q}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold tracking-[-0.015em] hover:text-brand-600">
                {it.q}
                <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.25 }} className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-white">
                  <Plus className="size-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                    <p className="max-w-[640px] pb-6 text-[15px] leading-relaxed text-muted">{it.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCTA() {
  const { t } = useTranslation('landing')
  return (
    <section className="px-4 pt-8 pb-10 md:px-6">
      <Reveal className="glass-panel mx-auto max-w-[1240px] px-6 py-20 text-center md:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(17,19,23,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(17,19,23,.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <h2 className="relative mx-auto max-w-[900px] text-[36px] leading-[1.03] font-extrabold tracking-[-0.04em] text-balance text-ink md:text-[62px]">{t('cta.title')}</h2>
        <p className="relative mx-auto mt-6 max-w-[560px] text-[16.5px] leading-relaxed text-muted">{t('cta.subtitle')}</p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="accent"><Link to="/register">{t('cta.primary')} <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/market">{t('cta.secondary')}</Link></Button>
        </div>
      </Reveal>
    </section>
  )
}
