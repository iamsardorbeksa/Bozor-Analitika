import type { Product } from '@/api/types'

/** Lower-case and fold Uzbek apostrophes (oʻ, gʻ, ʼ, ', ‘, `) so "o'rik", "oʻrik" and "orik" all match. */
export function fold(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[ʻʼ'‘’`]/g, '').replace(/ё/g, 'е').trim()
}

/**
 * Rank catalogue products against a query across all three languages.
 * Name-prefix matches come first, then word-prefix, then substring. Returns at most `limit` items
 * together with the total number of matches, so long catalogues (hundreds of products) stay fast.
 */
export function searchProducts<T extends Pick<Product, 'name_uz' | 'name_ru' | 'name_en' | 'slug'>>(
  items: readonly T[], query: string, limit = Infinity,
): { items: T[]; total: number } {
  const q = fold(query)
  if (!q) return { items: items.slice(0, limit), total: items.length }
  const scored: { p: T; s: number; i: number }[] = []
  items.forEach((p, i) => {
    let best = 0
    for (const raw of [p.name_uz, p.name_ru, p.name_en, p.slug]) {
      const n = fold(raw)
      if (!n) continue
      if (n.startsWith(q)) best = Math.max(best, 3)
      else if (n.split(/[\s\-–—,()]+/).some((w) => w.startsWith(q))) best = Math.max(best, 2)
      else if (n.includes(q)) best = Math.max(best, 1)
    }
    if (best) scored.push({ p, s: best, i })
  })
  scored.sort((a, b) => b.s - a.s || a.i - b.i)
  return { items: scored.slice(0, limit).map((x) => x.p), total: scored.length }
}
