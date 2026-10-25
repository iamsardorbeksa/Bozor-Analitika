import { describe, expect, it } from 'vitest'
import { assignAwards, AWARDS } from '../src/lib/awards'
import {
  computeStats,
  dayNumber,
  filterByRange,
  longestStreak,
  median,
  HOUR,
  DAY,
} from '../src/lib/stats/compute'
import { countLaughs, extractEmojis, isLaughWord, tokenize } from '../src/lib/stats/text'
import type { ChatMessage, MessageKind } from '../src/lib/types'

const T0 = new Date(2024, 0, 1, 10, 0, 0).getTime()
const MIN = 60_000

function msg(
  offsetMs: number,
  sender: string,
  text = 'hi',
  kind: MessageKind = 'text',
): ChatMessage {
  return { timestamp: T0 + offsetMs, sender, text, kind }
}
const stats = (messages: ChatMessage[]) => computeStats(messages, { platform: 'whatsapp' })
const person = (s: ReturnType<typeof stats>, name: string) => s.people.find((p) => p.name === name)!

describe('helpers', () => {
  it('median', () => {
    expect(median([])).toBeNull()
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('longest streak of consecutive days', () => {
    expect(longestStreak([])).toEqual({ days: 0, startDay: 0, endDay: 0 })
    expect(longestStreak([10, 11, 12, 20, 21, 5])).toEqual({ days: 3, startDay: 10, endDay: 12 })
    expect(longestStreak([3, 3, 4]).days).toBe(2)
  })
})

describe('emoji counting', () => {
  it('handles skin tones, ZWJ sequences, flags and variation selectors', () => {
    expect(extractEmojis('hello')).toEqual([])
    expect(extractEmojis('👍🏽👍')).toEqual(['👍🏽', '👍'])
    expect(extractEmojis('👨\u200D👩\u200D👧\u200D👦 family')).toEqual([
      '👨\u200D👩\u200D👧\u200D👦',
    ])
    expect(extractEmojis('🏳\uFE0F\u200D🌈')).toHaveLength(1)
    expect(extractEmojis('🇺🇿🇷🇺')).toEqual(['🇺🇿', '🇷🇺'])
    // ❤ and ❤\uFE0F count as the same emoji
    expect(extractEmojis('❤\uFE0F❤')).toEqual(['❤', '❤'])
    // text symbols are not emojis
    expect(extractEmojis('© 2024 ™')).toEqual([])
    expect(extractEmojis('🧑🏻\u200D💻')).toEqual(['🧑🏻\u200D💻'])
  })

  it('counts top emojis per person and overall', () => {
    const s = stats([msg(0, 'A', '😂😂 lol'), msg(MIN, 'B', '❤\uFE0F 😂'), msg(2 * MIN, 'A', '🔥')])
    expect(s.topEmojis[0]).toEqual({ key: '😂', count: 3 })
    expect(person(s, 'A').topEmojis[0]).toEqual({ key: '😂', count: 2 })
    expect(person(s, 'A').distinctEmojis).toBe(2)
    expect(s.totalEmojis).toBe(5)
  })
})

describe('tokenizer & laughter', () => {
  it('tokenizes Latin, Cyrillic, Uzbek apostrophes and CJK', () => {
    expect(tokenize("Don't stop, o'zbek tili!")).toEqual(["Don't", 'stop', "o'zbek", 'tili'])
    expect(tokenize('Привет, как дела?')).toEqual(['Привет', 'как', 'дела'])
    expect(tokenize('我喜欢你').length).toBeGreaterThan(1)
  })

  it('detects laughter in many languages', () => {
    for (const w of [
      'haha',
      'hahaha',
      'ahahah',
      'jajaja',
      'kkkk',
      'ахах',
      'хахаха',
      'lol',
      'lmao',
      'xaxa',
      'hehe',
    ]) {
      expect(isLaughWord(w), w).toBe(true)
    }
    for (const w of ['have', 'hello', 'kak', 'ха', 'lola', 'aha'])
      expect(isLaughWord(w), w).toBe(false)
    expect(countLaughs(['ok'], 'ok)))', [])).toBe(1)
    expect(countLaughs(['haha'], 'haha 😂🤣', ['😂', '🤣'])).toBe(3)
  })
})

describe('new-language support', () => {
  it('counts laughs and sweet words in Chinese, Arabic, French, German and Portuguese', () => {
    const s = stats([
      msg(0, 'A', '哈哈哈哈 太好笑了，谢谢你！我爱你'),
      msg(MIN, 'B', 'ههههه شكراً يا صديقي، أحبك'),
      msg(2 * MIN, 'C', 'mdr merci beaucoup'),
      msg(3 * MIN, 'D', 'rsrsrs valeu, beleza'),
      msg(4 * MIN, 'E', 'Vielen Dank, alles klar'),
    ])
    expect(person(s, 'A')).toMatchObject({ laughs: 1, phrases: { thanks: 1, love: 1 } })
    expect(person(s, 'B')).toMatchObject({ laughs: 1, phrases: { thanks: 1, love: 1 } })
    expect(person(s, 'C')).toMatchObject({ laughs: 1, phrases: { thanks: 1 } })
    expect(person(s, 'D')).toMatchObject({ laughs: 1, phrases: { thanks: 1, ok: 1 } })
    expect(person(s, 'E').phrases).toMatchObject({ thanks: 1, ok: 1 })
  })

  it('keeps Chinese/Arabic filler and laughter out of top words', () => {
    const s = stats([
      msg(0, 'A', '我们今天去吃火锅吧，火锅真的太好吃了 哈哈哈'),
      msg(MIN, 'B', 'في البيت مع القهوة، القهوة أحلى'),
    ])
    const words = s.topWords.map((w) => w.key)
    expect(words).toContain('火锅')
    expect(words).toContain('القهوة')
    for (const filler of ['我们', '的', '哈哈哈', 'في', 'مع']) expect(words).not.toContain(filler)
  })
})

describe('computeStats', () => {
  it('measures reply time only when the sender switches, ignoring gaps over 12h', () => {
    const s = stats([
      msg(0, 'A'),
      msg(2 * MIN, 'B'), // B replies in 2 min
      msg(3 * MIN, 'B'), // same sender, not a reply
      msg(13 * MIN, 'A'), // A replies in 10 min
      msg(20 * MIN, 'B'), // B 7 min
      msg(20 * MIN + 13 * HOUR, 'A'), // 13h: not counted as a reply
      msg(20 * MIN + 13 * HOUR + 4 * MIN, 'B'), // B 4 min
      msg(20 * MIN + 13 * HOUR + 10 * MIN, 'A'), // A 6 min
      msg(20 * MIN + 13 * HOUR + 30 * MIN, 'A'),
      msg(20 * MIN + 13 * HOUR + 31 * MIN, 'B'), // B 1 min
      msg(20 * MIN + 13 * HOUR + 40 * MIN, 'A'), // A 9 min
    ])
    expect(person(s, 'B').medianReplyMs).toBe(3 * MIN) // [2,7,4,1] → 3
    expect(person(s, 'A').medianReplyMs).toBe(9 * MIN) // [10,6,9] → 9
    expect(person(s, 'A').replyCount).toBe(3)
    expect(person(s, 'A').maxGhostMs).toBe(13 * HOUR)
  })

  it('finds the longest silence and who broke it', () => {
    const s = stats([msg(0, 'A'), msg(MIN, 'B'), msg(3 * DAY, 'B'), msg(3 * DAY + MIN, 'A')])
    expect(s.longestSilence?.ms).toBe(3 * DAY - MIN)
    expect(s.people[s.longestSilence!.brokenBy].name).toBe('B')
    expect(s.people[s.longestSilence!.leftBy].name).toBe('B')
  })

  it('counts streaks, active days, busiest day and conversation starts', () => {
    const s = stats([
      msg(0, 'A'),
      msg(MIN, 'B'),
      msg(2 * MIN, 'B'),
      msg(DAY, 'B'), // new day, starts a conversation (gap ≥ 6h)
      msg(2 * DAY, 'A'),
      msg(2 * DAY + 7 * HOUR, 'A'), // 7h gap → new conversation, same day
      msg(10 * DAY, 'B'),
    ])
    expect(s.daysActive).toBe(4)
    expect(s.daysSpan).toBe(11)
    expect(s.longestStreak.days).toBe(3)
    expect(s.busiestDay).toEqual({ day: dayNumber(T0), count: 3 })
    expect(s.totalConversations).toBe(5)
    expect(person(s, 'A').convStarts).toBe(3) // first message + day 2 + 7h later
    expect(person(s, 'B').convStarts).toBe(2)
    expect(person(s, 'B').convEnds).toBe(2) // last word before 6h+ silences
  })

  it('counts double texts (3+ in a row), questions, late night, media kinds and phrases', () => {
    const late = new Date(2024, 0, 2, 2, 30).getTime() - T0
    const s = stats([
      msg(0, 'A', 'are you there?'),
      msg(MIN, 'A', 'hello??'),
      msg(2 * MIN, 'A', 'sorry, thank you! love you'),
      msg(3 * MIN, 'B', 'ok'),
      msg(4 * MIN, 'B', '', 'voice'),
      msg(5 * MIN, 'B', '', 'sticker'),
      msg(6 * MIN, 'B', '', 'media'),
      msg(7 * MIN, 'A', '', 'deleted'),
      msg(late, 'A', 'cant sleep'),
    ])
    const a = person(s, 'A')
    const b = person(s, 'B')
    expect(a.doubleTexts).toBe(1)
    expect(b.doubleTexts).toBe(1)
    expect(a.questions).toBe(2)
    expect(a.lateNight).toBe(1)
    expect(a.phrases).toMatchObject({ sorry: 1, thanks: 1, love: 1 })
    expect(b.phrases.ok).toBe(1)
    expect([b.voice, b.stickers, b.media, a.deleted]).toEqual([1, 1, 1, 1])
    expect(s.totalMedia).toBe(3)
  })

  it('computes top words without stopwords and peak hour/weekday', () => {
    const s = stats([
      msg(0, 'A', 'pizza tonight? the pizza place is the best'),
      msg(MIN, 'B', 'pizza again lol'),
      msg(2 * MIN, 'B', 'пицца это хорошо, пицца!'),
    ])
    expect(s.topWords[0]).toEqual({ key: 'pizza', count: 3 })
    expect(s.topWords.map((w) => w.key)).not.toContain('the')
    expect(person(s, 'B').topWords[0]).toEqual({ key: 'пицца', count: 2 })
    expect(s.peakHour).toBe(10)
    expect(s.peakWeekday).toBe(0) // 2024-01-01 is a Monday
  })

  it('filters by time range relative to the last message', () => {
    const msgs = [msg(0, 'A'), msg(200 * DAY, 'B'), msg(380 * DAY, 'A'), msg(400 * DAY, 'B')]
    expect(filterByRange(msgs, 'all')).toHaveLength(4)
    expect(filterByRange(msgs, '30days')).toHaveLength(2)
    expect(filterByRange(msgs, '6months')).toHaveLength(2)
    expect(filterByRange(msgs, 'year')).toHaveLength(3)
  })
})

describe('awards', () => {
  it('has at least 25 awards with English texts', () => {
    expect(AWARDS.length).toBeGreaterThanOrEqual(25)
    const ids = new Set(AWARDS.map((a) => a.id))
    expect(ids.size).toBe(AWARDS.length)
    for (const a of AWARDS) {
      expect(a.title, a.id).toBeTruthy()
      expect(a.description, a.id).toBeTruthy()
    }
  })

  it('gives each person in a 1-on-1 chat 1-3 different awards', () => {
    const messages: ChatMessage[] = []
    let t = 0
    for (let i = 0; i < 400; i++) {
      t += (i % 7) * 3 * MIN + MIN
      const sender = i % 3 === 0 ? 'B' : 'A'
      const text = sender === 'A' ? 'haha that is so funny 😂 right?' : 'ok'
      messages.push(msg(t, sender, text, i % 25 === 0 && sender === 'B' ? 'voice' : 'text'))
    }
    const s = stats(messages)
    const awards = assignAwards(s)
    const forA = awards.filter((a) => a.personIndex === 0)
    const forB = awards.filter((a) => a.personIndex === 1)
    expect(forA.length).toBeGreaterThanOrEqual(1)
    expect(forA.length).toBeLessThanOrEqual(3)
    expect(forB.length).toBeGreaterThanOrEqual(1)
    expect(forB.length).toBeLessThanOrEqual(3)
    const ids = awards.map((a) => a.awardId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives everyone in a group at least one award', () => {
    const messages: ChatMessage[] = []
    const names = ['A', 'B', 'C', 'D', 'E', 'F']
    for (let i = 0; i < 600; i++)
      messages.push(msg(i * 5 * MIN, names[(i * i) % names.length], 'hello there friend'))
    const s = stats(messages)
    const awards = assignAwards(s)
    for (let i = 0; i < s.people.length; i++) {
      expect(
        awards.some((a) => a.personIndex === i),
        s.people[i].name,
      ).toBe(true)
    }
  })
})
