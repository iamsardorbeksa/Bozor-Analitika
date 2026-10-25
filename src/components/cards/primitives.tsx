import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { APP_CONFIG } from '../../config'
import { useI18n } from '../../i18n'
import type { Palette } from './palettes'

/** Cards are designed on a fixed 360×640 canvas and scaled to fit; export renders at 3× = 1080×1920. */
export const CARD_W = 360
export const CARD_H = 640

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Animated count-up. Shows the final value immediately in static (export) mode or with reduced motion. */
export function useCountUp(
  target: number,
  opts: { duration?: number; delay?: number; isStatic?: boolean } = {},
) {
  const reduced = useReducedMotion()
  const skip = opts.isStatic || reduced
  const [value, setValue] = useState(skip ? target : 0)
  useEffect(() => {
    if (skip) return
    const duration = opts.duration ?? 1400
    const delay = opts.delay ?? 250
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start - delay) / duration)
      if (t >= 0) {
        // ease-out expo for a satisfying slam at the end
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        setValue(target * eased)
      }
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, skip, opts.duration, opts.delay])
  return skip ? target : value
}

export function CountUp({
  value,
  isStatic,
  format,
  delay,
}: {
  value: number
  isStatic?: boolean
  format?: (n: number) => string
  delay?: number
}) {
  const { num } = useI18n()
  const v = useCountUp(value, { isStatic, delay })
  const fmt = format ?? ((n: number) => num(Math.round(n)))
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }} aria-label={fmt(value)}>
      {fmt(v)}
    </span>
  )
}

/** Wraps children in an entrance animation. `d` = delay in ms. */
export function Anim({
  kind = 'rise',
  d = 0,
  children,
  className = '',
  style,
}: {
  kind?: 'rise' | 'pop' | 'fade' | 'slide' | 'zoom'
  d?: number
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`cw-anim cw-${kind} ${className}`}
      style={{ animationDelay: `${d}ms`, ...style }}
    >
      {children}
    </div>
  )
}

/** Font size that keeps a big number on one line inside the card. */
export function fitSize(text: string, max: number, widthPx = 300, ratio = 0.78): number {
  const chars = Math.max(1, [...text].length)
  return Math.min(max, Math.floor(widthPx / (chars * ratio)))
}

/** Only absurdly long names are shortened; normal names wrap onto the next line instead. */
export function truncateName(name: string, max = 40): string {
  const chars = [...name]
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : name
}

/** Never shrink text below this; long content gets smaller, but stays readable. */
const MIN_FIT_SCALE = 0.62

/**
 * Card body that always fits above the footer. When content is taller than the space
 * (big groups, long names, Russian/Uzbek text), it is scaled down as a whole and given
 * proportionally more width, so sentences stay complete instead of being cut or overlapping.
 */
function FitBody({ children }: { children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const body = bodyRef.current
    const inner = innerRef.current
    if (!body || !inner) return
    const fit = () => {
      const cs = getComputedStyle(body)
      const avail = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      // Widening the content changes how text wraps, so converge in a few steps.
      let scale = 1
      for (let i = 0; i < 4; i++) {
        inner.style.width = `${100 / scale}%`
        const next = Math.max(MIN_FIT_SCALE, Math.min(1, avail / inner.scrollHeight))
        if (Math.abs(next - scale) < 0.005) break
        scale = next
      }
      inner.style.width = scale < 1 ? `${100 / scale}%` : ''
      inner.style.transform = scale < 1 ? `scale(${scale})` : ''
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(inner)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={bodyRef} className="cw-card-body">
      <div ref={innerRef} className="cw-fit">
        {children}
      </div>
    </div>
  )
}

export function CardShell({
  palette,
  children,
  isStatic,
  label,
  decor,
  footer = 'default',
}: {
  palette: Palette
  children: ReactNode
  isStatic?: boolean
  label: string
  decor?: ReactNode
  footer?: 'default' | 'cta'
}) {
  const { t } = useI18n()
  return (
    <div
      role="group"
      aria-label={label}
      className={`cw-card ${isStatic ? 'cw-static' : ''}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: palette.bg,
        color: palette.fg,
        ['--accent' as string]: palette.accent,
        ['--accent2' as string]: palette.accent2,
        ['--panel' as string]: palette.panel,
        ['--muted' as string]: palette.muted,
        ['--fg' as string]: palette.fg,
        ['--bg' as string]: palette.bg,
      }}
    >
      {decor && (
        <div className="cw-decor" aria-hidden="true">
          {decor}
        </div>
      )}
      <FitBody>{children}</FitBody>
      <div className="cw-card-footer">
        <span className="cw-logo" aria-hidden="true">
          <LogoMark color={palette.fg} accent={palette.accent} />
        </span>
        <span>
          {footer === 'cta'
            ? t('card.footer.cta', { url: APP_CONFIG.displayUrl })
            : t('card.footer.made', { name: APP_CONFIG.name })}
        </span>
        {footer === 'default' && <span className="cw-footer-url">{APP_CONFIG.displayUrl}</span>}
      </div>
    </div>
  )
}

export function LogoMark({
  color,
  accent,
  size = 16,
}: {
  color: string
  accent: string
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M6 5h20a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H15l-7 6v-6H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z"
        fill={color}
      />
      <path
        d="M9 17l4-6 4 4 5-6"
        stroke={accent}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Kicker({ children, d = 0 }: { children: ReactNode; d?: number }) {
  return (
    <Anim d={d} kind="slide">
      <div className="cw-kicker">{children}</div>
    </Anim>
  )
}

/** Horizontal bar that grows from the left. */
export function Bar({
  fraction,
  color,
  d = 0,
  height = 14,
  track = 'var(--panel)',
}: {
  fraction: number
  color: string
  d?: number
  height?: number
  track?: string
}) {
  return (
    <div
      style={{ background: track, height, borderRadius: height, overflow: 'hidden', width: '100%' }}
    >
      <div
        className="cw-anim cw-grow-x"
        style={{
          width: `${Math.max(2, Math.min(100, fraction * 100))}%`,
          height: '100%',
          background: color,
          borderRadius: height,
          animationDelay: `${d}ms`,
        }}
      />
    </div>
  )
}
