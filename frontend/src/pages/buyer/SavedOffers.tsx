import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Scale, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Api } from '@/api/endpoints'
import type { Favorite, Offer } from '@/api/types'
import { OfferCard } from '@/components/market/OfferCard'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { PageHeader, Segmented } from '@/components/ui/layout'
import { formatDate } from '@/lib/format'
import { errorMessage } from '@/lib/utils'

type SortKey = 'recent' | 'price'

export default function SavedOffers() {
  const { t } = useTranslation(['buyer', 'common'])
  const qc = useQueryClient()
  const favs = useQuery({ queryKey: ['favorites'], queryFn: Api.favorites })
  const [sort, setSort] = React.useState<SortKey>('recent')

  const remove = useMutation({
    mutationFn: (o: Offer) => Api.removeFavorite(o.id),
    onMutate: async (o) => {
      await qc.cancelQueries({ queryKey: ['favorites'] })
      const prev = qc.getQueryData<Favorite[]>(['favorites'])
      qc.setQueryData<Favorite[]>(['favorites'], (d) => d?.filter((f) => f.offer.id !== o.id))
      return { prev }
    },
    onSuccess: (_r, o) => toast.success(t('buyer:saved.removedToast'), {
      action: { label: t('buyer:saved.undo'), onClick: () => { void Api.addFavorite(o.id).then(() => qc.invalidateQueries({ queryKey: ['favorites'] })) } },
    }),
    onError: (e, _o, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev)
      toast.error(errorMessage(e, t('common:toast.error')))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['favorites'] })
      void qc.invalidateQueries({ queryKey: ['offers'] })
      void qc.invalidateQueries({ queryKey: ['offer'] })
    },
  })

  const items = React.useMemo(() => {
    const list = [...(favs.data ?? [])]
    if (sort === 'price') list.sort((a, b) => a.offer.unit_price - b.offer.unit_price)
    else list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return list
  }, [favs.data, sort])

  return (
    <div>
      <PageHeader title={t('common:nav.savedOffers')} description={t('buyer:saved.description')}
        actions={favs.data && favs.data.length > 1 ? (
          <Segmented id="saved-sort" size="sm" value={sort} onChange={setSort}
            options={[{ value: 'recent', label: t('buyer:saved.sortRecent') }, { value: 'price', label: t('buyer:saved.sortPrice') }]} />
        ) : undefined} />

      {favs.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[280px] rounded-[var(--radius-card)]" />)}</div>
      ) : favs.isError || !favs.data ? (
        <ErrorState onRetry={() => favs.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bookmark />} title={t('buyer:saved.emptyTitle')} description={t('buyer:saved.emptyHint')}
          action={<Button asChild><Link to="/app/market"><Search />{t('buyer:saved.browse')}</Link></Button>} />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {items.map((f, i) => (
              <motion.div key={f.id} layout exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col">
                <OfferCard offer={{ ...f.offer, is_favorite: true }} index={i} to={`/app/market/${f.offer.id}`}
                  onToggleSave={(o) => remove.mutate(o)} saving={remove.isPending && remove.variables?.id === f.offer.id} className="flex-1" />
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="text-[11.5px] text-muted">{t('buyer:saved.savedOn', { date: formatDate(f.created_at) })}</span>
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12.5px]">
                    <Link to={`/app/compare?product=${f.offer.product_id}&qty=${Math.max(f.offer.min_order_qty, 100)}`}><Scale />{t('buyer:saved.compare')}</Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
