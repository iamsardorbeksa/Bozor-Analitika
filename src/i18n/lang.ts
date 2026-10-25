export const LANGS = ['en', 'ru', 'uz'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  ru: 'Русский',
  uz: 'Oʻzbekcha',
}

/** Pick the best supported language from the browser settings. */
export function detectLang(): Lang {
  const prefs =
    typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const p of prefs) {
    const base = p.toLowerCase().split('-')[0]
    if (base === 'ru') return 'ru'
    if (base === 'uz') return 'uz'
    if (base === 'en') return 'en'
  }
  return 'en'
}
