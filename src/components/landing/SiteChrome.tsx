import { useEffect, useState } from 'react'
import { APP_CONFIG } from '../../config'
import { useI18n } from '../../i18n'
import { LANG_LABELS, LANGS, type Lang } from '../../i18n/lang'
import { LogoMark } from '../cards/primitives'
import { Icon } from '../ui/Icon'

const THEME_KEY = 'cw-theme'

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved) return saved === 'dark'
  } catch {
    /* storage blocked */
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply the saved theme as early as possible (called from main.tsx). */
export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', initialDark())
}

export function ThemeToggle() {
  const { t } = useI18n()
  const [dark, setDark] = useState(initialDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  const toggle = () => {
    setDark((d) => {
      try {
        localStorage.setItem(THEME_KEY, d ? 'light' : 'dark')
      } catch {
        /* ignore */
      }
      return !d
    })
  }
  return (
    <button
      className="header-btn"
      onClick={toggle}
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

export function LangSelect() {
  const { t, lang, setLang } = useI18n()
  return (
    <label className="header-select">
      <Icon name="globe" size={18} />
      <span className="sr-only">{t('lang.label')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SiteHeader() {
  const { t } = useI18n()
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        {t('skip.toContent')}
      </a>
      <a href="#" className="flex items-center gap-2" aria-label={APP_CONFIG.name}>
        <span className="logo-tile">
          <LogoMark color="#fff" accent="#D7FF3A" size={22} />
        </span>
        <span className="font-display hidden text-[17px] font-extrabold tracking-tight min-[480px]:inline">
          {APP_CONFIG.name}
        </span>
      </a>
      <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Main">
        <a href="#how" className="header-link hidden md:inline-flex">
          {t('nav.howto')}
        </a>
        <a href="#faq" className="header-link hidden md:inline-flex">
          {t('nav.faq')}
        </a>
        <a href="#/privacy" className="header-link">
          {t('nav.privacy')}
        </a>
        <LangSelect />
        <ThemeToggle />
      </nav>
    </header>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="flex items-center gap-2">
        <span className="logo-tile">
          <LogoMark color="#fff" accent="#D7FF3A" size={18} />
        </span>
        <span className="font-display font-extrabold">{APP_CONFIG.name}</span>
      </div>
      <p className="mt-3 font-semibold">{t('footer.tagline')}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--page-muted)]">
        <Icon name="lock" size={14} /> {t('footer.noTracking')}{' '}
        <a href="#/privacy" className="link-btn">
          {t('nav.privacy')}
        </a>
      </p>
    </footer>
  )
}
