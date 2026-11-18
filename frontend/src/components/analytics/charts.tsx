/* Analytics charts shared by Market Analytics and the AI analyst evidence cards. */
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { SeriesPoint } from '@/api/types'
import { CHART, ChartTooltip, axisProps, compactNum, shortDate } from '@/components/charts/theme'
import { formatDate, formatNumber } from '@/lib/format'

/** Average line + min–max band. */
export function PriceHistoryChart({ series, height = 280, compact = false }: { series: SeriesPoint[]; height?: number; compact?: boolean }) {
  const { t } = useTranslation('analytics')
  const data = React.useMemo(() => series.map((p) => ({ date: p.date, avg: p.avg, band: [p.min, p.max] as [number, number] })), [series])
  const gid = React.useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: compact ? -12 : 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`band-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={CHART.brand} stopOpacity={0.14} />
            <stop offset="1" stopColor={CHART.brand} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={24} />
        <YAxis {...axisProps} tickFormatter={compactNum} width={compact ? 44 : 52} domain={['auto', 'auto']} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as { avg: number; band: [number, number] }
            return (
              <ChartTooltip active label={String(label)} labelFormat={(l) => formatDate(l)}
                payload={[
                  { name: t('chart.avg'), value: row.avg, color: CHART.brand },
                  { name: t('chart.max'), value: row.band[1], color: '#ffb999' },
                  { name: t('chart.min'), value: row.band[0], color: '#ffb999' },
                ]} />
            )
          }}
        />
        <Area type="monotone" dataKey="band" stroke="none" fill={`url(#band-${gid})`} isAnimationActive={!compact} name={t('chart.range')} />
        <Line type="monotone" dataKey="avg" stroke={CHART.brand} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={t('chart.avg')} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export interface ForecastPoint { date: string; value: number; lower: number; upper: number }

/** History solid, forecast dashed with lower/upper band. */
export function ForecastChart({ history, forecast, height = 260, compact = false }: {
  history: SeriesPoint[]; forecast: ForecastPoint[]; height?: number; compact?: boolean
}) {
  const { t } = useTranslation('analytics')
  const data = React.useMemo(() => {
    const rows: { date: string; hist?: number; fc?: number; band?: [number, number] }[] = history.map((p) => ({ date: p.date, hist: p.avg }))
    if (rows.length && forecast.length) {
      const last = rows[rows.length - 1]
      last.fc = last.hist
      last.band = [last.hist!, last.hist!]
    }
    forecast.forEach((f) => rows.push({ date: f.date, fc: f.value, band: [f.lower, f.upper] }))
    return rows
  }, [history, forecast])
  const splitDate = history.length ? history[history.length - 1].date : undefined
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: compact ? -12 : 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={24} />
        <YAxis {...axisProps} tickFormatter={compactNum} width={compact ? 44 : 52} domain={['auto', 'auto']} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as { hist?: number; fc?: number; band?: [number, number] }
            const items = row.hist != null
              ? [{ name: t('chart.actual'), value: row.hist, color: CHART.brand }]
              : [
                { name: t('chart.forecast'), value: row.fc, color: CHART.saffron },
                { name: t('chart.upper'), value: row.band?.[1], color: '#f2c79a' },
                { name: t('chart.lower'), value: row.band?.[0], color: '#f2c79a' },
              ]
            return <ChartTooltip active label={String(label)} labelFormat={(l) => formatDate(l)} payload={items} />
          }}
        />
        {splitDate && <ReferenceLine x={splitDate} stroke={CHART.axis} strokeDasharray="2 4" />}
        <Area type="monotone" dataKey="band" stroke="none" fill={CHART.saffron} fillOpacity={0.14} isAnimationActive={!compact} />
        <Line type="monotone" dataKey="hist" stroke={CHART.brand} strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="fc" stroke={CHART.saffron} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Horizontal bar chart of regional averages; national average as reference line. */
export function RegionalBarChart({ rows, national }: { rows: { name: string; avg: number }[]; national?: number | null }) {
  const { t } = useTranslation('analytics')
  const max = Math.max(...rows.map((r) => r.avg))
  const min = Math.min(...rows.map((r) => r.avg))
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 30 + 30)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={compactNum} domain={[0, 'auto']} />
        <YAxis type="category" dataKey="name" {...axisProps} width={104} />
        <Tooltip cursor={{ fill: '#fff4ee' }}
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} label={String(label)}
              payload={payload?.map((p) => ({ name: t('chart.avg'), value: Number(p.value), color: CHART.brand }))} />
          )} />
        {national != null && <ReferenceLine x={national} stroke={CHART.forest} strokeDasharray="4 3" label={{ value: t('regional.national'), position: 'top', fontSize: 10.5, fill: CHART.axis }} />}
        <Bar dataKey="avg" radius={[0, 5, 5, 0]} barSize={16}>
          {rows.map((r) => <Cell key={r.name} fill={r.avg === min ? CHART.emerald : r.avg === max ? CHART.danger : '#c9ccd2'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Small horizontal bar list without a chart lib — used in dense evidence cards. */
export function BarList({ rows, format = (v: number) => formatNumber(v) }: { rows: { label: string; value: number; note?: React.ReactNode; highlight?: 'good' | 'bad' }[]; format?: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[96px_1fr_auto] items-center gap-2 text-xs sm:grid-cols-[120px_1fr_auto]">
          <span className="truncate text-ink-soft">{r.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.highlight === 'good' ? CHART.emerald : r.highlight === 'bad' ? CHART.danger : '#c9ccd2' }} />
          </div>
          <span className="flex items-center gap-2 font-mono tabular text-ink">{format(r.value)}{r.note}</span>
        </div>
      ))}
    </div>
  )
}
