export const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'uz', 'zh', 'ar'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  uz: 'Oʻzbekcha',
  zh: '中文',
  ar: 'العربية',
}

/** Languages written right-to-left. */
export const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar'])

export const isRtl = (lang: Lang) => RTL_LANGS.has(lang)

/**
 * Plural strings in the dictionaries list one form per plural category, in this order,
 * separated by "|". Languages without plural inflection (zh, uz) use a single form.
 */
export const PLURAL_ORDER: Record<Lang, Intl.LDMLPluralRule[]> = {
  en: ['one', 'other'],
  es: ['one', 'other'],
  fr: ['one', 'other'],
  de: ['one', 'other'],
  pt: ['one', 'other'],
  ru: ['one', 'few', 'many'],
  uz: ['other'],
  zh: ['other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
}

/** Used when none of the visitor's browser languages is supported. */
export const DEFAULT_LANG: Lang = 'en'

/**
 * The visitor's browser language if we support it (checked in their order of preference,
 * e.g. "ru-RU" → ru, "pt-BR" → pt), otherwise English.
 */
export function detectLang(
  preferred: readonly string[] = typeof navigator !== 'undefined'
    ? (navigator.languages ?? [navigator.language])
    : [],
): Lang {
  for (const p of preferred) {
    const base = p.toLowerCase().split('-')[0]
    if ((LANGS as readonly string[]).includes(base)) return base as Lang
  }
  return DEFAULT_LANG
}
