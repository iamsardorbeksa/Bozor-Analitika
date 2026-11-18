import { Check, ChevronsUpDown, Search } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, Product } from '@/api/types'
import { ProductGlyph, ProductSymbol, catStyle } from '@/components/market'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/feedback'
import { useCategories, useProducts } from '@/hooks/useCatalog'
import { ln } from '@/lib/format'
import { searchProducts } from '@/lib/search'
import { cn } from '@/lib/utils'

const LIMIT = 80

/**
 * Searchable product combobox (matches across all three languages). Without a query it lists the
 * catalogue grouped by category; with a query it ranks the best matches first. Results are capped
 * so a catalogue of several hundred products stays responsive.
 */
export function ProductPicker({ value, onChange, className, invalid, id, categoryId, placeholder }: {
  value: string | null | undefined; onChange: (p: Product) => void; className?: string; invalid?: boolean; id?: string
  /** restrict the list to one category */
  categoryId?: string | null; placeholder?: string
}) {
  const { t } = useTranslation(['buyer', 'common'])
  const products = useProducts()
  const cats = useCategories()
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const query = React.useDeferredValue(q)
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  const catById = React.useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data])
  const selected = products.data?.find((p) => p.id === value)

  const ordered = React.useMemo(() => {
    const rank = new Map((cats.data ?? []).map((c, i) => [c.id, i]))
    return (products.data ?? []).filter((p) => !categoryId || p.category_id === categoryId).sort((a, b) => (rank.get(a.category_id) ?? 999) - (rank.get(b.category_id) ?? 999))
  }, [products.data, cats.data, categoryId])
  const result = React.useMemo(() => searchProducts(ordered, query, LIMIT), [ordered, query])
  const searching = !!query.trim()
  const flat = result.items

  const groups = React.useMemo(() => {
    if (searching) return [{ cat: undefined as Category | undefined, items: flat, flat: true }]
    const out: { cat: Category | undefined; items: Product[]; flat: boolean }[] = []
    for (const p of flat) {
      const cat = catById.get(p.category_id)
      const last = out[out.length - 1]
      if (last && last.cat?.id === cat?.id) last.items.push(p)
      else out.push({ cat, items: [p], flat: false })
    }
    return out
  }, [flat, searching, catById])
  const indexOf = React.useMemo(() => new Map(flat.map((p, i) => [p.id, i])), [flat])

  React.useEffect(() => setActive(0), [query])
  React.useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (p: Product) => {
    onChange(p)
    setOpen(false)
    setQ('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); pick(flat[active]) }
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}>
      <PopoverTrigger asChild>
        <button id={id} type="button" aria-invalid={invalid || undefined}
          className={cn('flex h-10 w-full items-center gap-2.5 rounded-xl border border-line-strong bg-white/90 pr-3 pl-1.5 text-left text-sm transition-[border,box-shadow] hover:border-[#c3c6cc] focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,90,31,.14)] focus:outline-none aria-[invalid=true]:border-danger',
            !selected && 'pl-3', className)}>
          {selected && <ProductGlyph category={catById.get(selected.category_id)?.slug} name={ln(selected, 'name')} emoji={selected.emoji ?? undefined} size={28} className="rounded-lg [&_svg]:size-3.5" />}
          <span className={cn('flex-1 truncate', !selected && 'text-[#8a8f99]')}>
            {selected ? ln(selected, 'name') : placeholder ?? t('buyer:picker.placeholder')}
          </span>
          {selected && <span className="text-xs text-muted">{t(`common:units.${selected.unit}`, selected.unit)}</span>}
          <ChevronsUpDown className="size-4 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0">
        <div className="border-b border-line p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder={t('buyer:picker.search')} aria-label={t('buyer:picker.search')}
              className="h-9 w-full rounded-lg bg-paper pr-2 pl-8 text-sm outline-none placeholder:text-[#8a8f99]" />
          </div>
        </div>
        <div ref={listRef} role="listbox" className="max-h-[320px] overflow-y-auto overscroll-contain p-1 scrollbar-thin">
          {products.isLoading || cats.isLoading ? (
            <div className="space-y-1.5 p-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('common:states.noResults')}</p>
          ) : groups.map((g, gi) => {
            const s = catStyle(g.cat?.slug)
            const Icon = s.icon
            return (
              <div key={g.cat?.id ?? `g${gi}`} className="pb-1">
                {!g.flat && (
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-white/95 px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-[0.06em] text-muted uppercase backdrop-blur">
                    <Icon className="size-3.5" />{g.cat ? ln(g.cat, 'name') : '—'}
                  </div>
                )}
                {g.items.map((p) => {
                  const i = indexOf.get(p.id) ?? 0
                  const cat = catById.get(p.category_id)
                  return (
                    <button key={p.id} type="button" role="option" aria-selected={p.id === value} data-idx={i}
                      onMouseEnter={() => setActive(i)} onClick={() => pick(p)}
                      className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm', i === active ? 'bg-mint-50 text-ink' : 'text-ink-soft')}>
                      {p.emoji
                        ? <ProductSymbol emoji={p.emoji} size={17} />
                        : <span className="mx-1 size-1.5 rounded-full" style={{ background: catStyle(cat?.slug).accent }} />}
                      <span className="min-w-0 flex-1 truncate">{ln(p, 'name')}</span>
                      {g.flat && cat && <span className="max-w-[40%] truncate text-[11px] text-muted">{ln(cat, 'name')}</span>}
                      <span className="text-xs text-muted">{t(`common:units.${p.unit}`, p.unit)}</span>
                      {p.id === value && <Check className="size-4 text-brand" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        {result.total > flat.length && (
          <p className="border-t border-line px-3 py-2 text-center text-[11.5px] text-muted">{t('buyer:picker.more', { shown: flat.length, total: result.total })}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
