import { Sigma } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/** Explains how price change is computed: ((current − previous) / previous) × 100. */
export function FormulaNote({ className }: { className?: string }) {
  const { t } = useTranslation('analytics')
  return (
    <Tooltip content={<span><span className="font-mono">{t('formula.expr')}</span><br />{t('formula.hint')}</span>}>
      <button type="button" aria-label={t('formula.title')} className={cn('inline-flex items-center gap-1 text-[11.5px] whitespace-nowrap text-muted hover:text-ink', className)}>
        <Sigma className="size-3.5" />{t('formula.title')}
      </button>
    </Tooltip>
  )
}

/** Honest "not enough history" state: never draws a fake forecast. */
export function ForecastInsufficient({ points, minPoints }: { points: number; minPoints: number }) {
  const { t } = useTranslation('analytics')
  const pct = Math.min(100, (points / Math.max(minPoints, 1)) * 100)
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-paper p-4">
      <p className="text-sm font-medium text-ink">{t('forecast.insufficientTitle')}</p>
      <p className="mt-1 text-xs text-muted">{t('forecast.insufficientBody', { points, min: minPoints })}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-muted" style={{ width: `${pct}%` }} /></div>
      <div className="mt-1 font-mono text-[11px] text-muted tabular">{points} / {minPoints}</div>
    </div>
  )
}
