import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AwardDef } from '../lib/awards'
import { ar, arAwards } from './ar'
import { de, deAwards } from './de'
import { en, type AwardTexts, type Dict, type DictKey } from './en'
import { es, esAwards } from './es'
import { fr, frAwards } from './fr'
import { DEFAULT_LANG, isRtl, LANGS, PLURAL_ORDER, type Lang } from './lang'
import { pt, ptAwards } from './pt'
import { ru, ruAwards } from './ru'
import { uz, uzAwards } from './uz'
import { zh, zhAwards } from './zh'
import {
  formatCompact,
  formatDate,
  formatDuration,
  formatHour,
  formatNumber,
  formatShortDate,
  pluralCategory,
  weekdayName,
} from './format'

const DICTS: Record<Lang, Dict> = { en, es, fr, de, pt, ru, uz, zh, ar }
/** English award texts come from src/lib/awards.ts itself. */
const AWARD_TEXTS: Record<Exclude<Lang, 'en'>, AwardTexts> = {
  es: esAwards,
  fr: frAwards,
  de: deAwards,
  pt: ptAwards,
  ru: ruAwards,
  uz: uzAwards,
  zh: zhAwards,
  ar: arAwards,
}
const STORAGE_KEY = 'cw-lang'

export type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/**
 * Plural strings list one form per category in PLURAL_ORDER[lang], e.g. "one|other" (en),
 * "one|few|many" (ru), "zero|one|two|few|many|other" (ar). Unknown categories use the last form.
 */
function pickPlural(value: string, n: number, lang: Lang): string {
  const forms = value.split('|')
  if (forms.length === 1) return value
  const i = PLURAL_ORDER[lang].indexOf(pluralCategory(n, lang))
  return forms[i < 0 ? forms.length - 1 : Math.min(i, forms.length - 1)]
}

export function makeTranslator(lang: Lang) {
  const dict = DICTS[lang]
  const t = (key: DictKey, vars?: Vars) => interpolate(dict[key] ?? en[key] ?? key, vars)
  /** Plural-aware: picks the form for `n` and fills {n}. */
  const tp = (key: DictKey, n: number, vars?: Vars) =>
    interpolate(pickPlural(dict[key] ?? en[key], n, lang), { n: formatNumber(n, lang), ...vars })
  /** Award title + description in this language, falling back to English. */
  const awardText = (def: Pick<AwardDef, 'id' | 'title' | 'description'>) =>
    (lang !== 'en' && AWARD_TEXTS[lang][def.id]) || {
      title: def.title,
      description: def.description,
    }
  /** Award description with its numbers filled in: {duration} as time, {pct} as %, {hour} as an hour. */
  const awardDescription = (
    def: Pick<AwardDef, 'id' | 'title' | 'description'>,
    vars: Record<string, number>,
  ) =>
    awardText(def).description.replace(/\{(\w+)\}/g, (m, k: string) => {
      if (!(k in vars)) return m
      const v = vars[k]
      if (k === 'duration') return formatDuration(v, lang)
      if (k === 'pct') return `${v}%`
      if (k === 'hour') return formatHour(v, lang)
      return formatNumber(v, lang, 1)
    })
  return {
    lang,
    dir: isRtl(lang) ? ('rtl' as const) : ('ltr' as const),
    t,
    tp,
    awardText,
    awardDescription,
    num: (n: number, digits = 0) => formatNumber(n, lang, digits),
    compact: (n: number) => formatCompact(n, lang),
    duration: (ms: number) => formatDuration(ms, lang),
    date: (ts: number, withYear = true) => formatDate(ts, lang, withYear),
    shortDate: (ts: number) => formatShortDate(ts, lang),
    weekday: (i: number, style: 'long' | 'short' | 'narrow' = 'long') =>
      weekdayName(i, lang, style),
    hour: (h: number) => formatHour(h, lang),
  }
}

export type Translator = ReturnType<typeof makeTranslator>

interface I18nValue extends Translator {
  setLang: (lang: Lang) => void
}

const I18nContext = createContext<I18nValue | null>(null)

/** The language the visitor picked earlier, otherwise English (not the browser language). */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved
  } catch {
    /* storage may be blocked; fall back to the default */
  }
  return DEFAULT_LANG
}

export function I18nProvider({ children, lang: fixedLang }: { children: ReactNode; lang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => fixedLang ?? initialLang())
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])
  const value = useMemo<I18nValue>(() => ({ ...makeTranslator(lang), setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
