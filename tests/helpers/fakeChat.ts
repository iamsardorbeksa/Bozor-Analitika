/** Deterministic generator for big fake chats, used by the perf test and scripts/gen-large-chat.ts. */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const NAMES = ['Alex', 'Sam', 'Jordan', 'Robin', 'Kai', 'Noor', 'Timur', 'Dilnoza']
const PHRASES = [
  'haha that is hilarious 😂',
  'are you coming tonight?',
  'ok',
  'I will be there in 10 minutes, the traffic is crazy today',
  'привет! как дела?',
  'ахахах ну ты даёшь',
  'salom, qalaysan?',
  'love you ❤️',
  'sorry, missed your call',
  'thanks!!',
  'did you see the match yesterday? unbelievable ending 🔥🔥',
  'jajaja',
  'https://example.com/some/link',
  'pizza or sushi?',
  '👍🏽',
]

function pad(n: number) {
  return n < 10 ? '0' + n : String(n)
}

export function generateWhatsAppText(count: number, people = 2, seed = 42): string {
  const r = rng(seed)
  const names = NAMES.slice(0, people)
  const lines: string[] = []
  let t = new Date(2023, 0, 1, 8, 0).getTime()
  for (let i = 0; i < count; i++) {
    t += Math.floor(r() * r() * 3 * 3600_000) + 1000
    const d = new Date(t)
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
    const who = names[Math.floor(r() * names.length)]
    const roll = r()
    const body =
      roll < 0.04
        ? '<Media omitted>'
        : roll < 0.05
          ? 'This message was deleted'
          : PHRASES[Math.floor(r() * PHRASES.length)]
    lines.push(`${date} - ${who}: ${body}`)
    if (r() < 0.02) lines.push('a second line of a multi-line message')
  }
  return lines.join('\n')
}

export function generateTelegramJson(count: number, people = 5, seed = 7): string {
  const r = rng(seed)
  const names = NAMES.slice(0, people)
  const messages: object[] = []
  let t = Math.floor(new Date(2023, 0, 1, 8, 0).getTime() / 1000)
  for (let i = 0; i < count; i++) {
    t += Math.floor(r() * r() * 3 * 3600) + 1
    const d = new Date(t * 1000)
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const who = Math.floor(r() * names.length)
    const roll = r()
    const base = {
      id: i + 1,
      type: 'message',
      date,
      date_unixtime: String(t),
      from: names[who],
      from_id: `user${who}`,
    }
    if (roll < 0.03) messages.push({ ...base, media_type: 'voice_message', text: '' })
    else if (roll < 0.06)
      messages.push({ ...base, media_type: 'sticker', sticker_emoji: '😂', text: '' })
    else
      messages.push({
        ...base,
        text: [PHRASES[Math.floor(r() * PHRASES.length)], { type: 'bold', text: ' !' }],
      })
  }
  return JSON.stringify({ name: 'Big Group', type: 'private_group', id: 1, messages })
}
