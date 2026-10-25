import { useEffect, useState } from 'react'
import { APP_CONFIG } from '../../config'
import { useI18n } from '../../i18n'
import { LangMenu } from '../ui/LangMenu'
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
      <nav className="ms-auto flex items-center gap-1 sm:gap-2" aria-label="Main">
        <a href="#how" className="header-link hidden md:inline-flex">
          {t('nav.howto')}
        </a>
        <a href="#faq" className="header-link hidden md:inline-flex">
          {t('nav.faq')}
        </a>
        <a href="#/privacy" className="header-link">
          {t('nav.privacy')}
        </a>
        <LangMenu />
        <ThemeToggle />
      </nav>
    </header>
  )
}

/** Creator credit with an email link (address assembled at runtime, see config). */
function CreatorCard() {
  const { t } = useI18n()
  const { name, emailUser, emailDomain } = APP_CONFIG.creator
  const email = `${emailUser}@${emailDomain}`
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="creator-card">
      <span className="creator-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="min-w-0">
        <div className="creator-label">{t('footer.createdBy')}</div>
        <div className="creator-name">{name}</div>
        <a className="creator-mail" href={`mailto:${email}`} dir="ltr">
          <Icon name="mail" size={16} />
          <span className="sr-only">{t('footer.contact')}: </span>
          <span className="creator-mail-text">
            {emailUser}
            <wbr />@{emailDomain}
          </span>
        </a>
      </div>
    </div>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div className="flex items-center gap-2">
            <span className="logo-tile">
              <LogoMark color="#fff" accent="#D7FF3A" size={18} />
            </span>
            <span className="font-display font-extrabold">{APP_CONFIG.name}</span>
          </div>
          <p className="mt-3 font-semibold">{t('footer.tagline')}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--page-muted)]">
            <Icon name="lock" size={14} /> {t('footer.noTracking')}{' '}
            <a href="#/privacy" className="link-btn">
              {t('nav.privacy')}
            </a>
          </p>
        </div>
        <CreatorCard />
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {APP_CONFIG.name} · {APP_CONFIG.creator.name}
      </div>
    </footer>
  )
}
