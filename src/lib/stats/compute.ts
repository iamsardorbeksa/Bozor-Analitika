import type { ChatMessage, Platform } from '../types'
import { PHRASE_CATEGORIES, PHRASE_REGEXES, type PhraseCategory } from './phrases'
import { isStopword } from './stopwords'
import {
  countExclamations,
  countLaughs,
  countLinks,
  extractEmojis,
  isAllCaps,
  isLaughWord,
  isQuestion,
  normalizeWord,
  stripLinks,
  tokenize,
} from './text'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
/** Replies slower than this are not counted as "replies" (people were asleep / busy). */
export const REPLY_WINDOW_MS = 12 * HOUR
/** A message after this much silence starts a new conversation. */
export const CONVERSATION_GAP_MS = 6 * HOUR
/** Minimum run length that counts as a "double text". */
export const DOUBLE_TEXT_RUN = 3

export interface Counted {
  key: string
  count: number
}

export interface PersonStats {
  name: string
  messages: number
  textMessages: number
  words: number
  chars: number
  avgWords: number
  media: number
  voice: number
  stickers: number
  deleted: number
  questions: number
  exclamations: number
  capsMessages: number
  links: number
  emojiCount: number
  distinctEmojis: number
  laughs: number
  lateNight: number
  earlyBird: number
  workHours: number
  weekend: number
  doubleTexts: number
  convStarts: number
  convEnds: number
  /** Median reply time in ms, null when there are not enough replies. */
  medianReplyMs: number | null
  replyCount: number
  /** Longest time this person took to answer someone else. */
  maxGhostMs: number
  uniqueWords: number
  quotedReplies: number
  forwarded: number
  phrases: Record<PhraseCategory, number>
  topWords: Counted[]
  topEmojis: Counted[]
  topStickerEmoji: string | null
  hourly: number[]
}

export interface ChatStats {
  platform: Platform
  chatName?: string
  isGroup: boolean
  start: number
  end: number
  totalMessages: number
  totalWords: number
  totalMedia: number
  totalLaughs: number
  totalEmojis: number
  /** Number of distinct calendar days with at least one message. */
  daysActive: number
  /** Calendar days between the first and last message, inclusive. */
  daysSpan: number
  busiestDay: { day: number; count: number } | null
  /** Messages per hour of day (0-23). */
  hourly: number[]
  /** Messages per weekday, Monday = 0. */
  weekday: number[]
  peakHour: number
  peakWeekday: number
  longestSilence: {
    ms: number
    start: number
    end: number
    brokenBy: number
    leftBy: number
  } | null
  longestStreak: { days: number; startDay: number; endDay: number }
  totalConversations: number
  topWords: Counted[]
  topEmojis: Counted[]
  /** Sorted by message count, most active first. */
  people: PersonStats[]
}

/** Local calendar day number (days since epoch for the local date). DST-safe. */
export function dayNumber(ts: number): number {
  const d = new Date(ts)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY)
}

/** Inverse of dayNumber: midnight (local) of that day as a timestamp. */
export function dayToTimestamp(day: number): number {
  const d = new Date(day * DAY)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime()
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = Float64Array.from(values).sort()
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Longest run of consecutive day numbers. Input does not need to be sorted or unique. */
export function longestStreak(days: Iterable<number>): {
  days: number
  startDay: number
  endDay: number
} {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 0) return { days: 0, startDay: 0, endDay: 0 }
  let best = { days: 1, startDay: sorted[0], endDay: sorted[0] }
  let runStart = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) runStart = sorted[i]
    const len = sorted[i] - runStart + 1
    if (len > best.days) best = { days: len, startDay: runStart, endDay: sorted[i] }
  }
  return best
}

function topN(map: Map<string, number>, n: number): Counted[] {
  // Partial selection is overkill here; maps are at most a few hundred thousand entries.
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

function argMax(arr: number[]): number {
  let best = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i
  return best
}

interface Acc {
  p: PersonStats
  words: Map<string, number>
  emojis: Map<string, number>
  stickerEmojis: Map<string, number>
  replyTimes: number[]
}

function newAcc(name: string): Acc {
  return {
    p: {
      name,
      messages: 0,
      textMessages: 0,
      words: 0,
      chars: 0,
      avgWords: 0,
      media: 0,
      voice: 0,
      stickers: 0,
      deleted: 0,
      questions: 0,
      exclamations: 0,
      capsMessages: 0,
      links: 0,
      emojiCount: 0,
      distinctEmojis: 0,
      laughs: 0,
      lateNight: 0,
      earlyBird: 0,
      workHours: 0,
      weekend: 0,
      doubleTexts: 0,
      convStarts: 0,
      convEnds: 0,
      medianReplyMs: null,
      replyCount: 0,
      maxGhostMs: 0,
      uniqueWords: 0,
      quotedReplies: 0,
      forwarded: 0,
      phrases: Object.fromEntries(PHRASE_CATEGORIES.map((c) => [c, 0])) as Record<
        PhraseCategory,
        number
      >,
      topWords: [],
      topEmojis: [],
      topStickerEmoji: null,
      hourly: new Array(24).fill(0),
    },
    words: new Map(),
    emojis: new Map(),
    stickerEmojis: new Map(),
    replyTimes: [],
  }
}

export interface ComputeOptions {
  platform: Platform
  chatName?: string
  /** How many top words to keep per person (extra so the UI can filter out names). */
  topWordsPerPerson?: number
  onProgress?: (fraction: number) => void
}

/** Compute every stat in a single pass over the (time-sorted) messages. */
export function computeStats(messages: ChatMessage[], options: ComputeOptions): ChatStats {
  const accs: Acc[] = []
  const index = new Map<string, number>()
  const hourly = new Array(24).fill(0)
  const weekday = new Array(7).fill(0)
  const dayCounts = new Map<number, number>()
  const globalWords = new Map<string, number>()
  const globalEmojis = new Map<string, number>()
  let totalWords = 0
  let longestSilence: ChatStats['longestSilence'] = null
  let totalConversations = 0

  let prev: ChatMessage | null = null
  let prevIdx = -1
  let runLength = 0

  // Cache date components per local day so we don't build a Date for every message.
  let dayStart = Infinity
  let dayEnd = -Infinity
  let curDay = 0
  let curWeekday = 0

  const total = messages.length
  for (let i = 0; i < total; i++) {
    if (options.onProgress && i % 25000 === 0) options.onProgress(i / total)
    const m = messages[i]
    let idx = index.get(m.sender)
    if (idx === undefined) {
      idx = accs.length
      index.set(m.sender, idx)
      accs.push(newAcc(m.sender))
    }
    const acc = accs[idx]
    const p = acc.p
    p.messages++

    // ---- time buckets
    if (m.timestamp < dayStart || m.timestamp >= dayEnd) {
      const d = new Date(m.timestamp)
      dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
      curDay = dayNumber(m.timestamp)
      curWeekday = (d.getDay() + 6) % 7
    }
    const hour = new Date(m.timestamp).getHours()
    hourly[hour]++
    p.hourly[hour]++
    weekday[curWeekday]++
    dayCounts.set(curDay, (dayCounts.get(curDay) ?? 0) + 1)
    if (hour < 5) p.lateNight++
    else if (hour < 9) p.earlyBird++
    if (curWeekday >= 5) p.weekend++
    else if (hour >= 9 && hour < 17) p.workHours++

    // ---- content
    switch (m.kind) {
      case 'text': {
        p.textMessages++
        const text = m.text
        p.chars += text.length
        const links = countLinks(text)
        p.links += links
        const tokens = tokenize(links ? stripLinks(text) : text)
        p.words += tokens.length
        totalWords += tokens.length
        const lower: string[] = new Array(tokens.length)
        for (let t = 0; t < tokens.length; t++) {
          const w = normalizeWord(tokens[t])
          lower[t] = w
          if (isStopword(w) || /^\p{N}+$/u.test(w) || isLaughWord(w)) continue
          // Very short words are noise in alphabetic scripts; CJK words can be 1 char.
          if (w.length < 3 && /^[\p{Script=Latin}\p{Script=Cyrillic}\p{N}']+$/u.test(w)) continue
          acc.words.set(w, (acc.words.get(w) ?? 0) + 1)
        }
        const emojis = extractEmojis(text)
        if (emojis.length) {
          p.emojiCount += emojis.length
          for (const e of emojis) {
            acc.emojis.set(e, (acc.emojis.get(e) ?? 0) + 1)
          }
        }
        p.laughs += countLaughs(lower, text, emojis)
        if (isQuestion(text)) p.questions++
        p.exclamations += countExclamations(text)
        if (isAllCaps(text)) p.capsMessages++
        if (tokens.length) {
          const lowerText = text.toLowerCase().replace(/[’ʻʼ]/g, "'")
          for (const cat of PHRASE_CATEGORIES) {
            const re = PHRASE_REGEXES[cat]
            re.lastIndex = 0
            let hits = 0
            while (re.exec(lowerText)) hits++
            if (hits) p.phrases[cat] += hits
          }
        }
        break
      }
      case 'media':
        p.media++
        break
      case 'voice':
        p.voice++
        break
      case 'sticker':
        p.stickers++
        if (m.stickerEmoji) {
          acc.stickerEmojis.set(m.stickerEmoji, (acc.stickerEmojis.get(m.stickerEmoji) ?? 0) + 1)
        }
        break
      case 'deleted':
        p.deleted++
        break
    }
    if (m.replyTo !== undefined) p.quotedReplies++
    if (m.forwarded) p.forwarded++

    // ---- relations to the previous message
    if (prev) {
      const gap = m.timestamp - prev.timestamp
      if (!longestSilence || gap > longestSilence.ms) {
        longestSilence = {
          ms: gap,
          start: prev.timestamp,
          end: m.timestamp,
          brokenBy: idx,
          leftBy: prevIdx,
        }
      }
      if (prevIdx !== idx) {
        if (gap <= REPLY_WINDOW_MS) acc.replyTimes.push(gap)
        if (gap > p.maxGhostMs) p.maxGhostMs = gap
        if (runLength >= DOUBLE_TEXT_RUN) accs[prevIdx].p.doubleTexts++
        runLength = 1
      } else {
        runLength++
      }
      if (gap >= CONVERSATION_GAP_MS) {
        p.convStarts++
        accs[prevIdx].p.convEnds++
        totalConversations++
      }
    } else {
      p.convStarts++
      totalConversations++
      runLength = 1
    }
    prev = m
    prevIdx = idx
  }
  if (prev && runLength >= DOUBLE_TEXT_RUN) accs[prevIdx].p.doubleTexts++

  // ---- finalize per person
  const perPersonWords = options.topWordsPerPerson ?? 30
  for (const acc of accs) {
    const p = acc.p
    p.avgWords = p.textMessages ? p.words / p.textMessages : 0
    p.medianReplyMs = acc.replyTimes.length >= 3 ? median(acc.replyTimes) : null
    p.replyCount = acc.replyTimes.length
    p.uniqueWords = acc.words.size
    p.distinctEmojis = acc.emojis.size
    p.topWords = topN(acc.words, perPersonWords)
    p.topEmojis = topN(acc.emojis, 10)
    p.topStickerEmoji = acc.stickerEmojis.size ? topN(acc.stickerEmojis, 1)[0].key : null
    for (const [w, c] of acc.words) globalWords.set(w, (globalWords.get(w) ?? 0) + c)
    for (const [e, c] of acc.emojis) globalEmojis.set(e, (globalEmojis.get(e) ?? 0) + c)
  }

  let busiestDay: ChatStats['busiestDay'] = null
  for (const [day, count] of dayCounts) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { day, count }
  }

  const people = accs.map((a) => a.p)
  // Sort by activity, remapping the silence indices.
  const order = people.map((_, i) => i).sort((a, b) => people[b].messages - people[a].messages)
  const remap = new Map(order.map((oldIdx, newIdx) => [oldIdx, newIdx]))
  if (longestSilence) {
    longestSilence.brokenBy = remap.get(longestSilence.brokenBy) ?? -1
    longestSilence.leftBy = remap.get(longestSilence.leftBy) ?? -1
  }
  const sortedPeople = order.map((i) => people[i])

  const first = messages[0]?.timestamp ?? 0
  const last = messages[messages.length - 1]?.timestamp ?? 0
  options.onProgress?.(1)

  return {
    platform: options.platform,
    chatName: options.chatName,
    isGroup: sortedPeople.length > 2,
    start: first,
    end: last,
    totalMessages: messages.length,
    totalWords,
    totalMedia: people.reduce((s, p) => s + p.media + p.voice + p.stickers, 0),
    totalLaughs: people.reduce((s, p) => s + p.laughs, 0),
    totalEmojis: people.reduce((s, p) => s + p.emojiCount, 0),
    daysActive: dayCounts.size,
    daysSpan: messages.length ? dayNumber(last) - dayNumber(first) + 1 : 0,
    busiestDay,
    hourly,
    weekday,
    peakHour: argMax(hourly),
    peakWeekday: argMax(weekday),
    longestSilence,
    longestStreak: longestStreak(dayCounts.keys()),
    totalConversations,
    topWords: topN(globalWords, 30),
    topEmojis: topN(globalEmojis, 10),
    people: sortedPeople,
  }
}

export type TimeRange = 'all' | 'year' | '6months' | '30days'

/** Filter messages to a range ending at the chat's last message. */
export function filterByRange(messages: ChatMessage[], range: TimeRange): ChatMessage[] {
  if (range === 'all' || messages.length === 0) return messages
  const lastTs = messages[messages.length - 1].timestamp
  const end = new Date(lastTs)
  let from: number
  if (range === 'year')
    from = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()).getTime()
  else if (range === '6months')
    from = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate()).getTime()
  else from = lastTs - 30 * DAY
  // Binary search for the first message >= from (messages are sorted).
  let lo = 0
  let hi = messages.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (messages[mid].timestamp < from) lo = mid + 1
    else hi = mid
  }
  return messages.slice(lo)
}
