// Small building blocks shared by the agent cards and the plan card.
import * as React from 'react'
import type { AgentOffer, AgentRunResult, PlannerItem } from '@/api/agents'
import { useAuth } from '@/features/auth/AuthContext'
import { formatNumber, formatPct, formatUZS } from '@/lib/format'

export const som = (v: number | null | undefined) => formatUZS(v)
export const mln = (v: number | null | undefined) => formatUZS(v, { compact: true })
export const pct = (v: number | null | undefined, digits = 1) => formatPct(v, digits)
export const absPct = (v: number | null | undefined) => formatPct(v == null ? v : Math.abs(v)).replace('+', '')

/** product_id -> planner item (name, emoji, unit) */
export function useProducts(result: AgentRunResult | null) {
  return React.useMemo(() => {
    const m = new Map<string, PlannerItem>()
    result?.planner.items.forEach((it) => m.set(it.product_id, it))
    return m
  }, [result])
}

/** Public offer page or the in-app one when signed in. */
export function useOfferHref() {
  const { user } = useAuth()
  return React.useCallback((o: Pick<AgentOffer, 'offer_id'>) => `${user ? '/app/market' : '/market'}/${o.offer_id}`, [user])
}

export function Emoji({ e, size = 16 }: { e?: string | null; size?: number }) {
  if (!e) return null
  return <span className="emoji" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>{e}</span>
}

/** A number that counts up (ease-out). Always lands on the real value. */
export function CountUp({ to, format = (v: number) => formatNumber(Math.round(v)), ms = 800 }: { to: number; format?: (v: number) => string; ms?: number }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [v, setV] = React.useState(reduce ? to : 0)
  React.useEffect(() => {
    if (reduce) { setV(to); return }
    let raf = 0
    const start = performance.now()
    const from = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      setV(from + (to - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const done = setTimeout(() => setV(to), ms + 120)
    return () => { cancelAnimationFrame(raf); clearTimeout(done) }
  }, [to, ms, reduce])
  return <>{format(v)}</>
}

/** Dallol's price strip: min … best … market average … max, with the compared offers as dots. */
export function PriceRange({ prices, best, avg, avgLabel }: { prices: number[]; best: number; avg: number | null; avgLabel: string }) {
  const all = [...prices, best, ...(avg != null ? [avg] : [])]
  const lo = Math.min(...all), hi = Math.max(...all)
  const x = (p: number) => `${hi === lo ? 50 : 3 + (94 * (p - lo)) / (hi - lo)}%`
  return (
    <div className="ba-prange" aria-hidden>
      <div className="ba-pr-bar">
        {prices.map((p, i) => <i key={i} className="ba-pr-dot" style={{ left: x(p) }} />)}
        {avg != null && <i className="ba-pr-avg" style={{ left: x(avg) }} />}
        <i className="ba-pr-best" style={{ left: x(best) }} />
      </div>
      <div className="ba-pr-labels">
        <span>{formatNumber(lo)}</span>
        {avg != null && <span className="avg">┃ {avgLabel} {formatNumber(avg)}</span>}
        <span>{formatNumber(hi)}</span>
      </div>
    </div>
  )
}

/** Tarozibon ota's mini chart: last 30 daily averages + a dashed forecast segment. */
export function Spark({ data, forecastPct, horizon = 7 }: { data: number[]; forecastPct: number | null; horizon?: number }) {
  const id = React.useId()
  if (!data || data.length < 2) return null
  const last = data[data.length - 1]
  const fc = forecastPct != null ? last * (1 + forecastPct / 100) : null
  const extra = fc != null ? Math.max(3, Math.round((horizon / 30) * data.length)) : 0
  const n = data.length + extra
  const vals = fc != null ? [...data, fc] : data
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const X = (i: number) => (100 * i) / (n - 1)
  const Y = (v: number) => (hi === lo ? 16 : 30 - (26 * (v - lo)) / (hi - lo))
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(' ')
  const rising = last >= data[0]
  const c = rising ? '#b45f00' : '#12855a'
  return (
    <svg className="ba-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity=".22" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${X(data.length - 1)},32 L0,32 Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={c} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {fc != null && (
        <path d={`M${X(data.length - 1)},${Y(last)} L${X(n - 1)},${Y(fc)}`} fill="none" stroke="#5d6370" strokeWidth={2}
          strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}
