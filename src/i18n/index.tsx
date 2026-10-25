import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en, type DictKey } from './en'
import { ru } from './ru'
import { uz } from './uz'
import { detectLang, LANGS, type Lang } from './lang'
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

const DICTS: Record<Lang, Record<DictKey, string>> = { en, ru, uz }
const STORAGE_KEY = 'cw-lang'

export type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/**
 * Plural strings are written as "one|other" (en, uz) or "one|few|many" (ru).
 */
function pickPlural(value: string, n: number, lang: Lang): string {
  const forms = value.split('|')
  if (forms.length === 1) return value
  const cat = pluralCategory(n, lang)
  if (lang === 'ru') {
    const i = cat === 'one' ? 0 : cat === 'few' ? 1 : 2
    return forms[Math.min(i, forms.length - 1)]
  }
  return cat === 'one' ? forms[0] : forms[forms.length - 1]
}

export function makeTranslator(lang: Lang) {
  const dict = DICTS[lang]
  const t = (key: DictKey, vars?: Vars) => interpolate(dict[key] ?? en[key] ?? key, vars)
  /** Plural-aware: picks the form for `n` and fills {n}. */
  const tp = (key: DictKey, n: number, vars?: Vars) =>
    interpolate(pickPlural(dict[key] ?? en[key], n, lang), { n: formatNumber(n, lang), ...vars })
  return {
    lang,
    t,
    tp,
    num: (n: number, digits = 0) => formatNumber(n, lang, digits),
    compact: (n: number) => formatCompact(n, lang),
    duration: (ms: number) => formatDuration(ms, lang),
    date: (ts: number, withYear = true) => formatDate(ts, lang, withYear),
    shortDate: (ts: number) => formatShortDate(ts, lang),
    weekday: (i: number, style: 'long' | 'short' = 'long') => weekdayName(i, lang, style),
    hour: (h: number) => formatHour(h, lang),
  }
}

export type Translator = ReturnType<typeof makeTranslator>

interface I18nValue extends Translator {
  setLang: (lang: Lang) => void
}

const I18nContext = createContext<I18nValue | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved
  } catch {
    /* storage may be blocked; fall back to the browser language */
  }
  return detectLang()
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
  }, [lang])
  const value = useMemo<I18nValue>(() => ({ ...makeTranslator(lang), setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
