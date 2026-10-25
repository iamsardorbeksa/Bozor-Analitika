/**
 * Built-in demo chats. Everything here is fictional (people, pets, sourdough starters).
 * Generated deterministically so the demo looks the same every time, then fed through
 * the real parsers so the demo exercises exactly the same pipeline as a real upload.
 */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rand = () => number
const pick = <T>(r: Rand, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]
const between = (r: Rand, a: number, b: number) => a + r() * (b - a)
const pad = (n: number) => String(n).padStart(2, '0')
const MIN = 60_000
const HOUR = 60 * MIN

/* ------------------------------------------------------------------ WhatsApp 1-on-1 */

const MAYA = [
  'omg Pickle just knocked my coffee off the table AGAIN 😭',
  'hahaha no way',
  'are you awake?',
  'I have a theory about the finale and you’re not going to like it',
  'ok hear me out: tacos tonight 🌮',
  'hahahaha stop 😂😂',
  'LEO',
  'did you listen to my voice note??',
  'I’m outside!!',
  '😂😂😂',
  'best day of my life (I found 5 euros in my coat) 💸',
  'can’t sleep. thinking about penguins 🐧',
  'why do we call it a building if it’s already built?',
  'love you, you absolute gremlin ❤\uFE0F',
  'ahahah',
  'what are you doing on saturday?',
  '✨ new hobby unlocked: pottery ✨',
  'Doughlores is THRIVING 🍞',
  'I bought another plant. her name is Fernanda 🌿',
  'stoooop 🤣',
  'wait what',
  'ok but why is the moon so big tonight 🌕',
  'tell me everything',
  'lol',
  'PICKLE ATE A WHOLE SOCK',
  'is it weird that I miss the rain?',
  'pizza or sushi? (the answer is pizza) 🍕',
  'hahaha I’m crying 😭😭',
  'you won’t believe what my neighbour just did',
  'karaoke friday??? 🎤',
] as const

const LEO = [
  'Good morning! Quick update: I made coffee without burning anything. Growth.',
  'ok',
  'Sorry, just saw this, I was in a meeting that could have been an email.',
  'Thanks for the recipe, it actually worked this time!',
  'I’ve been thinking about it and honestly the detective was right all along, because if you rewatch the first season, the clues were all there and nobody listened to her.',
  'sorry!! fell asleep',
  'Pickle is a menace and I respect him.',
  'Leaving now, see you in 20.',
  'ok ok',
  'haha fair',
  'Did you remember to feed Doughlores?',
  'Sounds good',
  'Thank you ❤\uFE0F',
  'Sorry about yesterday, I was a grumpy potato.',
  'Fun fact: octopuses have three hearts. Just like me when I see tacos.',
  'On my way!',
  'Can we talk about how the bus was 40 minutes late again?',
  'love you too',
  'Pizza. Obviously pizza.',
  'I finished the book! The ending was wild, I need to talk about it.',
  'thanks!',
  'ok, deal',
  'Honestly, Fernanda is the best-looking plant in the apartment.',
  'Running late, sorry!',
  'What time works for you?',
  'I made soup. It’s mostly carrots but it’s soup.',
] as const

function waTimestamp(ts: number): string {
  const d = new Date(ts)
  return `[${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`
}

export function generateWhatsAppDemo(): string {
  const r = rng(2026)
  const entries: { ts: number; text: string }[] = []
  const add = (ts: number, sender: string, body: string) =>
    entries.push({ ts, text: `${waTimestamp(ts)} ${sender}: ${body}` })
  add(
    new Date(2026, 0, 1, 0, 1).getTime(),
    'Maya',
    '\u200EMessages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.',
  )
  const start = new Date(2026, 0, 1)
  const hikingStart = new Date(2026, 5, 10).getTime()
  const hikingEnd = new Date(2026, 5, 21).getTime()
  for (let day = 0; day < 292; day++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day)
    if (date.getTime() >= hikingStart - 12 * HOUR && date.getTime() < hikingEnd) continue
    if (r() < 0.12) continue // quiet days
    const sessions = r() < 0.35 ? 2 : 1
    for (let s = 0; s < sessions; s++) {
      // Maya loves late nights, Leo opens the day.
      const mayaStarts = r() < 0.62
      const hour = mayaStarts ? pick(r, [21, 22, 23, 0, 1, 13, 18]) : pick(r, [7, 8, 8, 9, 12, 17])
      const dayOffset = mayaStarts && hour < 5 ? 1 : 0
      let t = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + dayOffset,
        hour,
        Math.floor(r() * 60),
      ).getTime()
      let sender: 'Maya' | 'Leo' = mayaStarts ? 'Maya' : 'Leo'
      const length = Math.floor(between(r, 4, 26))
      for (let i = 0; i < length; i++) {
        const isMaya = sender === 'Maya'
        const roll = r()
        let body: string
        if (isMaya && roll < 0.06) body = '\u200Eaudio omitted'
        else if (isMaya && roll < 0.1) body = '\u200Esticker omitted'
        else if (roll < 0.14) body = '\u200Eimage omitted'
        else if (!isMaya && roll < 0.155) body = 'This message was deleted'
        else body = pick(r, isMaya ? MAYA : LEO)
        if (body.startsWith('I’ve been thinking') && r() < 0.5) {
          body +=
            '\nAlso, the dog in episode 3 is clearly the real villain. I will not be taking questions.'
        }
        add(t, sender, body)
        // Maya double-texts a lot; Leo rarely.
        const keepGoing = isMaya ? r() < 0.45 : r() < 0.15
        if (!keepGoing) sender = isMaya ? 'Leo' : 'Maya'
        const delay =
          sender === 'Maya'
            ? between(r, 0.3, keepGoing ? 1 : 3) * MIN
            : between(r, 1, keepGoing ? 4 : r() < 0.2 ? 90 : 18) * MIN
        t += Math.floor(delay)
      }
    }
  }
  // The great silence (Leo's hiking trip) is broken by Maya.
  add(hikingEnd + 9 * HOUR, 'Maya', 'ARE YOU ALIVE?? 🏔\uFE0F')
  add(
    hikingEnd + 9 * HOUR + 40 * MIN,
    'Leo',
    'Alive! No signal for 10 days. I saw a goat. Many goats actually.',
  )
  entries.sort((a, b) => a.ts - b.ts)
  return entries.map((e) => e.text).join('\n')
}

/* ------------------------------------------------------------------ Telegram group */

interface Member {
  name: string
  id: string
  weight: number
  lines: readonly string[]
  voice: number
  sticker: number
  photo: number
  forward: number
  nightOwl?: boolean
}

const MEMBERS: Member[] = [
  {
    name: 'Aziza',
    id: 'user1001',
    weight: 1.3,
    voice: 0.01,
    sticker: 0.03,
    photo: 0.04,
    forward: 0,
    lines: [
      'Who’s in for Saturday’s hike? 🥾',
      'Reminder: we meet at 8:00 at the metro!',
      'Did everyone bring water this time?',
      'Salom hammaga! ☀\uFE0F',
      'Vote: mountains or lake?',
      'Who has the first aid kit?',
      'Bekzod, are you coming or not?',
      'Okay team, plan for this weekend: early start, picnic at the top, home by 6',
      'Thanks everyone, what a day!',
      'Who wants to organise the next one?',
      'Is the trail open after the rain?',
      'rahmat for the photos ❤\uFE0F',
    ],
  },
  {
    name: 'Bekzod',
    id: 'user1002',
    weight: 1,
    voice: 0.32,
    sticker: 0.04,
    photo: 0.03,
    forward: 0,
    lines: [
      'xaxaxa',
      'I’ll explain in a voice note',
      'xaxaxa Daniel no',
      'ok I’m in',
      'who ate my samsa',
      'ахахах',
      'my legs still hurt from last week',
      'can we stop for plov after?',
      'xaxa this group is too much',
      'I’m bringing the speaker 🔊',
    ],
  },
  {
    name: 'Kamila',
    id: 'user1003',
    weight: 1,
    voice: 0.02,
    sticker: 0.38,
    photo: 0.05,
    forward: 0,
    lines: [
      'same',
      '😂',
      'mood',
      'I’m bringing snacks 🍪',
      'haha yes',
      'count me in',
      'hahaha',
      'omg',
    ],
  },
  {
    name: 'Daniel',
    id: 'user1004',
    weight: 0.8,
    voice: 0,
    sticker: 0.01,
    photo: 0.05,
    forward: 0.22,
    lines: [
      'https://example.com/trail-guide',
      'Interesting: apparently this trail used to be an old trade route, there are still stone markers if you look closely near the second bridge.',
      'Actually, technically, the summit is 2,804 meters.',
      'Weather looks good for Saturday, 18°C and sunny. https://example.com/forecast',
      'Fun fact: walnut trees can live for 200 years.',
      'I made a spreadsheet for the gear list, it has conditional formatting and everything.',
      'Sorry, I’ll be 10 minutes late.',
    ],
  },
  {
    name: 'Sofia',
    id: 'user1005',
    weight: 1.1,
    voice: 0.02,
    sticker: 0.06,
    photo: 0.18,
    forward: 0,
    lines: [
      'YESSS!!! 🎉🎉',
      'I love this group so much ❤\uFE0F❤\uFE0F',
      'best day ever!!!',
      'photos coming!! 📸',
      'omg the view!!! 😍',
      'WE DID IT!!! 🏔\uFE0F🔥',
      'Bekzod your voice notes 😂😂😂',
      'can’t wait!!! ✨',
      'thank you all!! 💛',
    ],
  },
  {
    name: 'Timur',
    id: 'user1006',
    weight: 0.6,
    voice: 0.03,
    sticker: 0.02,
    photo: 0.02,
    forward: 0,
    nightOwl: true,
    lines: [
      'ok',
      'just woke up',
      'who’s still awake?',
      'can’t sleep, planning the next trip',
      'sorry, late',
      'ахахах',
      'I found a new route, 4 hours, waterfall at the end',
      'ok',
      'see you there',
    ],
  },
]

const STICKERS = ['😂', '🥾', '🐸', '👍', '😴', '🔥', '❤\uFE0F']

export function generateTelegramDemo(): string {
  const r = rng(77)
  const messages: object[] = []
  let id = 1
  const service = (ts: number, actor: string, action: string, extra: object = {}) => {
    messages.push({
      id: id++,
      type: 'service',
      ...dates(ts),
      actor,
      actor_id: 'user1001',
      action,
      ...extra,
      text: '',
    })
  }
  const dates = (ts: number) => {
    const d = new Date(ts)
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      date_unixtime: String(Math.floor(ts / 1000)),
    }
  }
  const start = new Date(2025, 10, 3).getTime()
  service(start, 'Aziza', 'create_group', {
    title: 'Weekend Hikers 🥾',
    members: MEMBERS.map((m) => m.name),
  })
  const totalWeight = MEMBERS.reduce((s, m) => s + m.weight, 0)
  const chooseMember = (night: boolean) => {
    if (night && r() < 0.5) return MEMBERS[5]
    let x = r() * totalWeight
    for (const m of MEMBERS) {
      x -= m.weight
      if (x <= 0) return m
    }
    return MEMBERS[0]
  }
  for (let day = 0; day < 350; day++) {
    if (r() < 0.25) continue
    const date = new Date(start + day * 24 * HOUR)
    const weekend = date.getDay() === 0 || date.getDay() === 6 || date.getDay() === 5
    const sessions = weekend ? 2 : 1
    for (let s = 0; s < sessions; s++) {
      const hour = pick(r, [9, 12, 19, 20, 21, 22, 23, 1])
      let t = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        Math.floor(r() * 60),
      ).getTime()
      const len = Math.floor(between(r, 3, weekend ? 30 : 14))
      // Aziza usually opens the conversation
      let member = r() < 0.55 ? MEMBERS[0] : chooseMember(hour < 4)
      for (let i = 0; i < len; i++) {
        const base = {
          id: id++,
          type: 'message',
          ...dates(t),
          from: member.name,
          from_id: member.id,
        }
        const roll = r()
        const reply =
          id > 5 && r() < 0.12 ? { reply_to_message_id: id - 1 - Math.floor(r() * 3) } : {}
        if (roll < member.voice) {
          messages.push({
            ...base,
            ...reply,
            media_type: r() < 0.85 ? 'voice_message' : 'video_message',
            duration_seconds: Math.floor(between(r, 5, 140)),
            file: '(File not included. Change data exporting settings to download.)',
            text: '',
            text_entities: [],
          })
        } else if (roll < member.voice + member.sticker) {
          messages.push({
            ...base,
            media_type: 'sticker',
            sticker_emoji: pick(r, STICKERS),
            file: '(File not included.)',
            text: '',
            text_entities: [],
          })
        } else if (roll < member.voice + member.sticker + member.photo) {
          messages.push({
            ...base,
            photo: '(File not included.)',
            width: 1280,
            height: 960,
            text: r() < 0.3 ? 'the view!! 😍' : '',
          })
        } else {
          const line = pick(r, member.lines)
          const forwarded = r() < member.forward ? { forwarded_from: 'Mountain News 🏔\uFE0F' } : {}
          const link = /https:\/\/\S+/.exec(line)
          const text = link
            ? [
                line.slice(0, link.index),
                { type: 'link', text: link[0] },
                line.slice(link.index + link[0].length),
              ].filter((p) => p !== '')
            : r() < 0.1
              ? [{ type: 'bold', text: line }]
              : line
          messages.push({ ...base, ...reply, ...forwarded, text })
        }
        const next = chooseMember(new Date(t).getHours() < 4)
        if (next !== member || r() < 0.3) member = next
        t += Math.floor(between(r, 0.2, member.name === 'Timur' ? 50 : 6) * MIN)
      }
    }
    if (day === 120)
      service(start + day * 24 * HOUR + 10 * HOUR, 'Aziza', 'edit_group_title', {
        title: 'Weekend Hikers 🥾🏔\uFE0F',
      })
  }
  return JSON.stringify(
    { name: 'Weekend Hikers 🥾🏔\uFE0F', type: 'private_group', id: 4200001, messages },
    null,
    1,
  )
}
