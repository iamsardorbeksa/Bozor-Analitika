import { Bookmark, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Offer } from '@/api/types'
import { currencyLabel, formatNumber, uz } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DeliveryInfo, FreshnessBadge, ProductGlyph, QualityBadge, SourceBadge, VerifiedBadge, catStyle, offerName } from '.'

/**
 * Offer card styled as a bazaar price tag: a notched left edge, punched hole,
 * and the price set in mono like a hand-written tag.
 */
export function OfferCard({ offer, to, onToggleSave, saving, index = 0, className }: {
  offer: Offer; to: string; onToggleSave?: (o: Offer) => void; saving?: boolean; index?: number; className?: string
}) {
  const { t } = useTranslation()
  const s = catStyle(offer.category_slug)
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.035, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn('group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-white/[0.82] shadow-[var(--shadow-card)] backdrop-blur-xl transition-shadow hover:shadow-[var(--shadow-lift)]', className)}
    >
      <Link to={to} className="absolute inset-0 z-0 rounded-[var(--radius-card)]" aria-label={offerName(offer)} />
      <div className="pointer-events-none relative flex items-start gap-3 p-4 pb-3">
        <ProductGlyph category={offer.category_slug} name={offerName(offer)} image={offer.image_url} emoji={offer.product_emoji} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold tracking-[-0.02em]">{offerName(offer)}</h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
            <span className="truncate">{uz(offer.business.name)}</span>
            <VerifiedBadge status={offer.business.verification_status} compact />
          </p>
        </div>
        {onToggleSave && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(offer) }} disabled={saving}
            aria-label={offer.is_favorite ? t('actions.unsave') : t('actions.saveOffer')} aria-pressed={offer.is_favorite}
            className={cn('pointer-events-auto relative z-10 -m-1 rounded-lg p-1.5 transition-colors hover:bg-ink/5', offer.is_favorite ? 'text-brand' : 'text-[#8a8f99]')}>
            <Bookmark className={cn('size-[18px]', offer.is_favorite && 'fill-brand')} />
          </button>
        )}
      </div>

      {/* the tag */}
      <div className="pointer-events-none relative mx-4 flex items-end justify-between rounded-[10px] py-2.5 pr-3 pl-6 tag-shape" style={{ background: s.bg }}>
        <span className="absolute top-1/2 left-[9px] size-[6px] -translate-y-1/2 rounded-full bg-white ring-1 ring-black/5" aria-hidden />
        <div>
          <div className="font-mono text-[22px] leading-none font-bold tracking-[-0.03em]" style={{ color: s.fg }}>
            {formatNumber(offer.unit_price)}
          </div>
          <div className="mt-1 text-[11px] text-ink-soft/70">{currencyLabel()} · {t('fields.perUnit', { unit: t(`units.${offer.unit}`) })}</div>
        </div>
        {offer.source_site ? <SourceBadge site={offer.source_site} url={offer.source_url} link /> : <QualityBadge quality={offer.quality} />}
      </div>

      {offer.source_site ? (
        <p className="pointer-events-none relative line-clamp-2 px-4 pt-3 text-[12.5px] text-ink-soft" title={offer.title}>{offer.title}</p>
      ) : (
        <div className="pointer-events-none relative grid grid-cols-2 gap-x-3 gap-y-1.5 px-4 pt-3 text-[12.5px]">
          <div><span className="text-muted">{t('fields.available')}: </span><span className="font-medium tabular">{formatNumber(offer.available_qty)} {t(`units.${offer.unit}`)}</span></div>
          <div className="text-right"><span className="text-muted">{t('fields.moq')}: </span><span className="font-medium tabular">{formatNumber(offer.min_order_qty)}</span></div>
        </div>
      )}
      <div className="pointer-events-none relative mt-auto flex items-center justify-between gap-2 border-t border-dashed border-line px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{uz(offer.market_name ?? (offer.source_site === 'olx.uz' && offer.location_note ? offer.location_note : offer.region_name))}</span></span>
        <FreshnessBadge updatedAt={offer.updated_at} />
      </div>
      {!offer.source_site && <div className="pointer-events-none relative px-4 pb-3"><DeliveryInfo offer={offer} /></div>}
    </motion.article>
  )
}
