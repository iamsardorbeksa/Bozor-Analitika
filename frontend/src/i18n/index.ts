import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * Localization architecture
 * - One JSON file per namespace per language: src/i18n/locales/{uz,ru,en}/{namespace}.json
 * - Files are discovered automatically; add a namespace by adding the three JSON files.
 * - Default language: Uzbek (Latin). The choice is persisted in localStorage.
 */
const files = import.meta.glob('./locales/*/*.json', { eager: true }) as Record<string, { default: Record<string, unknown> }>

const resources: Record<string, Record<string, Record<string, unknown>>> = {}
for (const [path, mod] of Object.entries(files)) {
  const m = path.match(/\.\/locales\/(\w+)\/([\w-]+)\.json$/)
  if (!m) continue
  const [, lng, ns] = m
  resources[lng] ??= {}
  resources[lng][ns] = mod.default
}

export const LANGS = [
  { code: 'uz', label: 'Oʻzbekcha', short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
] as const

const LS_KEY = 'bozor.lang'
let initial = 'uz'
try {
  const saved = localStorage.getItem(LS_KEY)
  if (saved && ['uz', 'ru', 'en'].includes(saved)) initial = saved
} catch { /* storage unavailable */ }

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'uz',
  ns: Object.keys(resources.uz ?? { common: {} }),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (l) => {
  try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ }
  document.documentElement.lang = l === 'uz' ? 'uz-Latn' : l
})
document.documentElement.lang = initial === 'uz' ? 'uz-Latn' : initial

export default i18n
