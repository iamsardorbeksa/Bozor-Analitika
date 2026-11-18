import { CheckCircle2, Layers, Lightbulb, Target } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/layout'

export default function About() {
  const { t } = useTranslation('landing')
  const principles = t('about.principles', { returnObjects: true }) as string[]
  const blocks = [
    { icon: Target, title: t('about.problemT'), body: t('about.problemD') },
    { icon: Lightbulb, title: t('about.solutionT'), body: t('about.solutionD') },
  ]
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t('about.eyebrow')} title={t('about.title')} description={t('about.lead')} />
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-[var(--radius-card)] border border-line bg-white/[0.78] p-6 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <span className="mb-4 grid size-10 place-items-center rounded-xl bg-mint text-brand-600"><b.icon className="size-5" /></span>
            <h2 className="text-lg font-bold tracking-[-0.02em]">{b.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{b.body}</p>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel mt-4 p-6 md:p-8">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">{t('about.principlesT')}</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {principles.map((p) => <li key={p} className="flex gap-3 text-[15px] text-ink-soft"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" />{p}</li>)}
        </ul>
      </motion.div>
      <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-white/[0.78] p-6 shadow-[var(--shadow-card)] backdrop-blur-xl md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Layers className="size-5 text-brand-600" />{t('about.stackT')}</h2>
          <p className="mt-1.5 font-mono text-[13px] text-muted">{t('about.stack')}</p>
        </div>
        <Button asChild><Link to="/register">{t('cta.primary')}</Link></Button>
      </div>
    </div>
  )
}
