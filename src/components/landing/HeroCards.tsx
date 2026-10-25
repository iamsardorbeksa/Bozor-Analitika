import { useI18n } from '../../i18n'
import { AWARDS_BY_ID } from '../../lib/awards'

const HOURLY = [3, 2, 1, 1, 1, 2, 3, 4, 5, 4, 5, 6, 5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 15]

/** Decorative fan of mini story cards next to the hero headline. */
export function HeroCards() {
  const { t, tp, num, hour, lang } = useI18n()
  const speed = AWARDS_BY_ID.get('speed-demon')!
  return (
    <div className="hero-cards" aria-hidden="true">
      <div className="mini-card mini-1 landing-float">
        <span className="mini-kicker">{t('card.summary.peak')}</span>
        <span className="mini-big">{hour(23)}</span>
        <span className="mini-sub">{t('card.peak.vibe.night')}</span>
        <span className="mini-bars">
          {HOURLY.map((h, i) => (
            <span key={i} style={{ height: `${h * 6}%` }} className={i === 22 ? 'is-peak' : ''} />
          ))}
        </span>
      </div>
      <div className="mini-card mini-2 landing-float">
        <span className="mini-kicker">{t('card.emoji.kicker')}</span>
        <span className="mini-emoji">😂</span>
        <span className="mini-sub">{tp('unit.times', 1063)}</span>
      </div>
      <div className="mini-card mini-3 landing-float">
        <span className="mini-kicker">{t('card.total.kicker')}</span>
        <span className="mini-big">{num(4524)}</span>
        <span className="mini-sub">{tp('unit.messages', 4524)}</span>
        <span className="mini-award">
          {speed.emoji} {speed.title[lang]}
        </span>
      </div>
    </div>
  )
}
