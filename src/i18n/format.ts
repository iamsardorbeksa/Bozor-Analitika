import type { Lang } from './lang'

const LOCALES: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ru: 'ru-RU',
  uz: 'uz-Latn-UZ',
  zh: 'zh-CN',
  // Western digits read best on shareable cards across the Arabic-speaking world.
  ar: 'ar-u-nu-latn',
}
export const localeOf = (lang: Lang) => LOCALES[lang]

/*
 * Many browsers ship little or no Uzbek locale data (dates come out as "2025 M11 3"),
 * so Uzbek dates, units and compact numbers are formatted by hand.
 */
const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]
const UZ_WEEKDAYS = [
  'dushanba',
  'seshanba',
  'chorshanba',
  'payshanba',
  'juma',
  'shanba',
  'yakshanba',
]
const UZ_UNITS: Record<string, { long: string; short: string }> = {
  second: { long: 'soniya', short: 'son.' },
  minute: { long: 'daqiqa', short: 'daq.' },
  hour: { long: 'soat', short: 'soat' },
  day: { long: 'kun', short: 'kun' },
}
/** Uzbek uses the same digit grouping as Russian (space separators, decimal comma). */
const NUMBER_LOCALES: Record<Lang, string> = { ...LOCALES, uz: 'ru-RU' }

const numberFormats = new Map<string, Intl.NumberFormat>()
function nf(lang: Lang, opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = lang + JSON.stringify(opts)
  let f = numberFormats.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(NUMBER_LOCALES[lang], opts)
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
  if (lang === 'uz') {
    return n >= 1e6
      ? `${formatNumber(n / 1e6, lang, 1)} mln`
      : `${formatNumber(n / 1e3, lang, 1)} ming`
  }
  return nf(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function unit(n: number, unitName: string, lang: Lang, display: 'short' | 'long' = 'long'): string {
  if (lang === 'uz' && UZ_UNITS[unitName])
    return `${formatNumber(n, lang)} ${UZ_UNITS[unitName][display]}`
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
  if (lang === 'uz') {
    const d = new Date(ts)
    const day = `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`
    return withYear ? `${d.getFullYear()}-yil ${day}` : day
  }
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
  if (lang === 'uz') {
    const d = new Date(ts)
    return `${d.getDate()}-${UZ_MONTHS[d.getMonth()].slice(0, 3)}, ${d.getFullYear()}`
  }
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
export function weekdayName(
  index: number,
  lang: Lang,
  style: 'long' | 'short' | 'narrow' = 'long',
): string {
  // 2024-01-01 was a Monday.
  const d = new Date(2024, 0, 1 + index)
  if (lang === 'uz') return style === 'long' ? UZ_WEEKDAYS[index] : UZ_WEEKDAYS[index].slice(0, 3)
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
