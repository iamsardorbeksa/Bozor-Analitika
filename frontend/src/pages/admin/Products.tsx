import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Apple, Beef, BrickWall, Carrot, Cpu, Egg, Fish, Flower2, Hammer, Milk, Package, Pencil, Plus, Search, Shirt, Sofa, Tags, Wheat,
} from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Api } from '@/api/endpoints'
import type { AdminCategory } from '@/api/types'
import { ProductGlyph, catStyle } from '@/components/market'
import { Panel } from '@/components/seller/kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/input'
import { PageHeader, Pagination } from '@/components/ui/layout'
import { Dialog, DialogContent } from '@/components/ui/primitives'
import { useCategories, useProducts } from '@/hooks/useCatalog'
import { ln } from '@/lib/format'
import { searchProducts } from '@/lib/search'
import { cn, errorMessage } from '@/lib/utils'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  carrot: Carrot, apple: Apple, wheat: Wheat, beef: Beef, milk: Milk, egg: Egg, fish: Fish, 'brick-wall': BrickWall,
  hammer: Hammer, shirt: Shirt, cpu: Cpu, sofa: Sofa, flower: Flower2, package: Package,
}
const CatIcon = ({ name, className }: { name: string; className?: string }) => {
  const I = ICONS[name] ?? Package
  return <I className={className} />
}

export default function AdminProducts() {
  const { t } = useTranslation(['admin', 'common'])
  const q = useQuery({ queryKey: ['admin-categories'], queryFn: Api.adminCategories })
  const [edit, setEdit] = React.useState<AdminCategory | 'new' | null>(null)

  const columns: Column<AdminCategory>[] = [
    {
      key: 'name', header: t('catalog.col.category'), sortValue: (c) => ln(c, 'name'),
      cell: (c) => {
        const s = catStyle(c.slug)
        return (
          <div className="flex min-w-[180px] items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg" style={{ background: s.bg, color: s.fg }}>{ICONS[c.icon] ? <CatIcon name={c.icon} className="size-4" /> : <s.icon className="size-4" />}</span>
            <p className="font-medium">{ln(c, 'name')}</p>
          </div>
        )
      },
    },
    { key: 'uz', header: 'UZ', cell: (c) => <span className="text-ink-soft">{c.name_uz}</span> },
    { key: 'ru', header: 'RU', cell: (c) => <span className="text-ink-soft">{c.name_ru}</span> },
    { key: 'en', header: 'EN', cell: (c) => <span className="text-ink-soft">{c.name_en}</span> },
    { key: 'products', header: t('catalog.col.products'), align: 'right', sortValue: (c) => c.products, cell: (c) => <span className="font-mono">{c.products}</span> },
    { key: 'actions', header: <span className="sr-only">{t('catalog.col.actions')}</span>, align: 'right',
      cell: (c) => <Button variant="ghost" size="sm" onClick={() => setEdit(c)}><Pencil /> {t('common:actions.edit')}</Button> },
  ]

  return (
    <div>
      <PageHeader eyebrow={t('catalog.eyebrow')} title={t('catalog.title')} description={t('catalog.subtitle')}
        actions={<Button onClick={() => setEdit('new')}><Plus /> {t('catalog.newCategory')}</Button>} />
      <Card className="overflow-hidden">
        {q.isLoading ? <div className="p-5"><SkeletonList rows={6} /></div>
          : q.isError || !q.data ? <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>
          : q.data.length === 0 ? <div className="p-5"><EmptyState icon={<Tags />} title={t('catalog.empty')} action={<Button onClick={() => setEdit('new')}><Plus /> {t('catalog.newCategory')}</Button>} /></div>
          : <DataTable columns={columns} rows={q.data} rowKey={(c) => c.id} />}
      </Card>
      <ProductCatalogue />
      <CategoryDialog value={edit} onClose={() => setEdit(null)} existing={q.data ?? []} />
    </div>
  )
}

const PAGE = 48

function ProductCatalogue() {
  const { t } = useTranslation(['admin', 'common'])
  const cats = useCategories()
  const products = useProducts()
  const [filter, setFilter] = React.useState('')
  const [cat, setCat] = React.useState<string>('')
  const [page, setPage] = React.useState(1)
  const query = React.useDeferredValue(filter)
  const loading = cats.isLoading || products.isLoading
  const error = cats.isError || products.isError
  const catById = React.useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data])
  const counts = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products.data ?? []) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1)
    return m
  }, [products.data])
  const matches = React.useMemo(() => {
    const rank = new Map((cats.data ?? []).map((c, i) => [c.id, i]))
    const pool = (products.data ?? []).filter((p) => !cat || p.category_id === cat)
      .sort((a, b) => (rank.get(a.category_id) ?? 999) - (rank.get(b.category_id) ?? 999))
    return searchProducts(pool, query).items
  }, [products.data, cats.data, cat, query])
  React.useEffect(() => setPage(1), [query, cat])
  const pages = Math.max(1, Math.ceil(matches.length / PAGE))
  const shown = matches.slice((page - 1) * PAGE, page * PAGE)

  return (
    <Panel i={1} className="mt-6" title={t('catalog.productsTitle')} description={t('catalog.productsHint', { n: products.data?.length ?? 0, c: cats.data?.length ?? 0 })}
      actions={<div className="w-48 sm:w-64"><Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('catalog.filterProducts')} aria-label={t('catalog.filterProducts')} icon={<Search />} className="h-9" /></div>}>
      {loading ? <SkeletonList rows={4} /> : error ? <ErrorState onRetry={() => { cats.refetch(); products.refetch() }} /> : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={t('common:fields.category')}>
            {[{ id: '', label: t('common:fields.allCategories'), n: products.data?.length ?? 0, slug: '' }, ...(cats.data ?? []).map((c) => ({ id: c.id, label: ln(c, 'name'), n: counts.get(c.id) ?? 0, slug: c.slug }))].map((c) => {
              const on = cat === c.id
              const s = c.slug ? catStyle(c.slug) : null
              const Icon = s?.icon
              return (
                <button key={c.id || 'all'} type="button" aria-pressed={on} onClick={() => setCat(c.id)}
                  className={cn('flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors',
                    on ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong')}>
                  {Icon && <Icon className="size-3.5" />}
                  {c.label}
                  <span className={cn('font-mono text-[11px] tabular', on ? 'text-white/70' : 'text-muted')}>{c.n}</span>
                </button>
              )
            })}
          </div>
          {shown.length === 0 ? <EmptyState title={t('common:states.noResults')} className="py-8" /> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => {
                const c = catById.get(p.category_id)
                return (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
                    <ProductGlyph category={c?.slug} name={ln(p, 'name')} image={p.image_url} emoji={p.emoji ?? undefined} size={34} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{ln(p, 'name')}</p>
                      <p className="truncate text-[11px] text-muted">{c ? ln(c, 'name') : '—'} · {t(`common:unitsLong.${p.unit}`, t(`common:units.${p.unit}`, p.unit))}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Pagination page={page} pages={pages} total={matches.length} pageSize={PAGE} onChange={setPage} />
        </>
      )}
    </Panel>
  )
}

function CategoryDialog({ value, onClose, existing }: { value: AdminCategory | 'new' | null; onClose: () => void; existing: AdminCategory[] }) {
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const editing = value && value !== 'new' ? value : null
  const schema = React.useMemo(() => z.object({
    slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, t('catalog.errors.slug')),
    name_uz: z.string().trim().min(2, t('catalog.errors.name')).max(80),
    name_ru: z.string().trim().min(2, t('catalog.errors.name')).max(80),
    name_en: z.string().trim().min(2, t('catalog.errors.name')).max(80),
    icon: z.string().min(1).max(40),
  }).superRefine((v, ctx) => {
    if (existing.some((c) => c.slug === v.slug && c.id !== editing?.id)) ctx.addIssue({ code: 'custom', path: ['slug'], message: t('catalog.errors.slugTaken') })
  }), [t, existing, editing?.id])
  type V = z.infer<typeof schema>
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<V>({ resolver: zodResolver(schema) })
  React.useEffect(() => {
    if (!value) return
    reset(editing ? { slug: editing.slug, name_uz: editing.name_uz, name_ru: editing.name_ru, name_en: editing.name_en, icon: editing.icon }
      : { slug: '', name_uz: '', name_ru: '', name_en: '', icon: 'package' })
  }, [value, editing, reset])
  const m = useMutation({
    mutationFn: (v: V) => editing ? Api.adminUpdateCategory(editing.id, v) : Api.adminCreateCategory(v),
    onSuccess: () => {
      toast.success(t(editing ? 'common:toast.updated' : 'catalog.created'))
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const icon = watch('icon')
  const slugFromEn = () => {
    const en = watch('name_en') ?? ''
    setValue('slug', en.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40), { shouldValidate: true })
  }
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title={editing ? t('catalog.editTitle') : t('catalog.newCategory')} description={t('catalog.dialogHint')}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label={t('catalog.fields.nameUz')} error={errors.name_uz?.message} htmlFor="cat-uz"><Input id="cat-uz" aria-invalid={!!errors.name_uz} {...register('name_uz')} /></Field>
          <Field label={t('catalog.fields.nameRu')} error={errors.name_ru?.message} htmlFor="cat-ru"><Input id="cat-ru" aria-invalid={!!errors.name_ru} {...register('name_ru')} /></Field>
          <Field label={t('catalog.fields.nameEn')} error={errors.name_en?.message} htmlFor="cat-en"><Input id="cat-en" aria-invalid={!!errors.name_en} {...register('name_en')} /></Field>
          <Field label={t('catalog.fields.slug')} error={errors.slug?.message} htmlFor="cat-slug" hint={t('catalog.slugHint')}>
            <div className="flex gap-2">
              <div className="flex-1"><Input id="cat-slug" className="font-mono" aria-invalid={!!errors.slug} {...register('slug')} /></div>
              <Button type="button" variant="outline" onClick={slugFromEn}>{t('catalog.fromEn')}</Button>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-medium text-ink-soft">{t('catalog.fields.icon')}</p>
            <div role="radiogroup" aria-label={t('catalog.fields.icon')} className="flex flex-wrap gap-1.5">
              {Object.keys(ICONS).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={icon === k} title={k} onClick={() => setValue('icon', k, { shouldDirty: true })}
                  className={cn('grid size-10 place-items-center rounded-lg border transition-colors',
                    icon === k ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-soft hover:bg-mint-50')}>
                  <CatIcon name={k} className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={m.isPending}>{editing ? t('common:actions.save') : t('common:actions.create')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
