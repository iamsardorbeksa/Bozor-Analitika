import { Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const STEPS = ['parse', 'query', 'compute', 'compose'] as const

/** Shown while the analyst request is in flight: step labels advance on a timer (purely presentational). */
export function ThinkingIndicator() {
  const { t } = useTranslation('ai')
  const [step, setStep] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100)
    return () => clearInterval(id)
  }, [])
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-md rounded-xl border border-line bg-white p-3.5" role="status" aria-live="polite">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="block h-3 w-1 rounded-full bg-brand"
              animate={{ scaleY: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
        </span>
        <span className="text-[12px] font-semibold text-brand">{t('thinking.title')}</span>
      </div>
      <ol className="space-y-1">
        {STEPS.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2 text-[12.5px] transition-colors', i < step ? 'text-muted' : i === step ? 'text-ink' : 'text-[#b8c2bc]')}>
            <span className="grid size-4 place-items-center">
              <AnimatePresence mode="wait" initial={false}>
                {i < step ? (
                  <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="size-3.5 text-brand" /></motion.span>
                ) : i === step ? (
                  <motion.span key="a" className="size-1.5 rounded-full bg-saffron" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                ) : (
                  <span key="p" className="size-1.5 rounded-full bg-line-strong" />
                )}
              </AnimatePresence>
            </span>
            {t(`thinking.${s}`)}
          </li>
        ))}
      </ol>
    </motion.div>
  )
}
