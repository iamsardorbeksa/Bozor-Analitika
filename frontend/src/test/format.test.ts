import i18n from '@/i18n'
import { formatNumber, formatPct, formatUZS, freshness, ln, uz } from '@/lib/format'

describe('number & currency formatting', () => {
  it('groups thousands with spaces', () => {
    expect(formatNumber(1250000)).toBe('1 250 000')
    expect(formatNumber(null)).toBe('—')
  })

  it('formats UZS per language', async () => {
    await i18n.changeLanguage('uz')
    expect(formatUZS(1250000)).toBe('1 250 000 so‘m')
    expect(formatUZS(1250000, { lang: 'ru' })).toBe('1 250 000 сум')
    expect(formatUZS(1250000, { lang: 'en' })).toBe('1 250 000 UZS')
    expect(formatUZS(12_500_000, { compact: true, lang: 'en' })).toBe('13 M UZS')
  })

  it('formats percentages with sign', () => {
    expect(formatPct(3.456)).toBe('+3.5%')
    expect(formatPct(-2)).toBe('−2.0%')
    expect(formatPct(undefined)).toBe('—')
  })
})

describe('localization helpers', () => {
  it('uses typographic Uzbek apostrophes', () => {
    expect(uz("Bug'doy")).toBe('Bugʻdoy')
    expect(uz("Qo'y go'shti")).toBe('Qoʻy goʻshti')
    expect(uz("Sariyog'")).toBe('Sariyogʻ')
  })

  it('picks the localized field', () => {
    const p = { name_uz: 'Piyoz', name_ru: 'Лук', name_en: 'Onion' }
    expect(ln(p, 'name', 'ru')).toBe('Лук')
    expect(ln(p, 'name', 'en')).toBe('Onion')
  })

  it('classifies data freshness', () => {
    expect(freshness(new Date().toISOString())).toBe('fresh')
    expect(freshness(new Date(Date.now() - 48 * 3600e3).toISOString())).toBe('recent')
    expect(freshness(new Date(Date.now() - 7 * 86400e3).toISOString())).toBe('stale')
  })
})

describe('translation files', () => {
  const files = import.meta.glob('../i18n/locales/*/*.json', { eager: true }) as Record<string, { default: object }>
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
  const byNs: Record<string, Record<string, string[]>> = {}
  for (const [path, mod] of Object.entries(files)) {
    const [, lng, ns] = path.match(/locales\/(\w+)\/([\w-]+)\.json$/)!
    byNs[ns] ??= {}
    byNs[ns][lng] = keys(mod.default).sort()
  }

  it.each(Object.keys(byNs))('namespace "%s" has the same keys in uz, ru and en', (ns) => {
    const { uz: u, ru, en } = byNs[ns]
    expect(u, `${ns} missing uz`).toBeDefined()
    expect(ru).toEqual(u)
    expect(en).toEqual(u)
  })
})
