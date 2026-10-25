import type { ReactNode } from 'react'
import { AWARDS_BY_ID, type AwardResult } from '../../lib/awards'
import type { ChatStats, Counted, TimeRange } from '../../lib/stats/compute'
import { dayToTimestamp } from '../../lib/stats/compute'
import { useI18n, type Translator } from '../../i18n'
import { durationParts } from '../../i18n/format'
import { AWARD_PALETTES, PALETTES, PERSON_COLORS, type Palette } from './palettes'
import { Anim, Bar, CardShell, CountUp, fitSize, Kicker, truncateName } from './primitives'

export interface CardData {
  stats: ChatStats
  awards: AwardResult[]
  /** Display names aligned with stats.people (already anonymized when hideNames is on). */
  names: string[]
  hideNames: boolean
  range: TimeRange
}

export interface CardProps {
  data: CardData
  isStatic?: boolean
}

/* ------------------------------------------------------------------ helpers */

const MAX_GROUP_ROWS = 6

interface ShareRow {
  name: string
  value: number
  color: string
  isOthers?: boolean
}

/** Top N people by a metric, the rest folded into "Others". */
function shareRows(
  data: CardData,
  metric: (i: number) => number,
  t: Translator['t'],
  max = MAX_GROUP_ROWS,
): ShareRow[] {
  const rows = data.stats.people
    .map((_, i) => ({ i, value: metric(i) }))
    .sort((a, b) => b.value - a.value)
  const top = rows.slice(0, max)
  const rest = rows.slice(max)
  const out: ShareRow[] = top.map((r) => ({
    name: data.names[r.i],
    value: r.value,
    color: PERSON_COLORS[r.i % PERSON_COLORS.length],
  }))
  if (rest.length) {
    out.push({
      name: t('common.others', { n: rest.length }),
      value: rest.reduce((s, r) => s + r.value, 0),
      color: '#8A8A8A',
      isOthers: true,
    })
  }
  return out
}

/** When names are hidden, also hide words that are someone's name. */
function filterWords(words: Counted[], data: CardData, realNames: string[]): Counted[] {
  if (!data.hideNames) return words
  const parts = new Set(
    realNames.flatMap((n) =>
      n
        .toLowerCase()
        .split(/[\s.,_-]+/)
        .filter((p) => p.length >= 3),
    ),
  )
  return words.filter((w) => !parts.has(w.key))
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

function Decor({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function Blob({
  color,
  size,
  x,
  y,
  d = 0,
  shape = 'circle',
}: {
  color: string
  size: number
  x: number
  y: number
  d?: number
  shape?: 'circle' | 'star' | 'ring' | 'square'
}) {
  const style = { left: x, top: y, width: size, height: size, animationDelay: `${d}ms` }
  if (shape === 'star') {
    return (
      <svg className="cw-anim cw-spin-in cw-shape" style={style} viewBox="0 0 100 100">
        <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill={color} />
      </svg>
    )
  }
  if (shape === 'ring') {
    return (
      <div
        className="cw-anim cw-pop cw-shape"
        style={{ ...style, border: `${size / 7}px solid ${color}`, borderRadius: '50%' }}
      />
    )
  }
  if (shape === 'square') {
    return (
      <div
        className="cw-anim cw-spin-in cw-shape"
        style={{ ...style, background: color, borderRadius: size / 5 }}
      />
    )
  }
  return (
    <div
      className="cw-anim cw-pop cw-shape"
      style={{ ...style, background: color, borderRadius: '50%' }}
    />
  )
}

/* ------------------------------------------------------------------ 1. Intro */

export function IntroCard({ data, isStatic }: CardProps) {
  const { t, shortDate } = useI18n()
  const p = PALETTES.intro
  const { stats, names } = data
  const startYear = new Date(stats.start).getFullYear()
  const endYear = new Date(stats.end).getFullYear()
  const title =
    startYear === endYear ? t('card.intro.titleYear', { year: endYear }) : t('card.intro.title')
  const who = stats.isGroup
    ? ((data.hideNames ? null : stats.chatName) ??
      t('card.intro.group', { n: stats.people.length }))
    : names.slice(0, 2).join(' & ')
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={title}
      decor={
        <Decor>
          <Blob color={p.accent} size={150} x={230} y={-40} shape="circle" />
          <Blob color={p.accent2} size={70} x={22} y={70} d={200} shape="star" />
          <Blob color="#FFFFFF" size={46} x={286} y={420} d={350} shape="ring" />
          <Blob color={p.accent} size={30} x={300} y={540} d={500} shape="square" />
        </Decor>
      }
    >
      <div className="flex h-full flex-col justify-center">
        <Anim kind="pop" d={100}>
          <span className="cw-badge" style={{ background: p.accent, color: '#121212' }}>
            {stats.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'} · Wrapped
          </span>
        </Anim>
        <Anim d={250}>
          <h2 className="cw-display mt-5" style={{ fontSize: fitSize(title, 52, 320 * 2.2, 0.75) }}>
            {title}
          </h2>
        </Anim>
        <Anim d={500}>
          <p className="mt-5 text-[20px] font-extrabold leading-tight" style={{ color: p.accent }}>
            {truncateName(who, 40)}
          </p>
        </Anim>
        <Anim d={650}>
          <p className="mt-2 text-[15px] font-semibold" style={{ color: p.muted }}>
            {shortDate(stats.start)} — {shortDate(stats.end)}
          </p>
        </Anim>
        {!isStatic && (
          <Anim d={1100} kind="fade">
            <p className="cw-hint mt-10 text-[14px] font-bold" style={{ color: p.muted }}>
              {t('card.intro.tap')} →
            </p>
          </Anim>
        )}
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 2. Total */

export function TotalCard({ data, isStatic }: CardProps) {
  const { t, tp, num, date } = useI18n()
  const p = PALETTES.total
  const { stats } = data
  const perDay = stats.daysActive ? stats.totalMessages / stats.daysActive : 0
  const bigText = num(stats.totalMessages)
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.total.label', { n: bigText })}
      decor={
        <Decor>
          <Blob color={p.accent} size={120} x={250} y={470} shape="star" d={600} />
          <Blob color={p.accent2} size={60} x={-20} y={30} shape="circle" d={300} />
        </Decor>
      }
    >
      <Kicker>{stats.isGroup ? t('card.total.kickerGroup') : t('card.total.kicker')}</Kicker>
      <Anim kind="zoom" d={150}>
        <div
          className="cw-display mt-3"
          style={{ fontSize: fitSize(bigText, 88, 312), color: p.accent }}
        >
          <CountUp value={stats.totalMessages} isStatic={isStatic} />
        </div>
      </Anim>
      <Anim d={300}>
        <div className="cw-display text-[30px]">{tp('unit.messages', stats.totalMessages)}</div>
      </Anim>
      <div className="mt-7 grid gap-3">
        {[
          [tp('card.total.words', stats.totalWords), '✍️'],
          [tp('card.total.days', stats.daysActive), '📅'],
          [t('card.total.perDay', { n: num(perDay, perDay < 10 ? 1 : 0) }), '⚡'],
        ].map(([text, emoji], i) => (
          <Anim key={i} d={600 + i * 150} kind="slide">
            <div className="cw-panel flex items-center gap-3 text-[16px] font-bold">
              <span className="text-[22px]">{emoji}</span>
              <span>{text}</span>
            </div>
          </Anim>
        ))}
      </div>
      {stats.busiestDay && (
        <Anim d={1150}>
          <div
            className="mt-5 rounded-[22px] p-4"
            style={{ background: p.accent, color: '#2B0A3D' }}
          >
            <div className="text-[12px] font-extrabold tracking-wider uppercase">
              {t('card.total.busiest')}
            </div>
            <div className="cw-display mt-1 text-[22px]">
              {date(dayToTimestamp(stats.busiestDay.day))}
            </div>
            <div className="text-[15px] font-bold">
              {tp('card.total.busiestCount', stats.busiestDay.count)}
            </div>
          </div>
        </Anim>
      )}
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 3. Who talks more */

export function WhoTalksCard({ data, isStatic }: CardProps) {
  const { t, num } = useI18n()
  const p = PALETTES.who
  const { stats, names } = data
  const total = stats.totalMessages
  if (!stats.isGroup && stats.people.length === 2) {
    const [a, b] = stats.people
    const aPct = pct(a.messages, total)
    const bPct = 100 - aPct
    const balanced = Math.abs(aPct - bPct) <= 4
    const longer = a.avgWords >= b.avgWords ? 0 : 1
    const other = 1 - longer
    return (
      <CardShell palette={p} isStatic={isStatic} label={t('card.who.kicker')}>
        <Kicker>{t('card.who.kicker')}</Kicker>
        <Anim d={150}>
          <h2 className="cw-display mt-3 text-[34px]">
            {balanced
              ? t('card.who.balanced')
              : t('card.who.more', { name: truncateName(names[0], 16) })}
          </h2>
        </Anim>
        <div className="mt-6 flex h-[230px] items-end gap-4">
          {[
            { name: names[0], v: aPct, color: p.accent, n: a.messages },
            { name: names[1], v: bPct, color: p.accent2, n: b.messages },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-stretch justify-end"
              style={{ height: '100%' }}
            >
              <Anim kind="pop" d={700 + i * 150}>
                <div className="cw-display text-[44px] leading-none">
                  <CountUp
                    value={s.v}
                    isStatic={isStatic}
                    format={(n) => `${Math.round(n)}%`}
                    delay={600}
                  />
                </div>
              </Anim>
              <div
                className="cw-anim cw-grow-y mt-2 rounded-[18px]"
                style={{
                  height: `${Math.max(8, s.v * 1.3)}px`,
                  background: s.color,
                  animationDelay: `${300 + i * 150}ms`,
                }}
              />
              <div className="mt-2 truncate text-[15px] font-extrabold">
                {truncateName(s.name, 18)}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: p.muted }}>
                {t('card.who.msgs', { n: num(s.n) })}
              </div>
            </div>
          ))}
        </div>
        <Anim d={1200}>
          <div className="cw-panel mt-6 text-[15px] font-semibold leading-snug">
            <span className="text-[20px]">📝 </span>
            {t('card.who.longer', {
              name: truncateName(names[longer], 18),
              n: num(stats.people[longer].avgWords, 1),
              m: num(stats.people[other].avgWords, 1),
            })}
          </div>
        </Anim>
      </CardShell>
    )
  }
  const rows = shareRows(data, (i) => stats.people[i].messages, t)
  const max = Math.max(...rows.map((r) => r.value))
  return (
    <CardShell palette={p} isStatic={isStatic} label={t('card.who.kicker')}>
      <Kicker>{t('card.who.kicker')}</Kicker>
      <Anim d={150}>
        <h2 className="cw-display mt-3 text-[30px]">
          {t('card.who.groupTitle', { name: truncateName(names[0], 16) })}
        </h2>
      </Anim>
      <div className="mt-6 grid gap-[14px]">
        {rows.map((r, i) => (
          <Anim key={i} d={300 + i * 110} kind="slide">
            <div className="flex items-baseline justify-between gap-2 text-[15px] font-extrabold">
              <span className="truncate">
                {i + 1}. {truncateName(r.name, 20)}
              </span>
              <span className="tabular-nums">{pct(r.value, total)}%</span>
            </div>
            <div className="mt-1">
              <Bar
                fraction={r.value / max}
                color={r.isOthers ? '#6b6b6b' : i === 0 ? p.accent2 : p.accent}
                d={400 + i * 110}
                height={12}
              />
            </div>
          </Anim>
        ))}
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 4. Peak hour */

function hourVibe(h: number, t: Translator['t']): string {
  if (h >= 22 || h < 4) return t('card.peak.vibe.night')
  if (h < 10) return t('card.peak.vibe.morning')
  if (h < 14) return t('card.peak.vibe.lunch')
  if (h < 18) return t('card.peak.vibe.afternoon')
  return t('card.peak.vibe.evening')
}

export function PeakHourCard({ data, isStatic }: CardProps) {
  const { t, hour, weekday, num } = useI18n()
  const p = PALETTES.peak
  const { stats } = data
  const max = Math.max(...stats.hourly, 1)
  const wmax = Math.max(...stats.weekday, 1)
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.peak.kicker')}
      decor={
        <Decor>
          <Blob color={p.accent2} size={96} x={292} y={-38} shape="circle" d={200} />
          <Blob color={p.accent} size={14} x={60} y={60} shape="circle" d={400} />
          <Blob color={p.accent} size={10} x={210} y={30} shape="circle" d={500} />
        </Decor>
      }
    >
      <Kicker>{t('card.peak.kicker')}</Kicker>
      <Anim kind="zoom" d={150}>
        <div className="cw-display mt-2 text-[76px] leading-none" style={{ color: p.accent }}>
          {hour(stats.peakHour)}
        </div>
      </Anim>
      <Anim d={350}>
        <p className="mt-3 text-[18px] font-extrabold">{hourVibe(stats.peakHour, t)}</p>
      </Anim>
      <div
        className="mt-6 flex h-[120px] items-end gap-[3px]"
        role="img"
        aria-label={t('card.peak.chartLabel')}
      >
        {stats.hourly.map((v, h) => (
          <div
            key={h}
            className="cw-anim cw-grow-y flex-1 rounded-t-[4px]"
            style={{
              height: `${Math.max(3, (v / max) * 100)}%`,
              background: h === stats.peakHour ? p.accent : 'rgba(244,241,255,0.28)',
              animationDelay: `${400 + h * 30}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold" style={{ color: p.muted }}>
        <span>{hour(0)}</span>
        <span>{hour(6)}</span>
        <span>{hour(12)}</span>
        <span>{hour(18)}</span>
        <span>{hour(23)}</span>
      </div>
      <Anim d={1200}>
        <div className="cw-panel mt-6">
          <div
            className="text-[12px] font-extrabold tracking-wider uppercase"
            style={{ color: p.muted }}
          >
            {t('card.peak.day')}
          </div>
          <div className="cw-display mt-1 text-[24px] capitalize" style={{ color: p.accent2 }}>
            {weekday(stats.peakWeekday)}
          </div>
          <div className="mt-3 flex items-end gap-2" style={{ height: 44 }}>
            {stats.weekday.map((v, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                style={{ height: '100%' }}
              >
                <div
                  className="cw-anim cw-grow-y w-full rounded-[4px]"
                  style={{
                    height: `${Math.max(6, (v / wmax) * 100)}%`,
                    background: i === stats.peakWeekday ? p.accent2 : 'rgba(244,241,255,0.3)',
                    animationDelay: `${1300 + i * 50}ms`,
                  }}
                  title={num(v)}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2 text-[10px] font-bold" style={{ color: p.muted }}>
            {stats.weekday.map((_, i) => (
              <span key={i} className="flex-1 text-center capitalize">
                {weekday(i, 'short').slice(0, 2)}
              </span>
            ))}
          </div>
        </div>
      </Anim>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 5. Silence & streak */

export function SilenceCard({ data, isStatic }: CardProps) {
  const { t, tp, lang, date, num } = useI18n()
  const p = PALETTES.silence
  const { stats, names } = data
  const s = stats.longestSilence
  const parts = s ? durationParts(s.ms, lang) : null
  const streak = stats.longestStreak
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.silence.kicker')}
      decor={
        <Decor>
          <Blob color={p.accent} size={200} x={190} y={-70} shape="ring" />
        </Decor>
      }
    >
      <Kicker>{t('card.silence.kicker')}</Kicker>
      {s && parts && (
        <>
          <Anim kind="zoom" d={150}>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="cw-display text-[96px] leading-none">
                <CountUp value={parts.value} isStatic={isStatic} />
              </span>
              <span className="cw-display text-[26px]">{parts.label}</span>
            </div>
          </Anim>
          <Anim d={400}>
            <p className="mt-3 text-[16px] font-bold" style={{ color: p.muted }}>
              {t('card.silence.between', { from: date(s.start), to: date(s.end) })}
            </p>
          </Anim>
          {s.brokenBy >= 0 && (
            <Anim d={650}>
              <div className="cw-panel mt-5 text-[16px] font-bold leading-snug">
                <span className="text-[22px]">🧊 </span>
                {t('card.silence.broke', { name: truncateName(names[s.brokenBy], 20) })}
              </div>
            </Anim>
          )}
        </>
      )}
      <Anim d={1000}>
        <div className="mt-6 rounded-[24px] p-5" style={{ background: p.fg, color: p.bg }}>
          <div
            className="text-[12px] font-extrabold tracking-wider uppercase"
            style={{ color: p.accent }}
          >
            {t('card.streak.kicker')}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="cw-display shrink-0 text-[56px] leading-none whitespace-nowrap"
              style={{ color: p.bg }}
            >
              <CountUp value={streak.days} isStatic={isStatic} delay={1000} />
            </span>
            <span className="cw-display text-[18px]" style={{ color: '#FFF3E0' }}>
              {tp('unit.daysInARow', streak.days)} 🔥
            </span>
          </div>
          {streak.days > 1 && (
            <div
              className="mt-2 text-[13px] font-semibold"
              style={{ color: 'rgba(255,243,224,0.8)' }}
            >
              {date(dayToTimestamp(streak.startDay))} — {date(dayToTimestamp(streak.endDay))}
            </div>
          )}
          <div
            className="mt-1 text-[13px] font-semibold"
            style={{ color: 'rgba(255,243,224,0.8)' }}
          >
            {t('card.streak.active', { n: num(stats.daysActive), m: num(stats.daysSpan) })}
          </div>
        </div>
      </Anim>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 6. Reply speed */

export function ReplySpeedCard({ data, isStatic }: CardProps) {
  const { t, duration } = useI18n()
  const p = PALETTES.reply
  const { stats, names } = data
  const rows = stats.people
    .map((person, i) => ({ i, ms: person.medianReplyMs }))
    .filter((r): r is { i: number; ms: number } => r.ms !== null)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 6)
  const fastest = rows[0]
  const slowest = rows[rows.length - 1]
  const maxMs = Math.max(...rows.map((r) => r.ms), 1)
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.reply.kicker')}
      decor={
        <Decor>
          <Blob color={p.accent2} size={80} x={270} y={480} shape="star" d={800} />
        </Decor>
      }
    >
      <Kicker>{t('card.reply.kicker')}</Kicker>
      {fastest && (
        <>
          <Anim d={150}>
            <h2 className="cw-display mt-3 text-[32px]">
              {t('card.reply.fastest', { name: truncateName(names[fastest.i], 16) })} ⚡
            </h2>
          </Anim>
          <Anim kind="zoom" d={350}>
            <div className="cw-display mt-3 text-[54px] leading-none" style={{ color: p.accent2 }}>
              {duration(fastest.ms)}
            </div>
          </Anim>
          <Anim d={450}>
            <p className="mt-2 text-[14px] font-semibold" style={{ color: p.muted }}>
              {t('card.reply.median')}
            </p>
          </Anim>
        </>
      )}
      <div className="mt-6 grid gap-3">
        {rows.map((r, idx) => (
          <Anim key={r.i} d={650 + idx * 120} kind="slide">
            <div className="flex items-baseline justify-between gap-2 text-[15px] font-extrabold">
              <span className="truncate">{truncateName(names[r.i], 20)}</span>
              <span className="tabular-nums">{duration(r.ms)}</span>
            </div>
            <div className="mt-1">
              <Bar
                fraction={r.ms / maxMs}
                color={idx === 0 ? p.accent2 : p.accent}
                d={750 + idx * 120}
                height={10}
              />
            </div>
          </Anim>
        ))}
      </div>
      {slowest && rows.length > 1 && (
        <Anim d={1400}>
          <p className="mt-5 text-[14px] font-semibold leading-snug" style={{ color: p.muted }}>
            {t('card.reply.slowest', { name: truncateName(names[slowest.i], 18) })}
          </p>
        </Anim>
      )}
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 7. Top words */

export function TopWordsCard({ data, isStatic, realNames }: CardProps & { realNames: string[] }) {
  const { t, num } = useI18n()
  const p = PALETTES.words
  const { stats, names } = data
  if (!stats.isGroup && stats.people.length === 2) {
    return (
      <CardShell palette={p} isStatic={isStatic} label={t('card.words.kicker')}>
        <Kicker>{t('card.words.kicker')}</Kicker>
        <Anim d={150}>
          <h2 className="cw-display mt-3 text-[30px]">{t('card.words.title')}</h2>
        </Anim>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {stats.people.slice(0, 2).map((person, pi) => {
            const words = filterWords(person.topWords, data, realNames).slice(0, 6)
            return (
              <div key={pi}>
                <Anim d={300 + pi * 150}>
                  <div
                    className="truncate rounded-full px-3 py-1 text-center text-[13px] font-extrabold"
                    style={{ background: pi === 0 ? p.accent : p.accent2, color: '#fff' }}
                  >
                    {truncateName(names[pi], 14)}
                  </div>
                </Anim>
                <ol className="mt-3 grid gap-2">
                  {words.map((w, i) => (
                    <Anim key={w.key} d={450 + i * 90 + pi * 60} kind="pop">
                      <li className="flex items-baseline justify-between gap-1">
                        <span
                          className="cw-display truncate"
                          style={{ fontSize: i === 0 ? 22 : 16 }}
                        >
                          {w.key}
                        </span>
                        <span
                          className="text-[12px] font-bold tabular-nums"
                          style={{ color: p.muted }}
                        >
                          {num(w.count)}
                        </span>
                      </li>
                    </Anim>
                  ))}
                  {words.length === 0 && <li className="text-[14px] font-semibold">—</li>}
                </ol>
              </div>
            )
          })}
        </div>
      </CardShell>
    )
  }
  const words = filterWords(stats.topWords, data, realNames).slice(0, 10)
  const maxCount = words[0]?.count ?? 1
  return (
    <CardShell palette={p} isStatic={isStatic} label={t('card.words.kicker')}>
      <Kicker>{t('card.words.kicker')}</Kicker>
      <Anim d={150}>
        <h2 className="cw-display mt-3 text-[30px]">{t('card.words.titleGroup')}</h2>
      </Anim>
      <ol className="mt-5 grid gap-1">
        {words.map((w, i) => (
          <Anim key={w.key} d={300 + i * 90} kind="pop">
            <li className="flex items-baseline gap-3">
              <span
                className="w-6 text-[13px] font-extrabold tabular-nums"
                style={{ color: p.accent }}
              >
                {i + 1}
              </span>
              <span
                className="cw-display flex-1 truncate"
                style={{
                  fontSize: Math.round(16 + 18 * Math.sqrt(w.count / maxCount)),
                  color: i === 0 ? p.accent : p.fg,
                }}
              >
                {w.key}
              </span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: p.muted }}>
                ×{num(w.count)}
              </span>
            </li>
          </Anim>
        ))}
      </ol>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 8. Top emojis */

export function TopEmojisCard({ data, isStatic }: CardProps) {
  const { t, num } = useI18n()
  const p = PALETTES.emojis
  const { stats, names } = data
  const [top, ...rest] = stats.topEmojis
  return (
    <CardShell palette={p} isStatic={isStatic} label={t('card.emoji.kicker')}>
      <Kicker>{t('card.emoji.kicker')}</Kicker>
      {top && (
        <div className="mt-2 flex items-center gap-4">
          <Anim kind="pop" d={200}>
            <div className="cw-emoji text-[110px] leading-none" role="img" aria-label={top.key}>
              {top.key}
            </div>
          </Anim>
          <Anim d={450}>
            <div className="cw-display text-[36px] leading-none">
              <CountUp value={top.count} isStatic={isStatic} />
            </div>
            <div className="text-[15px] font-bold" style={{ color: p.muted }}>
              {t('card.emoji.used')}
            </div>
          </Anim>
        </div>
      )}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {rest.slice(0, 6).map((e, i) => (
          <Anim key={e.key} kind="pop" d={650 + i * 100}>
            <div className="cw-panel flex flex-col items-center py-3">
              <span className="cw-emoji text-[36px] leading-none">{e.key}</span>
              <span className="mt-1 text-[13px] font-extrabold tabular-nums">{num(e.count)}</span>
            </div>
          </Anim>
        ))}
      </div>
      {stats.people.length >= 2 && (
        <Anim d={1350}>
          <div className="mt-5 grid gap-2">
            {stats.people.slice(0, stats.isGroup ? 4 : 2).map((person, i) =>
              person.topEmojis[0] ? (
                <div key={i} className="flex items-center justify-between text-[15px] font-bold">
                  <span className="truncate">{truncateName(names[i], 20)}</span>
                  <span>
                    <span className="cw-emoji text-[22px]">{person.topEmojis[0].key}</span>{' '}
                    <span style={{ color: p.muted }}>×{num(person.topEmojis[0].count)}</span>
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </Anim>
      )}
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 9. Laugh-o-meter */

export function LaughCard({ data, isStatic }: CardProps) {
  const { t, num } = useI18n()
  const p = PALETTES.laugh
  const { stats, names } = data
  const per100 = stats.totalMessages ? (stats.totalLaughs / stats.totalMessages) * 100 : 0
  // Gauge: 0..30 laughs per 100 messages
  const level = Math.min(1, per100 / 30)
  const angle = -90 + level * 180
  const rating =
    per100 >= 15
      ? t('card.laugh.rating.club')
      : per100 >= 6
        ? t('card.laugh.rating.vibes')
        : per100 >= 2
          ? t('card.laugh.rating.smiles')
          : t('card.laugh.rating.serious')
  const rows = shareRows(data, (i) => stats.people[i].laughs, t, 5).filter((r) => r.value > 0)
  const max = Math.max(...rows.map((r) => r.value), 1)
  const top = stats.people.map((x, i) => ({ i, v: x.laughs })).sort((a, b) => b.v - a.v)[0]
  return (
    <CardShell palette={p} isStatic={isStatic} label={t('card.laugh.kicker')}>
      <Kicker>{t('card.laugh.kicker')}</Kicker>
      <div
        className="relative mx-auto mt-4"
        style={{ width: 260, height: 140 }}
        role="img"
        aria-label={rating}
      >
        <svg width="260" height="140" viewBox="0 0 260 140">
          <path
            d="M20 130 A110 110 0 0 1 240 130"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="cw-anim cw-draw"
            d="M20 130 A110 110 0 0 1 240 130"
            stroke={p.accent}
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${level * 100} 100`}
            style={{ animationDelay: '300ms' }}
          />
        </svg>
        <div
          className="cw-anim cw-needle absolute"
          style={{
            left: 128,
            top: 30,
            width: 4,
            height: 100,
            background: '#fff',
            borderRadius: 4,
            transformOrigin: '50% 100%',
            transform: `rotate(${angle}deg)`,
            animationDelay: '300ms',
            ['--angle' as string]: `${angle}deg`,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{ left: 118, top: 118, width: 24, height: 24, background: '#fff' }}
        />
      </div>
      <Anim d={700} kind="pop">
        <div className="mt-3 text-center">
          <div className="cw-display text-[56px] leading-none" style={{ color: p.accent }}>
            <CountUp value={stats.totalLaughs} isStatic={isStatic} />
          </div>
          <div className="mt-1 text-[16px] font-extrabold">
            {t('card.laugh.total', { n: num(per100, 1) })}
          </div>
          <div className="cw-display mt-2 text-[20px]">{rating}</div>
        </div>
      </Anim>
      <div className="mt-5 grid gap-[10px]">
        {rows.map((r, i) => (
          <Anim key={i} d={1000 + i * 100} kind="slide">
            <div className="flex justify-between text-[14px] font-extrabold">
              <span className="truncate">{truncateName(r.name, 20)}</span>
              <span className="tabular-nums">{num(r.value)} 😂</span>
            </div>
            <div className="mt-1">
              <Bar
                fraction={r.value / max}
                color={i === 0 ? p.accent : p.accent2}
                d={1100 + i * 100}
                height={10}
              />
            </div>
          </Anim>
        ))}
      </div>
      {top && top.v > 0 && stats.people.length > 1 && (
        <Anim d={1500}>
          <p className="mt-4 text-center text-[14px] font-bold" style={{ color: p.muted }}>
            {t('card.laugh.most', { name: truncateName(names[top.i], 18) })}
          </p>
        </Anim>
      )}
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 10. Awards */

export function AwardsCard({
  data,
  isStatic,
  people,
  paletteIndex,
}: CardProps & { people: number[]; paletteIndex: number }) {
  const { t, lang, duration, num, hour } = useI18n()
  const p: Palette = AWARD_PALETTES[paletteIndex % AWARD_PALETTES.length]
  const compact = people.length > 1
  const fill = (template: string, vars: Record<string, number>) =>
    template.replace(/\{(\w+)\}/g, (m, k: string) => {
      if (!(k in vars)) return m
      const v = vars[k]
      if (k === 'duration') return duration(v)
      if (k === 'pct') return `${v}%`
      if (k === 'hour') return hour(v)
      return num(v, 1)
    })
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.awards.kicker')}
      decor={
        <Decor>
          <Blob color={p.accent} size={60} x={290} y={24} shape="star" d={200} />
          <Blob color={p.accent2} size={26} x={250} y={90} shape="star" d={400} />
        </Decor>
      }
    >
      <Kicker>{t('card.awards.kicker')} 🏆</Kicker>
      <div className={compact ? 'mt-3 grid gap-4' : 'mt-3'}>
        {people.map((personIndex, pi) => {
          const awards = data.awards
            .filter((a) => a.personIndex === personIndex)
            .slice(0, compact ? 2 : 3)
          return (
            <div key={personIndex}>
              <Anim d={150 + pi * 250}>
                <h2
                  className="cw-display truncate"
                  style={{
                    fontSize: compact ? 22 : fitSize(data.names[personIndex], 38, 300, 0.85),
                    color: p.accent,
                  }}
                >
                  {truncateName(data.names[personIndex], compact ? 20 : 24)}
                </h2>
              </Anim>
              <div className={compact ? 'mt-2 grid gap-2' : 'mt-5 grid gap-4'}>
                {awards.map((a, i) => {
                  const def = AWARDS_BY_ID.get(a.awardId)
                  if (!def) return null
                  return (
                    <Anim key={a.awardId} kind="pop" d={400 + pi * 250 + i * 200}>
                      <div
                        className="cw-panel flex gap-3"
                        style={{ padding: compact ? '10px 12px' : '16px' }}
                      >
                        <span
                          className="cw-emoji leading-none"
                          style={{ fontSize: compact ? 26 : 38 }}
                        >
                          {def.emoji}
                        </span>
                        <div className="min-w-0">
                          <div
                            className="cw-display leading-tight"
                            style={{ fontSize: compact ? 14 : 18 }}
                          >
                            {def.title[lang]}
                          </div>
                          <div
                            className="mt-1 font-semibold leading-snug"
                            style={{ fontSize: compact ? 12 : 14, color: p.muted }}
                          >
                            {fill(def.description[lang], a.vars)}
                          </div>
                        </div>
                      </div>
                    </Anim>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 11. Conversation starter */

export function StarterCard({ data, isStatic }: CardProps) {
  const { t, tp, num } = useI18n()
  const p = PALETTES.starter
  const { stats, names } = data
  const totalStarts = stats.totalConversations || 1
  const rows = shareRows(data, (i) => stats.people[i].convStarts, t, 5)
  const top = rows[0]
  const killer = stats.people.map((x, i) => ({ i, v: x.convEnds })).sort((a, b) => b.v - a.v)[0]
  const doubles = stats.people.map((x, i) => ({ i, v: x.doubleTexts })).sort((a, b) => b.v - a.v)[0]
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      label={t('card.starter.kicker')}
      decor={
        <Decor>
          <Blob color={p.accent2} size={100} x={286} y={-46} shape="circle" d={200} />
          <Blob color={p.accent} size={30} x={312} y={560} shape="square" d={450} />
        </Decor>
      }
    >
      <Kicker>{t('card.starter.kicker')}</Kicker>
      {top && (
        <>
          <Anim d={150}>
            <h2 className="cw-display mt-3 text-[30px] leading-tight">
              {t('card.starter.title', { name: truncateName(top.name, 16) })}
            </h2>
          </Anim>
          <Anim kind="zoom" d={350}>
            <div className="cw-display mt-3 text-[80px] leading-none" style={{ color: p.accent }}>
              <CountUp
                value={pct(top.value, totalStarts)}
                isStatic={isStatic}
                format={(n) => `${Math.round(n)}%`}
              />
            </div>
          </Anim>
          <Anim d={500}>
            <p className="text-[15px] font-bold" style={{ color: p.muted }}>
              {t('card.starter.of', { n: num(stats.totalConversations) })}
            </p>
          </Anim>
        </>
      )}
      <div
        className="mt-5 flex h-[18px] w-full overflow-hidden rounded-full"
        style={{ background: p.panel }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            className="cw-anim cw-grow-x h-full"
            style={{
              width: `${(r.value / totalStarts) * 100}%`,
              background:
                i === 0
                  ? p.accent2
                  : r.isOthers
                    ? '#5f8f88'
                    : PERSON_COLORS[(i + 2) % PERSON_COLORS.length],
              animationDelay: `${650 + i * 80}ms`,
            }}
          />
        ))}
      </div>
      <div
        className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold"
        style={{ color: p.muted }}
      >
        {rows.map((r, i) => (
          <span key={i}>
            {truncateName(r.name, 14)} {pct(r.value, totalStarts)}%
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {killer && killer.v > 0 && (
          <Anim d={1000} kind="slide">
            <div className="cw-panel text-[15px] font-bold leading-snug">
              <span className="text-[20px]">🔚 </span>
              {t('card.starter.killer', { name: truncateName(names[killer.i], 18) })}{' '}
              <span style={{ color: p.muted }}>({tp('unit.times', killer.v)})</span>
            </div>
          </Anim>
        )}
        {doubles && doubles.v > 0 && (
          <Anim d={1200} kind="slide">
            <div className="cw-panel text-[15px] font-bold leading-snug">
              <span className="text-[20px]">🔁 </span>
              {t('card.starter.double', { name: truncateName(names[doubles.i], 18) })}{' '}
              <span style={{ color: p.muted }}>({tp('unit.times', doubles.v)})</span>
            </div>
          </Anim>
        )}
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ 12. Summary */

export function SummaryCard({ data, isStatic, realNames }: CardProps & { realNames: string[] }) {
  const { t, compact, hour, duration, num } = useI18n()
  const p = PALETTES.summary
  const { stats, names } = data
  const topWord = filterWords(stats.topWords, data, realNames)[0]
  const fastest = stats.people
    .map((x, i) => ({ i, ms: x.medianReplyMs }))
    .filter((r): r is { i: number; ms: number } => r.ms !== null)
    .sort((a, b) => a.ms - b.ms)[0]
  const title = stats.isGroup
    ? ((data.hideNames ? null : stats.chatName) ?? t('card.summary.titleGroup'))
    : names.slice(0, 2).join(' & ')
  const tiles: { label: string; value: string; emoji?: boolean }[] = [
    { label: t('card.summary.messages'), value: compact(stats.totalMessages) },
    { label: t('card.summary.days'), value: num(stats.daysActive) },
    { label: t('card.summary.peak'), value: hour(stats.peakHour) },
    { label: t('card.summary.streak'), value: `${num(stats.longestStreak.days)} 🔥` },
  ]
  if (stats.topEmojis[0])
    tiles.push({ label: t('card.summary.emoji'), value: stats.topEmojis[0].key, emoji: true })
  if (topWord) tiles.push({ label: t('card.summary.word'), value: topWord.key })
  if (fastest)
    tiles.push({ label: t('card.summary.fastest'), value: truncateName(names[fastest.i], 12) })
  tiles.push({ label: t('card.summary.laughs'), value: compact(stats.totalLaughs) })
  const shown = tiles.slice(0, 8)
  return (
    <CardShell
      palette={p}
      isStatic={isStatic}
      footer="cta"
      label={t('card.summary.kicker')}
      decor={
        <Decor>
          <div className="cw-summary-glow" />
        </Decor>
      }
    >
      <Kicker>{t('card.summary.kicker')}</Kicker>
      <Anim d={150}>
        <h2
          className="cw-display mt-2 leading-tight"
          style={{ fontSize: fitSize(title, 30, 640, 0.8) }}
        >
          {truncateName(title, 40)}
        </h2>
      </Anim>
      <div className="mt-5 grid grid-cols-2 gap-[10px]">
        {shown.map((tile, i) => (
          <Anim key={i} kind="pop" d={300 + i * 90}>
            <div
              className="rounded-[18px] p-3"
              style={{
                background: i === 0 ? p.accent : p.panel,
                color: i === 0 ? '#121212' : p.fg,
                minHeight: 82,
              }}
            >
              <div
                className="text-[11px] font-extrabold tracking-wider uppercase"
                style={{ opacity: 0.75 }}
              >
                {tile.label}
              </div>
              <div
                className={`${tile.emoji ? 'cw-emoji' : 'cw-display'} mt-1 truncate leading-tight`}
                style={{ fontSize: tile.emoji ? 30 : fitSize(tile.value, 24, 130, 0.8) }}
              >
                {tile.value}
              </div>
            </div>
          </Anim>
        ))}
      </div>
      {shown.length < 8 && <div className="h-4" />}
      <Anim d={1200}>
        <p className="mt-4 text-center text-[13px] font-bold" style={{ color: p.muted }}>
          {t('card.summary.duration', { d: duration(stats.end - stats.start) })}
        </p>
      </Anim>
    </CardShell>
  )
}
