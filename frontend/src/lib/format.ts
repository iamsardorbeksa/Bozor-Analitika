import i18n from '@/i18n'

export type Lang = 'uz' | 'ru' | 'en'

export const currentLang = (): Lang => {
  const l = (i18n.resolvedLanguage || i18n.language || 'uz').slice(0, 2)
  return (['uz', 'ru', 'en'].includes(l) ? l : 'uz') as Lang
}

const CURRENCY: Record<Lang, string> = { uz: 'so‘m', ru: 'сум', en: 'UZS' }
const LOCALE: Record<Lang, string> = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-GB' }

/** 1250000 -> "1 250 000" (space-grouped, as used in Uzbekistan) */
export function formatNumber(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const fixed = Math.abs(v).toFixed(digits)
  const [int, dec] = fixed.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (v < 0 ? '−' : '') + grouped + (dec ? ',' + dec : '')
}

/** 1250000 -> "1 250 000 so‘m" */
export function formatUZS(v: number | null | undefined, opts: { compact?: boolean; lang?: Lang } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const lang = opts.lang ?? currentLang()
  if (opts.compact && Math.abs(v) >= 1_000_000) {
    const unit = { uz: 'mln', ru: 'млн', en: 'M' }[lang]
    return `${formatNumber(v / 1_000_000, v >= 10_000_000 ? 0 : 1)} ${unit} ${CURRENCY[lang]}`
  }
  return `${formatNumber(v)} ${CURRENCY[lang]}`
}

export function currencyLabel(lang: Lang = currentLang()) {
  return CURRENCY[lang]
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}%`
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (currentLang() === 'uz') {
    // Browsers lack Uzbek month names ("2026 M11 17"), so format manually: "17-noy, 2026".
    const mon = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'][d.getMonth()]
    const base = `${d.getDate()}-${mon}`
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return withTime ? `${base}, ${hm}` : `${base}, ${d.getFullYear()}`
  }
  return d.toLocaleString(LOCALE[currentLang()], {
    day: '2-digit', month: 'short', year: withTime ? undefined : 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

/** "3 soat oldin" / "3 часа назад" / "3 hours ago" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const lang = currentLang()
  if (lang === 'uz') {
    // Browsers ship little Uzbek relative-time data, so format it ourselves.
    if (diff < 60) return 'hozirgina'
    const units: [number, string][] = [[3600, 'daqiqa'], [86400, 'soat'], [604800, 'kun'], [2629800, 'hafta'], [31557600, 'oy']]
    const divs = [60, 3600, 86400, 604800, 2629800]
    for (let i = 0; i < units.length; i++) if (diff < units[i][0]) return `${Math.round(diff / divs[i])} ${units[i][1]} oldin`
    return `${Math.round(diff / 31557600)} yil oldin`
  }
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' })
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'], [31557600, 'month']]
  let unit: Intl.RelativeTimeFormatUnit = 'year'
  let div = 31557600
  for (let i = 0; i < steps.length; i++) {
    if (diff < steps[i][0]) {
      unit = steps[i][1]
      div = i === 0 ? 1 : steps[i - 1][0]
      break
    }
  }
  return rtf.format(-Math.round(diff / div), unit)
}

/** Freshness bucket used by FreshnessBadge */
export function freshness(iso: string | null | undefined): 'fresh' | 'recent' | 'stale' {
  if (!iso) return 'stale'
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000
  return h <= 24 ? 'fresh' : h <= 72 ? 'recent' : 'stale'
}

/** Pick the localized field: ln(product, 'name') -> product.name_uz | name_ru | name_en */
export function ln<T extends object>(obj: T | null | undefined, base: string, lang: Lang = currentLang()): string {
  if (!obj) return ''
  const o = obj as Record<string, unknown>
  const v = String(o[`${base}_${lang}`] ?? o[`${base}_uz`] ?? o[base] ?? '')
  return lang === 'uz' || !o[`${base}_${lang}`] ? uz(v) : v
}

/** Typographic Uzbek Latin: o' -> oʻ, g' -> gʻ, other ' -> ʼ (tutuq belgisi). */
export function uz(s: string): string {
  return s.replace(/([OoGg])['‘’`]/g, '$1ʻ').replace(/(\w)['’](\w)/g, '$1ʼ$2')
}
