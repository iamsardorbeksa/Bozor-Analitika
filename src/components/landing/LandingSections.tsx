import { useI18n } from '../../i18n'
import type { DictKey } from '../../i18n/en'
import { AWARDS_BY_ID } from '../../lib/awards'
import { HOUR } from '../../lib/stats/compute'
import { AWARD_PALETTES, PALETTES, type Palette } from '../cards/palettes'
import { Icon } from '../ui/Icon'

/* ------------------------------------------------------------------ what you'll discover */

/** Each tile borrows the palette of the card it previews, so the landing page looks like the story. */
const DISCOVER: { key: string; emoji: string; palette: Palette }[] = [
  { key: 'total', emoji: '💬', palette: PALETTES.total },
  { key: 'who', emoji: '⚖️', palette: PALETTES.who },
  { key: 'rush', emoji: '🌙', palette: PALETTES.peak },
  { key: 'streak', emoji: '🔥', palette: PALETTES.silence },
  { key: 'silence', emoji: '🧊', palette: PALETTES.intro },
  { key: 'reply', emoji: '⚡', palette: PALETTES.reply },
  { key: 'starter', emoji: '🚀', palette: PALETTES.starter },
  { key: 'laugh', emoji: '😂', palette: PALETTES.laugh },
  { key: 'words', emoji: '✨', palette: PALETTES.emojis },
]

export function DiscoverSection() {
  const { t } = useI18n()
  return (
    <section className="section" aria-labelledby="discover-title">
      <div className="section-head">
        <h2 id="discover-title" className="section-title">
          {t('discover.title')}
        </h2>
        <p className="section-sub">{t('discover.subtitle')}</p>
      </div>
      <ul className="discover-grid">
        {DISCOVER.map(({ key, emoji, palette }, i) => (
          <li
            key={key}
            className="discover-tile"
            style={{
              background: palette.bg,
              color: palette.fg,
              ['--tilt' as string]: `${(i % 3) - 1}deg`,
            }}
          >
            <span className="discover-emoji" aria-hidden="true">
              {emoji}
            </span>
            <h3 className="discover-title">{t(`discover.${key}.title` as DictKey)}</h3>
            <p className="discover-text" style={{ color: palette.muted }}>
              {t(`discover.${key}.text` as DictKey)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ awards showcase */

/** Example awards with made-up numbers, rendered with the real award texts of the current language. */
const SHOWCASE: { id: string; vars: Record<string, number> }[] = [
  { id: 'midnight-philosopher', vars: { count: 312 } },
  { id: 'voice-note-villain', vars: { count: 87 } },
  { id: 'seen-at', vars: { duration: 3 * HOUR + 14 * 60_000 } },
  { id: 'speed-demon', vars: { duration: 45_000 } },
  { id: 'chief-laughing-officer', vars: { count: 1063 } },
  { id: 'sticker-mafia', vars: { count: 248 } },
]

export function AwardShowcase() {
  const { t, awardText, awardDescription } = useI18n()
  return (
    <section className="showcase" aria-labelledby="showcase-title">
      <div className="showcase-inner">
        <div className="section-head">
          <h2 id="showcase-title" className="section-title">
            {t('showcase.title')} 🏆
          </h2>
          <p className="section-sub">{t('showcase.subtitle')}</p>
        </div>
        <ul className="showcase-grid">
          {SHOWCASE.map(({ id, vars }, i) => {
            const def = AWARDS_BY_ID.get(id)
            if (!def) return null
            const p = AWARD_PALETTES[i % AWARD_PALETTES.length]
            return (
              <li key={id} className="showcase-card" style={{ background: p.bg }}>
                <span className="showcase-emoji" aria-hidden="true">
                  {def.emoji}
                </span>
                <div>
                  <h3 className="showcase-name" style={{ color: p.accent }}>
                    {awardText(def).title}
                  </h3>
                  <p className="showcase-desc">{awardDescription(def, vars)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ features */

const FEATURES: [DictKey, DictKey, string][] = [
  ['features.private.title', 'features.private.text', '🔒'],
  ['features.share.title', 'features.share.text', '📲'],
  ['features.langs.title', 'features.langs.text', '🌍'],
  ['features.groups.title', 'features.groups.text', '👥'],
  ['features.fast.title', 'features.fast.text', '⚡'],
  ['features.free.title', 'features.free.text', '🎁'],
]

export function FeaturesSection() {
  const { t } = useI18n()
  return (
    <section className="section" aria-labelledby="features-title">
      <div className="section-head">
        <h2 id="features-title" className="section-title">
          {t('features.title')}
        </h2>
      </div>
      <ul className="features-grid">
        {FEATURES.map(([title, text, emoji]) => (
          <li key={title} className="surface-card feature-card">
            <span className="feature-emoji" aria-hidden="true">
              {emoji}
            </span>
            <h3 className="font-display mt-4 text-xl font-extrabold">{t(title)}</h3>
            <p className="mt-2 leading-relaxed text-[var(--page-muted)]">{t(text)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ use cases */

const USES: { key: string; emoji: string; color: string }[] = [
  { key: 'couples', emoji: '💑', color: '#E0145A' },
  { key: 'friends', emoji: '👯', color: '#5B2EFF' },
  { key: 'family', emoji: '👨‍👩‍👧', color: '#00A88F' },
  { key: 'teams', emoji: '🏢', color: '#1E4BFF' },
  { key: 'moments', emoji: '🎉', color: '#FF8A3D' },
]

export function UseCasesSection() {
  const { t } = useI18n()
  return (
    <section className="section" aria-labelledby="uses-title">
      <div className="section-head">
        <h2 id="uses-title" className="section-title">
          {t('uses.title')}
        </h2>
      </div>
      <ul className="uses-grid">
        {USES.map(({ key, emoji, color }) => (
          <li key={key} className="use-card" style={{ ['--use-color' as string]: color }}>
            <span className="use-emoji" aria-hidden="true">
              {emoji}
            </span>
            <h3 className="font-display text-lg font-extrabold">
              {t(`uses.${key}.title` as DictKey)}
            </h3>
            <p className="mt-1 leading-relaxed text-[var(--page-muted)]">
              {t(`uses.${key}.text` as DictKey)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ closing call to action */

export function ClosingCta({ onDemo }: { onDemo: () => void }) {
  const { t } = useI18n()
  return (
    <section className="section">
      <div className="cta-band">
        <div className="cta-glow" aria-hidden="true" />
        <h2 className="cta-title">{t('cta.title')}</h2>
        <p className="cta-text">
          <Icon name="lock" size={18} /> {t('cta.text')}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a href="#upload" className="btn-primary cta-primary">
            <Icon name="sparkle" /> {t('hero.cta')}
          </a>
          <button className="btn-secondary cta-secondary" onClick={onDemo}>
            {t('hero.demo')} <span className="dir-arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}
