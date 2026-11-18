import { motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'
import { formatNumber, shortDateSafe } from './util'
import { cn } from '@/lib/utils'

/** One easing curve for the whole page: quick start, long settle — feels "precise", not bouncy. */
export const EASE = [0.16, 1, 0.3, 1] as const

export function useIsMobile(bp = 768) {
  const [m, setM] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  React.useEffect(() => {
    const h = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

/** Scroll reveal: a short upward settle. Used for section-level blocks only, not every line. */
export function Reveal({ children, delay = 0, y = 20, className, as = 'div' }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'li' | 'article'
}) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </M>
  )
}

/** Clip reveal for interface previews: the panel "opens" upward like a screen being uncovered. */
export function ClipReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className}
      initial={reduce ? false : { clipPath: 'inset(18% 0% 0% 0% round 18px)', opacity: 0.4, y: 30 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 18px)', opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1, delay, ease: EASE }}>
      {children}
    </motion.div>
  )
}

/** Numbered editorial section header: "03 — The problem" + headline. */
export function SectionHead({ index, eyebrow, title, sub, light, center, className }: {
  index: string; eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; light?: boolean; center?: boolean; className?: string
}) {
  return (
    <Reveal className={cn('mb-12 max-w-[760px] md:mb-16', center && 'mx-auto text-center', className)}>
      <p className={cn('mb-5 flex items-center gap-3 font-mono text-[11.5px] font-semibold tracking-[0.14em] uppercase', center && 'justify-center', light ? 'text-brand' : 'text-brand-600')}>
        <span className="tabular">{index}</span>
        <span className={cn('h-px w-8', light ? 'bg-white/25' : 'bg-brand/40')} />
        {eyebrow}
      </p>
      <h2 className={cn('text-[34px] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance md:text-[52px]', light ? 'text-white' : 'text-ink')}>{title}</h2>
      {sub && <p className={cn('mt-5 max-w-[600px] text-[16.5px] leading-relaxed text-pretty', center && 'mx-auto', light ? 'text-white/60' : 'text-muted')}>{sub}</p>}
    </Reveal>
  )
}

export interface ChartPoint { date: string; value: number }

/**
 * Line chart that draws itself when scrolled into view and reveals the exact value on hover.
 * Pure SVG (no chart library) so it stays light and fully controllable.
 */
export function DrawChart({ points, height = 160, color = '#ff5a1f', dark, className, valueFormat = formatNumber, startDelay = 0, showAxis = true }: {
  points: ChartPoint[]; height?: number; color?: string; dark?: boolean; className?: string; valueFormat?: (v: number) => string; startDelay?: number; showAxis?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [w, setW] = React.useState(400)
  const [hover, setHover] = React.useState<number | null>(null)
  const id = React.useId()
  React.useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  if (points.length < 2) return <div ref={ref} style={{ height }} className={className} />
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const pad = (max - min) * 0.18 || max * 0.05 || 1
  const lo = min - pad, hi = max + pad
  const padB = showAxis ? 18 : 4
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (height - 6 - padB)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points.length - 1
  const hv = hover ?? null
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect()
    setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last))))
  }
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,19,23,0.07)'
  const axis = dark ? 'rgba(255,255,255,0.35)' : '#8a8f99'
  return (
    <div ref={ref} className={cn('relative select-none', className)} style={{ height }}>
      <svg width={w} height={height} className="block overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
        aria-label={`${valueFormat(vals[0])} → ${valueFormat(vals[last])}`}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={dark ? 0.32 : 0.2} />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={w} y1={6 + f * (height - 6 - padB)} y2={6 + f * (height - 6 - padB)} stroke={grid} />)}
        <motion.path d={`${d} L${w},${height - padB} L0,${height - padB} Z`} fill={`url(#${id})`}
          initial={reduce ? false : { opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.8, delay: startDelay + 0.6 }} />
        <motion.path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.4, delay: startDelay, ease: EASE }} />
        <motion.circle cx={x(last)} cy={y(vals[last])} r={4} fill={color} stroke={dark ? '#111317' : '#fff'} strokeWidth={2}
          initial={reduce ? false : { scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ delay: startDelay + 1.3, type: 'spring', stiffness: 400, damping: 18 }} />
        {showAxis && [0, Math.floor(last / 2), last].map((i) => (
          <text key={i} x={x(i)} y={height - 3} fontSize={10.5} fill={axis} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontFamily="var(--font-mono)">{shortDateSafe(points[i].date)}</text>
        ))}
        {hv !== null && (
          <g pointerEvents="none">
            <line x1={x(hv)} x2={x(hv)} y1={0} y2={height - padB} stroke={axis} strokeDasharray="3 3" />
            <circle cx={x(hv)} cy={y(vals[hv])} r={4.5} fill={dark ? '#111317' : '#fff'} stroke={color} strokeWidth={2} />
          </g>
        )}
      </svg>
      {hv !== null && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-white shadow-lg"
          style={{ left: Math.min(Math.max(x(hv), 44), w - 44) }}>
          <span className="text-white/55">{shortDateSafe(points[hv].date)}</span> {valueFormat(vals[hv])}
        </div>
      )}
    </div>
  )
}
