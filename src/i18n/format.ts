import type { Lang } from './lang'

const LOCALES: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-Latn-UZ' }
export const localeOf = (lang: Lang) => LOCALES[lang]

const numberFormats = new Map<string, Intl.NumberFormat>()
function nf(lang: Lang, opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = lang + JSON.stringify(opts)
  let f = numberFormats.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(LOCALES[lang], opts)
    } catch {
      f = new Intl.NumberFormat('en-US', opts)
    }
    numberFormats.set(key, f)
  }
  return f
}

export function formatNumber(n: number, lang: Lang, maxFractionDigits = 0): string {
  return nf(lang, { maximumFractionDigits: maxFractionDigits }).format(n)
}

/** 12.3K style for big numbers on cards. */
export function formatCompact(n: number, lang: Lang): string {
  if (n < 10000) return formatNumber(n, lang)
  return nf(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function unit(n: number, unitName: string, lang: Lang, display: 'short' | 'long' = 'long'): string {
  try {
    return nf(lang, {
      style: 'unit',
      unit: unitName,
      unitDisplay: display,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n} ${unitName}`
  }
}

/** Human duration with the two most significant units: "2 days 5 hr", "3 min", "40 sec". */
export function formatDuration(ms: number, lang: Lang): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return unit(Math.max(sec, 1), 'second', lang, 'short')
  const min = Math.round(sec / 60)
  if (min < 60) return unit(min, 'minute', lang, 'short')
  const hours = Math.floor(min / 60)
  const remMin = min % 60
  if (hours < 24) {
    return remMin && hours < 10
      ? `${unit(hours, 'hour', lang, 'short')} ${unit(remMin, 'minute', lang, 'short')}`
      : unit(Math.round(min / 60), 'hour', lang, 'short')
  }
  const days = Math.floor(hours / 24)
  const remH = hours % 24
  if (days < 7 && remH) return `${unit(days, 'day', lang)} ${unit(remH, 'hour', lang, 'short')}`
  return unit(Math.round(hours / 24), 'day', lang)
}

/** Split a duration into a big number + unit label for hero typography. */
export function durationParts(ms: number, lang: Lang): { value: number; label: string } {
  const min = ms / 60000
  const pick = (value: number, unitName: string) => {
    const v = Math.max(1, Math.round(value))
    const full = unit(v, unitName, lang)
    const label = full.replace(nf(lang).format(v), '').trim()
    return { value: v, label }
  }
  if (min < 1) return pick(ms / 1000, 'second')
  if (min < 60) return pick(min, 'minute')
  if (min < 48 * 60) return pick(min / 60, 'hour')
  return pick(min / 1440, 'day')
}

export function formatDate(ts: number, lang: Lang, withYear = true): string {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], {
      day: 'numeric',
      month: 'long',
      ...(withYear ? { year: 'numeric' } : {}),
    }).format(ts)
  } catch {
    return new Date(ts).toDateString()
  }
}

export function formatShortDate(ts: number, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(ts)
  } catch {
    return new Date(ts).toDateString()
  }
}

/** Weekday name, Monday = 0. */
export function weekdayName(index: number, lang: Lang, style: 'long' | 'short' = 'long'): string {
  // 2024-01-01 was a Monday.
  const d = new Date(2024, 0, 1 + index)
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], { weekday: style }).format(d)
  } catch {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]
  }
}

/** "10 PM" for English, "22:00" elsewhere. */
export function formatHour(hour: number, lang: Lang): string {
  if (lang === 'en') {
    const h = hour % 12 === 0 ? 12 : hour % 12
    return `${h} ${hour < 12 ? 'AM' : 'PM'}`
  }
  return `${String(hour).padStart(2, '0')}:00`
}

const pluralRules = new Map<Lang, Intl.PluralRules>()
export function pluralCategory(n: number, lang: Lang): Intl.LDMLPluralRule {
  let r = pluralRules.get(lang)
  if (!r) {
    r = new Intl.PluralRules(LOCALES[lang])
    pluralRules.set(lang, r)
  }
  return r.select(n)
}
