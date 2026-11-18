/* Charts and blocks shared by admin pages. */
import { SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { AdminDashboard, DemandGap } from '@/api/types'
import { CHART, ChartTooltip, axisProps, shortDate } from '@/components/charts/theme'
import { Badge, catStyle, ProductSymbol } from '@/components/market'
import { EASE } from '@/components/seller/kit'
import { EmptyState } from '@/components/ui/feedback'
import { formatNumber, ln } from '@/lib/format'

export function SignupsChart({ data }: { data: AdminDashboard['signups'] }) {
  const { t } = useTranslation('admin')
  if (data.length === 0) return <EmptyState className="py-10" title={t('overview.noSignups')} />
  const total = data.reduce((s, x) => s + x.count, 0)
  return (
    <div>
      <p className="-mt-1 mb-2 text-xs text-muted">{t('overview.signupsTotal', { n: total })}</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={20} />
            <YAxis allowDecimals={false} {...axisProps} width={44} />
            <RTooltip content={<ChartTooltip labelFormat={shortDate} />} cursor={{ fill: '#fff4ee' }} />
            <Bar dataKey="count" name={t('overview.signupsSeries')} fill={CHART.brand} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Products people search for but that have fewer than 3 active offers. */
export function DemandGaps({ gaps }: { gaps: DemandGap[] }) {
  const { t } = useTranslation('admin')
  if (gaps.length === 0) return <EmptyState icon={<SearchX />} title={t('overview.noGaps')} className="py-8" />
  const max = Math.max(1, ...gaps.map((g) => g.searches))
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {gaps.map((g, i) => (
        <motion.div key={g.product_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ease: EASE }}
          className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium"><ProductSymbol emoji={g.emoji} size={17} /><span className="truncate">{ln(g, 'name')}</span></span>
            <Badge tone={g.active_offers === 0 ? 'danger' : 'saffron'}>{t('overview.offersCount', { count: g.active_offers })}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${(g.searches / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
            </div>
            <span className="font-mono text-xs text-ink-soft">{formatNumber(g.searches)}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">{t('overview.searches')}</p>
        </motion.div>
      ))}
    </div>
  )
}

/** Donut of offers per category with a legend list. */
export function CategoryDonut({ rows }: { rows: AdminDashboard['by_category'] }) {
  const { t } = useTranslation('admin')
  const [active, setActive] = React.useState<string | null>(null)
  const data = [...rows].sort((a, b) => b.offers - a.offers)
  const total = data.reduce((s, r) => s + r.offers, 0)
  if (total === 0) return <EmptyState className="py-10" />
  const cur = data.find((r) => r.slug === active)
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
      <div className="relative mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="offers" nameKey="slug" innerRadius={62} outerRadius={92} paddingAngle={1.5} stroke="none"
              onMouseLeave={() => setActive(null)} onMouseEnter={(_, i) => setActive(data[i]?.slug ?? null)}>
              {data.map((r) => <Cell key={r.slug} fill={catStyle(r.slug).accent} opacity={active && active !== r.slug ? 0.35 : 1} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-mono text-2xl font-semibold tabular">{formatNumber(cur ? cur.offers : total)}</div>
            <div className="max-w-[110px] truncate text-[11px] text-muted">{cur ? ln(cur, 'name') : t('analytics.totalOffers')}</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((r) => (
          <li key={r.slug} onMouseEnter={() => setActive(r.slug)} onMouseLeave={() => setActive(null)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] transition-colors hover:bg-paper">
            <span className="size-2.5 rounded-sm" style={{ background: catStyle(r.slug).accent }} />
            <span className="min-w-0 flex-1 truncate">{ln(r, 'name')}</span>
            <span className="font-mono text-xs tabular">{r.offers}</span>
            <span className="w-11 text-right font-mono text-xs text-muted tabular">{((r.offers / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
