import { Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { rmsLevel } from './voice'
import './voice.css'

const BARS = 7

/**
 * Gemini-Live-style listening state: an animated multicolour glow around the viewport edge
 * (rotating conic gradient, crisp line + two blurred layers), reacting to the voice level,
 * plus a small bottom pill with a live waveform, the state text and a stop button.
 * pointer-events: none everywhere except the pill. prefers-reduced-motion -> static glow.
 */
export function ListeningOverlay({ state, analyser, partial, onStop }: {
  state: 'listening' | 'working' | null
  analyser: AnalyserNode | null
  partial?: string
  onStop: () => void
}) {
  const { t } = useTranslation('voice')
  const root = React.useRef<HTMLDivElement>(null)
  const bars = React.useRef<(HTMLSpanElement | null)[]>([])

  // audio level -> CSS variable (glow intensity) + bar heights, without React re-renders
  React.useEffect(() => {
    if (state !== 'listening' || !analyser) return
    let raf = 0
    const time = new Uint8Array(analyser.fftSize)
    const freq = new Uint8Array(analyser.frequencyBinCount)
    let smooth = 0
    const loop = () => {
      const lvl = Math.min(1, rmsLevel(analyser, time) * 5)
      smooth = smooth * 0.8 + lvl * 0.2
      root.current?.style.setProperty('--vx-lvl', smooth.toFixed(3))
      analyser.getByteFrequencyData(freq)
      // voice band roughly 1..40 bins at 512 fft / 48 kHz; spread over the bars, mirrored for a centred look
      const half = Math.ceil(BARS / 2)
      for (let i = 0; i < BARS; i++) {
        const k = Math.abs(i - (half - 1))
        const from = 2 + k * 5, to = from + 5
        let s = 0
        for (let j = from; j < to; j++) s += freq[j] ?? 0
        const v = Math.min(1, s / (to - from) / 200)
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${(0.18 + v * 0.82).toFixed(3)})`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state, analyser])

  React.useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onStop() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onStop])

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {state && (
        <motion.div key="vx" ref={root} className="vx-root" data-state={state} data-meter={analyser ? 'live' : 'idle'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <div className="vx-glow" aria-hidden>
            <div className="vx-blur vx-blur-wide"><i className="vx-band vx-band-wide" /></div>
            <div className="vx-blur vx-blur-mid"><i className="vx-band vx-band-mid" /></div>
            <i className="vx-band vx-band-line" />
          </div>
          <motion.div className="vx-pill" role="status" aria-live="polite"
            initial={{ y: 24, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            {state === 'listening' ? (
              <span className="vx-wave" aria-hidden>
                {Array.from({ length: BARS }).map((_, i) => (
                  <span key={i} ref={(el) => { bars.current[i] = el }} style={{ animationDelay: `${i * 90}ms` }} />
                ))}
              </span>
            ) : (
              <span className="vx-spin" aria-hidden />
            )}
            <span className="vx-text">
              <b>{state === 'listening' ? t('listening') : t('working')}</b>
              {state === 'listening' && <small>{partial ? `“${partial}”` : t('hintStop')}</small>}
            </span>
            {state === 'listening' && (
              <button type="button" className="vx-stop" onClick={onStop} aria-label={t('stop')} title={t('stop')}>
                <Square className="size-3.5" fill="currentColor" />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
