/**
 * All award definitions live in this file. Each award has:
 *  - condition(person, ctx): a score when the person qualifies (higher = stronger claim), or null
 *  - vars(person, ctx): numbers for the description placeholders
 *  - title / description in English (translations live next to the other UI strings,
 *    in src/i18n/<lang>.ts as `<lang>Awards`, keyed by award id)
 *
 * Placeholders: {count} → number, {pct} → percentage, {duration} → ms formatted as time,
 * {hour} → hour of day. Keep the tone warm and playful: never about looks, identity or anything hurtful.
 */
import type { ChatStats, PersonStats } from './stats/compute'
import { DAY, HOUR } from './stats/compute'

export interface AwardContext {
  stats: ChatStats
  /** Index of the person in stats.people. */
  index: number
  totalConversations: number
}

export interface AwardDef {
  id: string
  emoji: string
  title: string
  description: string
  condition: (p: PersonStats, ctx: AwardContext) => number | null
  vars: (p: PersonStats, ctx: AwardContext) => Record<string, number>
  /** Funnier / more meaningful awards win ties against weaker ones. */
  priority?: number
  /** Fallback awards are only handed out to people who won nothing else. */
  fallback?: boolean
}

const atLeast = (value: number, min: number) => (value >= min ? value : null)
const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

export const AWARDS: AwardDef[] = [
  {
    id: 'midnight-philosopher',
    emoji: '🌙',
    priority: 1.3,
    title: 'The Midnight Philosopher',
    description: '{count} messages between midnight and 5 AM. Deep thoughts need dark skies.',
    condition: (p) => atLeast(p.lateNight, 3),
    vars: (p) => ({ count: p.lateNight }),
  },
  {
    id: 'voice-note-villain',
    emoji: '🎙️',
    priority: 1.3,
    title: 'The Voice Note Villain',
    description: '{count} voice messages. When does the podcast launch?',
    condition: (p) => atLeast(p.voice, 3),
    vars: (p) => ({ count: p.voice }),
  },
  {
    id: 'seen-at',
    emoji: '👀',
    priority: 1.3,
    title: 'Seen at 2:14 PM',
    description: 'Median reply time: {duration}. Good things come to those who wait.',
    condition: (p) => (p.medianReplyMs !== null && p.replyCount >= 5 ? p.medianReplyMs + 1 : null),
    vars: (p) => ({ duration: p.medianReplyMs ?? 0 }),
  },
  {
    id: 'speed-demon',
    emoji: '⚡',
    priority: 1.3,
    title: 'Speed Demon',
    description: 'Replies in {duration} (median). Are your thumbs okay?',
    condition: (p) =>
      p.medianReplyMs !== null && p.replyCount >= 5 ? 1 / (p.medianReplyMs + 1000) : null,
    vars: (p) => ({ duration: p.medianReplyMs ?? 0 }),
  },
  {
    id: 'essay-writer',
    emoji: '📜',
    priority: 1.2,
    title: 'The Essay Writer',
    description: '{count} words per message on average. Chapter two when?',
    condition: (p) => (p.textMessages >= 20 && p.avgWords >= 4 ? p.avgWords : null),
    vars: (p) => ({ count: Math.round(p.avgWords * 10) / 10 }),
  },
  {
    id: 'hype-machine',
    emoji: '🎉',
    title: 'The Hype Machine',
    description: '{count} exclamation marks and emojis. Pure energy!!!',
    condition: (p) => {
      const hype = (p.exclamations + p.emojiCount) / Math.max(1, p.messages)
      return p.messages >= 20 && hype >= 0.2 ? hype : null
    },
    vars: (p) => ({ count: p.exclamations + p.emojiCount }),
  },
  {
    id: 'ghost-mode',
    emoji: '👻',
    priority: 1.2,
    title: 'Ghost Mode',
    description: 'Once vanished for {duration} before replying. Spooky.',
    condition: (p) => atLeast(p.maxGhostMs, 12 * HOUR),
    vars: (p) => ({ duration: p.maxGhostMs }),
  },
  {
    id: 'conversation-starter',
    emoji: '🚀',
    priority: 1.2,
    title: 'The Conversation Starter',
    description: 'Kicked off {pct} of all conversations. The chat’s alarm clock.',
    condition: (p) => atLeast(p.convStarts, 3),
    vars: (p, ctx) => ({ pct: share(p.convStarts, ctx.totalConversations) }),
  },
  {
    id: 'topic-killer',
    emoji: '🔚',
    title: 'The Topic Killer',
    description: 'Had the last word before a long silence {count} times. Mic drop.',
    condition: (p) => atLeast(p.convEnds, 3),
    vars: (p) => ({ count: p.convEnds }),
  },
  {
    id: 'chief-laughing-officer',
    emoji: '😂',
    priority: 1.3,
    title: 'Chief Laughing Officer',
    description: '{count} laughs logged. Best audience ever.',
    condition: (p) => atLeast(p.laughs, 5),
    vars: (p) => ({ count: p.laughs }),
  },
  {
    id: 'sticker-mafia',
    emoji: '🃏',
    priority: 1.2,
    title: 'The Sticker Mafia',
    description: '{count} stickers deployed. Words are overrated.',
    condition: (p) => atLeast(p.stickers, 3),
    vars: (p) => ({ count: p.stickers }),
  },
  {
    id: 'question-detective',
    emoji: '🔍',
    title: 'The Question Mark Detective',
    description: 'Asked {count} questions. Curiosity level: maxed out.',
    condition: (p) => atLeast(p.questions, 5),
    vars: (p) => ({ count: p.questions }),
  },
  {
    id: 'sorry-champion',
    emoji: '🙏',
    title: 'The Sorry Champion',
    description: 'Said sorry {count} times. Probably even when it wasn’t needed.',
    condition: (p) => atLeast(p.phrases.sorry, 2),
    vars: (p) => ({ count: p.phrases.sorry }),
  },
  {
    id: 'gratitude-guru',
    emoji: '💐',
    title: 'The Gratitude Guru',
    description: 'Said thanks {count} times. Manners: impeccable.',
    condition: (p) => atLeast(p.phrases.thanks, 3),
    vars: (p) => ({ count: p.phrases.thanks }),
  },
  {
    id: 'love-letter',
    emoji: '💌',
    priority: 1.1,
    title: 'The Love Letter',
    description: 'Said “love you” {count} times. Wholesome levels: critical.',
    condition: (p) => atLeast(p.phrases.love, 2),
    vars: (p) => ({ count: p.phrases.love }),
  },
  {
    id: 'certified-ok',
    emoji: '👌',
    title: 'Certified OK-er',
    description: 'Said “ok” {count} times. Efficient. Mysterious. Ok.',
    condition: (p) => atLeast(p.phrases.ok, 5),
    vars: (p) => ({ count: p.phrases.ok }),
  },
  {
    id: 'triple-texter',
    emoji: '🔁',
    title: 'The Triple Texter',
    description: 'Sent 3+ messages in a row {count} times. Why say it once?',
    condition: (p) => atLeast(p.doubleTexts, 3),
    vars: (p) => ({ count: p.doubleTexts }),
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    title: 'The Early Bird',
    description: '{count} messages between 5 and 9 AM. Coffee? Chat first.',
    condition: (p) => atLeast(p.earlyBird, 5),
    vars: (p) => ({ count: p.earlyBird }),
  },
  {
    id: 'weekend-warrior',
    emoji: '🛋️',
    title: 'The Weekend Warrior',
    description: '{pct} of their messages land on weekends. Saturday’s main character.',
    condition: (p) => {
      const s = p.weekend / Math.max(1, p.messages)
      return p.messages >= 30 && s >= 0.35 ? s : null
    },
    vars: (p) => ({ pct: share(p.weekend, p.messages) }),
  },
  {
    id: 'emoji-artist',
    emoji: '🎨',
    title: 'The Emoji Artist',
    description: 'Used {count} different emojis. A true visual storyteller.',
    condition: (p) => atLeast(p.distinctEmojis, 8),
    vars: (p) => ({ count: p.distinctEmojis }),
  },
  {
    id: 'paparazzi',
    emoji: '📸',
    title: 'The Paparazzi',
    description: 'Shared {count} photos and videos. Pics or it didn’t happen.',
    condition: (p) => atLeast(p.media, 5),
    vars: (p) => ({ count: p.media }),
  },
  {
    id: 'master-of-brevity',
    emoji: '✂️',
    title: 'The Master of Brevity',
    description: 'Just {count} words per message. Why waste letters?',
    condition: (p) => (p.textMessages >= 30 && p.avgWords > 0 ? 1 / p.avgWords : null),
    vars: (p) => ({ count: Math.round(p.avgWords * 10) / 10 }),
  },
  {
    id: 'main-character',
    emoji: '🎬',
    title: 'The Main Character',
    description: 'Sent {pct} of all messages. This chat is their show.',
    condition: (p, ctx) => {
      const s = p.messages / Math.max(1, ctx.stats.totalMessages)
      const fair = 1 / Math.max(1, ctx.stats.people.length)
      return s > fair * 1.15 ? s : null
    },
    vars: (p, ctx) => ({ pct: share(p.messages, ctx.stats.totalMessages) }),
  },
  {
    id: 'undo-button',
    emoji: '🫣',
    title: 'The Undo Button',
    description: 'Deleted {count} messages. We’ll never know…',
    condition: (p) => atLeast(p.deleted, 2),
    vars: (p) => ({ count: p.deleted }),
  },
  {
    id: 'icebreaker',
    emoji: '🧊',
    priority: 1.1,
    title: 'The Icebreaker',
    description: 'Broke the longest silence ({duration}). A true hero.',
    condition: (_p, ctx) => {
      const s = ctx.stats.longestSilence
      return s && s.brokenBy === ctx.index && s.ms >= DAY ? s.ms : null
    },
    vars: (_p, ctx) => ({ duration: ctx.stats.longestSilence?.ms ?? 0 }),
  },
  {
    id: 'office-hours-hero',
    emoji: '💼',
    title: 'Office Hours Hero',
    description: '{count} messages on weekdays, 9 to 5. Totally working, right?',
    condition: (p) => atLeast(p.workHours, 20),
    vars: (p) => ({ count: p.workHours }),
  },
  {
    id: 'walking-dictionary',
    emoji: '📚',
    title: 'The Walking Dictionary',
    description: 'Used {count} different words. Vocabulary flex.',
    condition: (p) => atLeast(p.uniqueWords, 50),
    vars: (p) => ({ count: p.uniqueWords }),
  },
  {
    id: 'caps-lock',
    emoji: '📣',
    title: 'CAPS LOCK ENTHUSIAST',
    description: '{count} MESSAGES IN ALL CAPS. WE HEAR YOU.',
    condition: (p) => atLeast(p.capsMessages, 3),
    vars: (p) => ({ count: p.capsMessages }),
  },
  {
    id: 'link-librarian',
    emoji: '🔗',
    title: 'The Link Librarian',
    description: 'Shared {count} links. Homework for everyone.',
    condition: (p) => atLeast(p.links, 3),
    vars: (p) => ({ count: p.links }),
  },
  {
    id: 'reply-master',
    emoji: '💬',
    title: 'The Reply Master',
    description: 'Quote-replied {count} times. Context is everything.',
    condition: (p) => atLeast(p.quotedReplies, 5),
    vars: (p) => ({ count: p.quotedReplies }),
  },
  {
    id: 'forwarding-department',
    emoji: '📨',
    title: 'The Forwarding Department',
    description: 'Forwarded {count} messages. The chat’s personal newsfeed.',
    condition: (p) => atLeast(p.forwarded, 3),
    vars: (p) => ({ count: p.forwarded }),
  },

  // ---- Fallbacks: everyone deserves at least one award.
  {
    id: 'loyal-regular',
    emoji: '💛',
    fallback: true,
    title: 'The Loyal Regular',
    description: '{count} messages of steady, cozy presence. The chat wouldn’t be the same.',
    condition: (p) => p.messages,
    vars: (p) => ({ count: p.messages }),
  },
  {
    id: 'quiet-legend',
    emoji: '🌿',
    fallback: true,
    title: 'The Quiet Legend',
    description: 'Speaks rarely, but each of their {count} messages is pure gold.',
    condition: (p, ctx) => 1 / Math.max(1, p.messages / Math.max(1, ctx.stats.totalMessages)),
    vars: (p) => ({ count: p.messages }),
  },
  {
    id: 'prime-time',
    emoji: '⏰',
    fallback: true,
    title: 'Prime Time Player',
    description: 'Most active around {hour}:00. Set your watches.',
    condition: (p) => p.messages,
    vars: (p) => ({ hour: p.hourly.indexOf(Math.max(...p.hourly)) }),
  },
]

export const AWARDS_BY_ID: ReadonlyMap<string, AwardDef> = new Map(AWARDS.map((a) => [a.id, a]))

export interface AwardResult {
  awardId: string
  personIndex: number
  vars: Record<string, number>
}

export const MAX_AWARDS_PER_PERSON = 3
/** Only the most active people get awards; in big groups the rest are "Others". */
export const MAX_AWARDED_PEOPLE = 8

/**
 * Hand out awards. Each award goes to the single person with the best score,
 * then people pick their strongest wins in round-robin order (so nobody hoards them),
 * max 3 per person. Anyone left empty-handed gets a fallback award.
 * In 1-on-1 chats this guarantees both people get different awards.
 */
export function assignAwards(stats: ChatStats): AwardResult[] {
  const peopleCount = Math.min(stats.people.length, MAX_AWARDED_PEOPLE)
  // Ignore near-silent members of big groups for ratio-based awards.
  const minMessages = stats.people.length > 2 ? Math.max(5, stats.totalMessages * 0.01) : 1
  const ctxFor = (index: number): AwardContext => ({
    stats,
    index,
    totalConversations: stats.totalConversations,
  })

  type Win = { award: AwardDef; person: number; strength: number }
  const winsByPerson: Win[][] = Array.from({ length: peopleCount }, () => [])

  for (const award of AWARDS) {
    if (award.fallback) continue
    const scores: { person: number; score: number }[] = []
    for (let i = 0; i < peopleCount; i++) {
      const p = stats.people[i]
      if (p.messages < minMessages) continue
      const score = award.condition(p, ctxFor(i))
      if (score !== null && Number.isFinite(score) && score > 0) scores.push({ person: i, score })
    }
    if (scores.length === 0) continue
    scores.sort((a, b) => b.score - a.score)
    const [best, second] = scores
    if (second && second.score === best.score) continue // a tie is not a win
    const ratio = second ? best.score / second.score : 1.5
    const strength = Math.min(ratio, 5) * (award.priority ?? 1)
    winsByPerson[best.person].push({ award, person: best.person, strength })
  }
  for (const wins of winsByPerson) wins.sort((a, b) => b.strength - a.strength)

  const results: AwardResult[] = []
  const counts = new Array(peopleCount).fill(0)
  for (let round = 0; round < MAX_AWARDS_PER_PERSON; round++) {
    for (let i = 0; i < peopleCount; i++) {
      const win = winsByPerson[i][round]
      if (!win) continue
      results.push({
        awardId: win.award.id,
        personIndex: i,
        vars: win.award.vars(stats.people[i], ctxFor(i)),
      })
      counts[i]++
    }
  }

  // Fallbacks for anyone without an award: each fallback used at most once while possible.
  const fallbacks = AWARDS.filter((a) => a.fallback)
  const used = new Set<string>()
  for (let i = 0; i < peopleCount; i++) {
    if (counts[i] > 0) continue
    const p = stats.people[i]
    const ranked = fallbacks
      .map((a) => ({ a, s: a.condition(p, ctxFor(i)) ?? 0 }))
      .sort((x, y) => Number(used.has(x.a.id)) - Number(used.has(y.a.id)) || y.s - x.s)
    const pick = ranked[0].a
    used.add(pick.id)
    results.push({ awardId: pick.id, personIndex: i, vars: pick.vars(p, ctxFor(i)) })
  }
  return results
}
