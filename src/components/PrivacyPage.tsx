import { useI18n } from '../i18n'
import type { DictKey } from '../i18n/en'
import { SiteFooter, SiteHeader } from './landing/SiteChrome'
import { Icon } from './ui/Icon'

const SECTIONS: [DictKey, DictKey, string][] = [
  ['privacyPage.h1', 'privacyPage.p1', '📵'],
  ['privacyPage.h2', 'privacyPage.p2', '🛡️'],
  ['privacyPage.h3', 'privacyPage.p3', '🍪'],
  ['privacyPage.h4', 'privacyPage.p4', '🖼️'],
  ['privacyPage.h5', 'privacyPage.p5', '🧹'],
]

export function PrivacyPage() {
  const { t } = useI18n()
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <a href="#" className="link-btn inline-flex items-center gap-1 text-sm">
          <Icon name="arrowLeft" size={16} /> {t('nav.home')}
        </a>
        <h1 className="font-display mt-6 text-4xl leading-tight font-extrabold sm:text-5xl">
          {t('privacyPage.title')}
        </h1>
        <p className="mt-4 text-lg font-semibold text-[var(--page-muted)]">
          {t('privacyPage.lead')}
        </p>
        <div className="mt-10 grid gap-5">
          {SECTIONS.map(([h, p, emoji]) => (
            <section key={h} className="surface-card flex gap-4">
              <span className="text-3xl" aria-hidden="true">
                {emoji}
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold">{t(h)}</h2>
                <p className="mt-2 leading-relaxed">{t(p)}</p>
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
