import { formatNumber } from '@/lib/format'

/** Shared Recharts styling so every chart looks like one system. */
export const CHART = {
  grid: 'rgba(17,19,23,.08)',
  axis: '#8a8f99',
  brand: '#ff5a1f',
  emerald: '#12855a',
  forest: '#111317',
  saffron: '#b45f00',
  danger: '#c0352b',
  series: ['#ff5a1f', '#111317', '#12855a', '#3b5bdb', '#b45f00', '#8a8f99'],
  tick: { fontSize: 11.5, fill: '#8a8f99' },
}

export const axisProps = { tickLine: false, axisLine: false, tick: CHART.tick } as const

export const shortDate = (d: string) => {
  const dt = new Date(d)
  return `${dt.getDate()}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export const compactNum = (v: number) =>
  Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v))

/** Glass tooltip card used by all charts: <Tooltip content={<ChartTooltip />} /> */
export function ChartTooltip({ active, payload, label, valueFormat = (v: number) => formatNumber(v), labelFormat }: {
  active?: boolean; payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]; label?: string
  valueFormat?: (v: number) => string; labelFormat?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-ink shadow-[var(--shadow-lift)] backdrop-blur">
      {label != null && <div className="mb-1 text-muted">{labelFormat ? labelFormat(String(label)) : label}</div>}
      {payload.filter((p) => p.value != null).map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-soft">{p.name}</span>
          <span className="ml-auto pl-3 font-mono font-semibold tabular">{valueFormat(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}
