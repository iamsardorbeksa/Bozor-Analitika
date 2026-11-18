/* Buyer-side helpers shared by the buyer pages: favourites, reason chips, confirm dialog, product → category lookup. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BadgeCheck, CircleDollarSign, PackageX, Sparkles, Star, Truck, Warehouse } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { Offer, OfferDetail, Page } from '@/api/types'
import { Badge } from '@/components/market'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useAuth } from '@/features/auth/AuthContext'
import { useCategories, useProducts } from '@/hooks/useCatalog'
import { formatNumber, formatUZS } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

// ---------------------------------------------------------------- favourites
/**
 * Save / unsave an offer with an optimistic flip of `is_favorite` in every cached offer list.
 * Logged-out visitors are sent to /login; non-buyers can't save.
 */
export function useFavoriteToggle() {
  const { t } = useTranslation(['buyer', 'common'])
  const { user } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const qc = useQueryClient()

  const m = useMutation({
    mutationFn: (o: Offer) => (o.is_favorite ? Api.removeFavorite(o.id) : Api.addFavorite(o.id)),
    onMutate: (o) => {
      const flip = (x: Offer) => (x.id === o.id ? { ...x, is_favorite: !o.is_favorite } : x)
      qc.setQueriesData<Page<Offer>>({ queryKey: ['offers'] }, (d) => (d?.items ? { ...d, items: d.items.map(flip) } : d))
      qc.setQueryData<OfferDetail>(['offer', o.id], (d) => (d ? { ...d, offer: flip(d.offer) } : d))
    },
    onSuccess: (_r, o) => toast.success(o.is_favorite ? t('buyer:saved.removedToast') : t('buyer:saved.addedToast')),
    onError: (e) => toast.error(errorMessage(e, t('common:toast.error'))),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['offers'] })
      void qc.invalidateQueries({ queryKey: ['offer'] })
      void qc.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const canSave = !user || user.role === 'buyer'
  const toggle = React.useCallback((o: Offer) => {
    if (!user) {
      navigate('/login', { state: { from: loc.pathname + loc.search } })
      return
    }
    if (user.role !== 'buyer') return
    m.mutate(o)
  }, [user, navigate, loc.pathname, loc.search, m])

  return { toggle, canSave, pendingId: m.isPending ? m.variables?.id : undefined }
}

// ---------------------------------------------------------------- reason codes
type Tone = 'brand' | 'saffron' | 'danger' | 'neutral' | 'info'

/** Translate a backend reason code ("more_expensive:120000", "quality:premium" …) into text + tone + icon. */
export function useReason() {
  const { t } = useTranslation(['buyer', 'common'])
  return React.useCallback((code: string): { label: string; tone: Tone; icon: React.ReactNode } => {
    const [key, raw = ''] = code.split(':')
    const n = Number(raw)
    switch (key) {
      case 'lowest_total':
        return { label: t('buyer:reasons.lowest_total'), tone: 'brand', icon: <CircleDollarSign /> }
      case 'more_expensive':
        return { label: t('buyer:reasons.more_expensive', { amount: formatUZS(n) }), tone: 'saffron', icon: <CircleDollarSign /> }
      case 'verified_supplier':
        return { label: t('buyer:reasons.verified_supplier'), tone: 'brand', icon: <BadgeCheck /> }
      case 'high_rating':
        return { label: t('buyer:reasons.high_rating', { rating: n.toFixed(1) }), tone: 'brand', icon: <Star /> }
      case 'quality':
        return { label: t('buyer:reasons.quality', { quality: t(`common:quality.${raw}`, raw) }), tone: raw === 'premium' || raw === 'first' ? 'brand' : 'neutral', icon: <Sparkles /> }
      case 'delivery_days':
        return { label: t('buyer:reasons.delivery_days', { days: n }), tone: 'info', icon: <Truck /> }
      case 'pickup_only':
        return { label: t('buyer:reasons.pickup_only'), tone: 'neutral', icon: <Warehouse /> }
      case 'insufficient_stock':
        return { label: t('buyer:reasons.insufficient_stock'), tone: 'danger', icon: <PackageX /> }
      case 'below_moq':
        return { label: t('buyer:reasons.below_moq', { qty: formatNumber(n) }), tone: 'danger', icon: <AlertTriangle /> }
      default:
        return { label: code, tone: 'neutral', icon: null }
    }
  }, [t])
}

export function ReasonChips({ reasons, className, max }: { reasons: string[]; className?: string; max?: number }) {
  const reason = useReason()
  const list = max ? reasons.slice(0, max) : reasons
  return (
    <div className={className ?? 'flex flex-wrap gap-1.5'}>
      {list.map((r) => {
        const x = reason(r)
        return <Badge key={r} tone={x.tone}>{x.icon}{x.label}</Badge>
      })}
    </div>
  )
}

// ---------------------------------------------------------------- confirm
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, loading, tone = 'danger' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode
  confirmLabel?: React.ReactNode; onConfirm: () => void; loading?: boolean; tone?: 'danger' | 'primary'
}) {
  const { t } = useTranslation('common')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description ?? t('confirm.delete')}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel ?? t('actions.confirm')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- catalog lookups
/** product_id → category slug, for ProductGlyph colours where the API only returns a product. */
export function useProductCategory() {
  const products = useProducts()
  const cats = useCategories()
  return React.useMemo(() => {
    const slugById = new Map((cats.data ?? []).map((c) => [c.id, c.slug]))
    const map = new Map<string, string>()
    for (const p of products.data ?? []) map.set(p.id, slugById.get(p.category_id) ?? 'other')
    return (productId?: string | null, categoryId?: string | null) =>
      (productId && map.get(productId)) || (categoryId && slugById.get(categoryId)) || 'other'
  }, [products.data, cats.data])
}

/** Small uppercase section label used across buyer pages. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ?? 'text-[11px] font-medium tracking-[0.08em] text-muted uppercase'}>{children}</div>
}
