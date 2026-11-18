import { useQuery } from '@tanstack/react-query'
import { Megaphone, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { TendersApi, type BoardQuery } from '@/api/tenders'
import { TenderCard } from '@/components/tenders/parts'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/input'
import { PageHeader, Pagination, StatCard } from '@/components/ui/layout'
import { Switch } from '@/components/ui/primitives'
import { useCategories, useRegions } from '@/hooks/useCatalog'
import { useDebounced } from '@/hooks/useScrollTop'
import { ln } from '@/lib/format'
import { cn } from '@/lib/utils'

const SORTS: NonNullable<BoardQuery['sort']>[] = ['newest', 'closing_soon', 'budget_asc', 'budget_desc', 'qty_asc', 'qty_desc', 'value_desc', 'fewest_bids', 'needed_soon']
const QUICK = [
  { key: 'cheap', q: { sort: 'budget_asc' } },
  { key: 'small', q: { sort: 'qty_asc' } },
  { key: 'big', q: { sort: 'value_desc' } },
  { key: 'urgent', q: { sort: 'closing_soon', closing_days: '2' } },
  { key: 'noBids', q: { sort: 'fewest_bids' } },
] as const

export default function TenderBoard() {
  const { t } = useTranslation(['tenders', 'common'])
  const cats = useCategories()
  const regions = useRegions()
  const [sp, setSp] = useSearchParams()
  const [showFilters, setShowFilters] = React.useState(false)
  const get = (k: string) => sp.get(k) ?? ''
  const set = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) }
    if (!('page' in patch)) n.delete('page')
    setSp(n, { replace: true })
  }
  const [q, setQ] = React.useState(get('q'))
  const dq = useDebounced(q, 350)
  React.useEffect(() => { if (dq !== get('q')) set({ q: dq || null }) }, [dq]) // eslint-disable-line react-hooks/exhaustive-deps

  const num = (k: string) => (get(k) ? Number(get(k)) : undefined)
  const query: BoardQuery = {
    q: get('q') || undefined, category: get('category') || undefined, region_id: get('region') || undefined,
    min_qty: num('min_qty'), max_qty: num('max_qty'), max_budget: num('max_budget'), min_budget: num('min_budget'),
    matching: get('matching') === '1', hide_mine: get('hide') === '1', closing_days: num('closing_days'),
    sort: (get('sort') || 'newest') as BoardQuery['sort'], page: num('page') ?? 1, page_size: 18,
  }
  const list = useQuery({ queryKey: ['tenders', 'board', query], queryFn: () => TendersApi.board(query), placeholderData: (p) => p })
  const summary = useQuery({ queryKey: ['tenders', 'summary'], queryFn: TendersApi.summary })
  const activeFilters = ['category', 'region', 'min_qty', 'max_qty', 'max_budget', 'min_budget', 'matching', 'hide', 'closing_days', 'q'].filter((k) => get(k)).length

  return (
    <div>
      <PageHeader eyebrow={t('board.eyebrow')} title={t('nav.board')} description={t('board.description')} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('board.statMatching')} value={summary.data?.open_matching ?? '—'} tone="brand" />
        <StatCard label={t('board.statAll')} value={summary.data?.open_all ?? '—'} delay={0.05} />
        <StatCard label={t('board.statMyBids')} value={summary.data?.my_bids ?? '—'} delay={0.1} />
        <StatCard label={t('board.statToSign')} value={summary.data?.to_sign ?? '—'} tone="dark" delay={0.15} />
      </div>

      {/* quick sorts: "cheapest", "smallest quantity", ... */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin md:mx-0 md:px-0">
        {QUICK.map((x) => {
          const on = Object.entries(x.q).every(([k, v]) => get(k) === v)
          return (
            <button key={x.key} onClick={() => set(on ? { sort: null, closing_days: null } : { closing_days: null, ...x.q })}
              className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                on ? 'border-ink bg-ink text-white' : 'border-line bg-white/80 hover:border-line-strong')}>
              {t(`board.quick.${x.key}`)}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex-1"><Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('board.search')} aria-label={t('board.search')} /></div>
        <div className="flex gap-2">
          <Select value={get('category')} onChange={(e) => set({ category: e.target.value || null })} aria-label={t('form.category')} className="md:w-52">
            <option value="">{t('board.allCategories')}</option>
            {(cats.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{ln(c, 'name')}</option>)}
          </Select>
          <Select value={get('sort') || 'newest'} onChange={(e) => set({ sort: e.target.value === 'newest' ? null : e.target.value })} aria-label={t('board.sortLabel')} className="md:w-56">
            {SORTS.map((s) => <option key={s} value={s}>{t(`board.sort.${s}`)}</option>)}
          </Select>
          <Button variant={showFilters ? 'primary' : 'outline'} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal />{t('board.filters')}{activeFilters ? <span className="font-mono text-xs">({activeFilters})</span> : null}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-5 grid gap-4 rounded-2xl border border-line bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('form.region')}>
            <Select value={get('region')} onChange={(e) => set({ region: e.target.value || null })}>
              <option value="">{t('board.allRegions')}</option>
              {(regions.data ?? []).map((r) => <option key={r.id} value={r.id}>{ln(r, 'name')}</option>)}
            </Select>
          </Field>
          <Field label={t('board.qtyRange')}>
            <div className="flex gap-2">
              <Input type="number" min={0} placeholder={t('board.from')} value={get('min_qty')} onChange={(e) => set({ min_qty: e.target.value || null })} />
              <Input type="number" min={0} placeholder={t('board.to')} value={get('max_qty')} onChange={(e) => set({ max_qty: e.target.value || null })} />
            </div>
          </Field>
          <Field label={t('board.budgetRange')}>
            <div className="flex gap-2">
              <Input type="number" min={0} placeholder={t('board.from')} value={get('min_budget')} onChange={(e) => set({ min_budget: e.target.value || null })} />
              <Input type="number" min={0} placeholder={t('board.to')} value={get('max_budget')} onChange={(e) => set({ max_budget: e.target.value || null })} />
            </div>
          </Field>
          <Field label={t('board.closingWithin')}>
            <Select value={get('closing_days')} onChange={(e) => set({ closing_days: e.target.value || null })}>
              <option value="">{t('board.anyTime')}</option>
              {[1, 2, 3, 7].map((d) => <option key={d} value={d}>{t('board.days', { count: d })}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2.5 text-sm"><Switch checked={get('matching') === '1'} onCheckedChange={(v: boolean) => set({ matching: v ? '1' : null })} />{t('board.matchingOnly')}</label>
          <label className="flex items-center gap-2.5 text-sm"><Switch checked={get('hide') === '1'} onCheckedChange={(v: boolean) => set({ hide: v ? '1' : null })} />{t('board.hideAnswered')}</label>
          <div className="sm:col-span-2 lg:col-span-2 lg:text-right">
            <Button variant="ghost" size="sm" onClick={() => { setQ(''); setSp(new URLSearchParams(), { replace: true }) }}><RotateCcw />{t('board.reset')}</Button>
          </div>
        </div>
      )}

      <div className="mb-3 text-[13px] text-muted">{list.data ? t('board.found', { count: list.data.total }) : ' '}</div>
      {list.isLoading ? <SkeletonList rows={3} className="[&>div]:h-48" />
        : list.isError ? <ErrorState onRetry={() => list.refetch()} />
          : !list.data?.items.length ? (
            <EmptyState icon={<Megaphone />} title={t('board.emptyTitle')} description={t('board.emptyHint')}
              action={activeFilters ? <Button variant="outline" onClick={() => { setQ(''); setSp(new URLSearchParams(), { replace: true }) }}>{t('board.reset')}</Button> : undefined} />
          ) : (
            <>
              <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity', list.isFetching && 'opacity-70')}>
                {list.data.items.map((x, i) => <TenderCard key={x.id} tender={x} index={i} to={`/app/seller/tenders/${x.id}`} />)}
              </div>
              {list.data.pages > 1 && <div className="mt-6"><Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} pageSize={list.data.page_size} onChange={(p) => set({ page: String(p) })} /></div>}
            </>
          )}
    </div>
  )
}
