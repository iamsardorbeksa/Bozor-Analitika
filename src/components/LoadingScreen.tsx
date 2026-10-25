import { useI18n } from '../i18n'
import type { Phase } from '../worker/protocol'
import { Icon } from './ui/Icon'

const PHASES: Phase[] = ['reading', 'parsing', 'computing']

export function LoadingScreen({ phase, fraction }: { phase: Phase; fraction: number }) {
  const { t } = useI18n()
  const step = PHASES.indexOf(phase)
  // Overall progress across the three phases.
  const overall = Math.min(1, (step + Math.max(0, Math.min(1, fraction))) / PHASES.length)
  const pct = Math.round(overall * 100)
  return (
    <main className="loading-page">
      <div className="loading-box">
        <div className="loading-bubbles" aria-hidden="true">
          <span>💬</span>
          <span>😂</span>
          <span>❤️</span>
        </div>
        <h1 className="font-display mt-6 text-3xl font-extrabold">{t('loading.title')}</h1>
        <div
          className="progress mt-6"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t('loading.title')}
        >
          <div className="progress-fill" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
        <ol className="mt-5 grid gap-2 text-left">
          {PHASES.map((p, i) => (
            <li
              key={p}
              className={`loading-step ${i < step ? 'is-done' : i === step ? 'is-active' : ''}`}
            >
              <span className="loading-dot">
                {i < step ? <Icon name="check" size={14} /> : i + 1}
              </span>
              {t(`loading.${p}`)}
              {i === step && (
                <span className="ms-auto tabular-nums">{Math.round(fraction * 100)}%</span>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--page-muted)]">
          <Icon name="lock" size={16} /> {t('loading.local')}
        </p>
      </div>
    </main>
  )
}
