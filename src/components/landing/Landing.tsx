import { useI18n } from '../../i18n'
import { AWARDS } from '../../lib/awards'
import type { DictKey } from '../../i18n/en'
import type { ParseErrorCode } from '../../lib/types'
import { Icon } from '../ui/Icon'
import { HeroCards } from './HeroCards'
import { SiteFooter, SiteHeader } from './SiteChrome'
import { UploadSection } from './UploadSection'

const FAQ: [DictKey, DictKey][] = [
  ['faq.q1', 'faq.a1'],
  ['faq.q2', 'faq.a2'],
  ['faq.q3', 'faq.a3'],
  ['faq.q4', 'faq.a4'],
  ['faq.q5', 'faq.a5'],
]

const FEATURES: [DictKey, DictKey, string][] = [
  ['features.private.title', 'features.private.text', '🔒'],
  ['features.fast.title', 'features.fast.text', '⚡'],
  ['features.share.title', 'features.share.text', '📲'],
]

export function Landing({
  onFile,
  onDemo,
  error,
  onDismissError,
}: {
  onFile: (file: File) => void
  onDemo: (kind: 'whatsapp' | 'telegram') => void
  error: ParseErrorCode | null
  onDismissError: () => void
}) {
  const { t, lang } = useI18n()
  const marquee = AWARDS.filter((a) => !a.fallback)
    .slice(0, 14)
    .map((a) => `${a.emoji} ${a.title[lang]}`)
    .join(' · ')
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1 className="hero-title">{t('hero.title')}</h1>
            <p className="hero-sub">{t('hero.subtitle')}</p>
            <div className="privacy-pill">
              <Icon name="lock" size={18} />
              <span>
                <strong>{t('privacy.badge')}</strong>
                <span className="block text-[13px] font-semibold opacity-80">
                  {t('privacy.short')}
                </span>
              </span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#upload" className="btn-primary">
                <Icon name="sparkle" /> {t('hero.cta')}
              </a>
              <button className="btn-secondary" onClick={() => onDemo('whatsapp')}>
                {t('hero.demo')} →
              </button>
            </div>
          </div>
          <HeroCards />
        </section>

        {/* ---------------------------------------------------------- marquee */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k}>{marquee} · </span>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------- upload */}
        <UploadSection onFile={onFile} error={error} onDismissError={onDismissError} />

        {/* ---------------------------------------------------------- demo */}
        <section className="section">
          <div className="demo-box">
            <div>
              <h2 className="section-title">{t('demo.title')}</h2>
              <p className="mt-2 font-semibold opacity-80">{t('demo.note')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-demo wa" onClick={() => onDemo('whatsapp')}>
                💬 {t('demo.whatsapp')}
              </button>
              <button className="btn-demo tg" onClick={() => onDemo('telegram')}>
                ✈️ {t('demo.telegram')}
              </button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- features */}
        <section className="section">
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(([title, text, emoji]) => (
              <div key={title} className="surface-card">
                <div className="text-4xl" aria-hidden="true">
                  {emoji}
                </div>
                <h3 className="font-display mt-4 text-xl font-extrabold">{t(title)}</h3>
                <p className="mt-2 leading-relaxed text-[var(--page-muted)]">{t(text)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- FAQ */}
        <section id="faq" className="section scroll-mt-20">
          <h2 className="section-title">{t('faq.title')}</h2>
          <div className="mt-6 grid gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="faq-item">
                <summary>
                  <span>{t(q)}</span>
                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
