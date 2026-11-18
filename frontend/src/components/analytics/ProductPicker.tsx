import { Check, ChevronsUpDown, Search } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, Product } from '@/api/types'
import { ProductGlyph } from '@/components/market'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/feedback'
import { ln } from '@/lib/format'
import { searchProducts } from '@/lib/search'
import { cn } from '@/lib/utils'

const LIMIT = 80

/**
 * Searchable product selector. Matches all three localized names; without a query it lists the
 * catalogue grouped by category, with a query it shows the best matches first. Results are capped
 * so a catalogue of several hundred products stays light.
 */
export function ProductPicker({ products, categories, value, onChange, className }: {
  products: Product[] | undefined; categories: Category[] | undefined; value: string | null
  onChange: (id: string) => void; className?: string
}) {
  const { t } = useTranslation(['analytics', 'common'])
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const query = React.useDeferredValue(q)
  const current = products?.find((p) => p.id === value)
  const catById = React.useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  const ordered = React.useMemo(() => {
    // catalogue order: by category (in category order), then as returned
    const rank = new Map((categories ?? []).map((c, i) => [c.id, i]))
    return [...(products ?? [])].sort((a, b) => (rank.get(a.category_id) ?? 999) - (rank.get(b.category_id) ?? 999))
  }, [products, categories])

  const result = React.useMemo(() => searchProducts(ordered, query, LIMIT), [ordered, query])
  const searching = !!query.trim()

  const groups = React.useMemo(() => {
    if (searching) return [{ cat: undefined as Category | undefined, items: result.items, flat: true }]
    const out: { cat: Category | undefined; items: Product[]; flat: boolean }[] = []
    for (const p of result.items) {
      const cat = catById.get(p.category_id)
      const last = out[out.length - 1]
      if (last && last.cat?.id === cat?.id) last.items.push(p)
      else out.push({ cat, items: [p], flat: false })
    }
    return out
  }, [result.items, searching, catById])

  if (!products) return <Skeleton className={cn('h-10 w-full sm:w-72', className)} />

  const pick = (id: string) => { onChange(id); setOpen(false); setQ('') }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}>
      <PopoverTrigger
        className={cn('flex h-10 w-full items-center gap-2.5 rounded-xl border border-line-strong bg-white/90 pr-3 pl-1.5 text-left text-sm hover:border-[#c3c6cc] focus:border-brand focus:outline-none sm:w-72', className)}
        aria-label={t('picker.label')}>
        {current
          ? <ProductGlyph category={catById.get(current.category_id)?.slug} name={ln(current, 'name')} emoji={current.emoji ?? undefined} size={28} className="rounded-lg" />
          : <span className="grid size-7 place-items-center rounded-lg bg-mint text-brand"><Search className="size-3.5" /></span>}
        <span className={cn('flex-1 truncate font-medium', !current && 'text-muted')}>{current ? ln(current, 'name') : t('picker.placeholder')}</span>
        <ChevronsUpDown className="size-4 text-muted" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(380px,calc(100vw-32px))] p-0">
        <div className="border-b border-line p-2">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('picker.search')} icon={<Search />} className="h-9"
            onKeyDown={(e) => { if (e.key === 'Enter' && result.items[0]) { e.preventDefault(); pick(result.items[0].id) } }} />
        </div>
        <div className="max-h-[340px] overflow-y-auto overscroll-contain p-1.5 scrollbar-thin" role="listbox">
          {result.items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">{t('picker.noMatch')}</p>}
          {groups.map((g, gi) => (
            <div key={g.cat?.id ?? `g${gi}`} className="mb-1">
              {!g.flat && <div className="sticky top-0 z-10 bg-white/95 px-2.5 pt-2 pb-1 text-[10.5px] font-medium tracking-[0.08em] text-muted uppercase backdrop-blur">{g.cat ? ln(g.cat, 'name') : '—'}</div>}
              {g.items.map((p) => {
                const cat = catById.get(p.category_id)
                return (
                  <button key={p.id} type="button" role="option" aria-selected={p.id === value} onClick={() => pick(p.id)}
                    className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-mint-50', p.id === value && 'bg-mint-50')}>
                    <ProductGlyph category={cat?.slug} name={ln(p, 'name')} emoji={p.emoji ?? undefined} size={26} className="rounded-md" />
                    <span className="min-w-0 flex-1 truncate">{ln(p, 'name')}</span>
                    {g.flat && cat && <span className="max-w-[40%] truncate text-[11px] text-muted">{ln(cat, 'name')}</span>}
                    <span className="text-[11px] text-muted">{t(`common:units.${p.unit}`, p.unit)}</span>
                    {p.id === value && <Check className="size-4 text-brand" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {result.total > result.items.length && (
          <p className="border-t border-line px-3 py-2 text-center text-[11.5px] text-muted">{t('picker.more', { shown: result.items.length, total: result.total })}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
