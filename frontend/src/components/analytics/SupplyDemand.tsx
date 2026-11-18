import { Eye, FileQuestion, Info, Layers, PackageOpen, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { SupplyDemand } from '@/api/types'
import { Badge } from '@/components/market'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const SIGNAL_TONE = { demand_gap: 'danger', undersupplied: 'saffron', oversupplied: 'info', balanced: 'brand' } as const

export function SignalBadge({ signal }: { signal: SupplyDemand['estimated']['signal'] }) {
  const { t } = useTranslation('analytics')
  return <Badge tone={SIGNAL_TONE[signal] ?? 'neutral'}>{t(`sd.signal.${signal}`, '—')}</Badge>
}

/** OBSERVED platform counts vs ESTIMATED interest index — kept visually separate on purpose. */
export function SupplyDemandPanel({ data, unit, dense = false }: { data: Pick<SupplyDemand, 'observed' | 'estimated' | 'period_days'>; unit?: string; dense?: boolean }) {
  const { t } = useTranslation('analytics')
  const o = data.observed, e = data.estimated
  const metrics = [
    { icon: Layers, label: t('sd.activeOffers'), value: formatNumber(o.active_offers) },
    { icon: PackageOpen, label: t('sd.totalQty'), value: `${formatNumber(o.total_available_qty)}${unit ? ` ${t(`common:units.${unit}`, unit)}` : ''}` },
    { icon: FileQuestion, label: t('sd.inquiries'), value: formatNumber(o.purchase_inquiries) },
    { icon: Eye, label: t('sd.views'), value: formatNumber(o.offer_views) },
    { icon: Search, label: t('sd.searches'), value: formatNumber(o.searches) },
    { icon: Info, label: t('sd.ratio'), value: o.inquiry_to_offer_ratio == null ? '—' : o.inquiry_to_offer_ratio.toFixed(2) },
  ]
  return (
    <div className={cn('grid gap-3', !dense && 'lg:grid-cols-[1.4fr_1fr]')}>
      <div className="rounded-xl border border-line bg-white p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-brand uppercase">{t('sd.observed')}</span>
          <span className="text-[11.5px] text-muted">{t('sd.period', { days: data.period_days })}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-paper px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted"><m.icon className="size-3.5" />{m.label}</div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold tabular text-ink">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-[#e0a868] bg-saffron-50/50 p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-[#8a4a00] uppercase">{t('sd.estimated')}</span>
          <SignalBadge signal={e.signal} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[11.5px] text-muted">{t('sd.interestIndex')}</div>
            <div className="font-mono text-2xl font-semibold tabular text-ink">{e.interest_index}<span className="text-sm font-normal text-muted">/100</span></div>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] text-muted">{t('sd.supplyLevel')}</div>
            <div className="text-sm font-medium">{t(`sd.level.${e.supply_level}`, e.supply_level)}</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${e.interest_index}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <p className="mt-2.5 text-[11.5px] leading-snug text-[#8a4a00]">{t('sd.disclaimer')}</p>
      </div>
    </div>
  )
}
