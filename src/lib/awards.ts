/**
 * All award definitions live in this file. Each award has:
 *  - condition(person, ctx): a score when the person qualifies (higher = stronger claim), or null
 *  - vars(person, ctx): numbers for the description placeholders
 *  - title / description in every UI language
 *
 * Placeholders: {count} → number, {pct} → percentage, {duration} → ms formatted as time,
 * {hour} → hour of day. Keep the tone warm and playful: never about looks, identity or anything hurtful.
 */
import type { Lang } from '../i18n/lang'
import type { ChatStats, PersonStats } from './stats/compute'
import { DAY, HOUR } from './stats/compute'

export interface AwardContext {
  stats: ChatStats
  /** Index of the person in stats.people. */
  index: number
  totalConversations: number
}

type Text = Record<Lang, string>

export interface AwardDef {
  id: string
  emoji: string
  title: Text
  description: Text
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
    title: { en: 'The Midnight Philosopher', ru: 'Полуночный философ', uz: 'Yarim tun faylasufi' },
    description: {
      en: '{count} messages between midnight and 5 AM. Deep thoughts need dark skies.',
      ru: '{count} сообщений между полуночью и 5 утра. Глубоким мыслям нужна темнота.',
      uz: 'Yarim tundan soat 5 gacha {count} ta xabar. Chuqur fikrlar qorongʻulikni yaxshi koʻradi.',
    },
    condition: (p) => atLeast(p.lateNight, 3),
    vars: (p) => ({ count: p.lateNight }),
  },
  {
    id: 'voice-note-villain',
    emoji: '🎙️',
    priority: 1.3,
    title: { en: 'The Voice Note Villain', ru: 'Злодей голосовых', uz: 'Ovozli xabarlar ustasi' },
    description: {
      en: '{count} voice messages. When does the podcast launch?',
      ru: '{count} голосовых. Когда запуск подкаста?',
      uz: '{count} ta ovozli xabar. Podkast qachon chiqadi?',
    },
    condition: (p) => atLeast(p.voice, 3),
    vars: (p) => ({ count: p.voice }),
  },
  {
    id: 'seen-at',
    emoji: '👀',
    priority: 1.3,
    title: { en: 'Seen at 2:14 PM', ru: 'Прочитано в 14:14', uz: 'Koʻrildi: 14:14' },
    description: {
      en: 'Median reply time: {duration}. Good things come to those who wait.',
      ru: 'Медианное время ответа: {duration}. Хорошее стоит ожидания.',
      uz: 'Oʻrtacha javob vaqti: {duration}. Sabr tagi — sariq oltin.',
    },
    condition: (p) => (p.medianReplyMs !== null && p.replyCount >= 5 ? p.medianReplyMs + 1 : null),
    vars: (p) => ({ duration: p.medianReplyMs ?? 0 }),
  },
  {
    id: 'speed-demon',
    emoji: '⚡',
    priority: 1.3,
    title: { en: 'Speed Demon', ru: 'Скоростной демон', uz: 'Chaqmoq' },
    description: {
      en: 'Replies in {duration} (median). Are your thumbs okay?',
      ru: 'Отвечает за {duration} (медиана). Пальцы в порядке?',
      uz: '{duration} ichida javob beradi. Barmoqlaringiz charchamadimi?',
    },
    condition: (p) =>
      p.medianReplyMs !== null && p.replyCount >= 5 ? 1 / (p.medianReplyMs + 1000) : null,
    vars: (p) => ({ duration: p.medianReplyMs ?? 0 }),
  },
  {
    id: 'essay-writer',
    emoji: '📜',
    priority: 1.2,
    title: { en: 'The Essay Writer', ru: 'Автор эссе', uz: 'Insho ustasi' },
    description: {
      en: '{count} words per message on average. Chapter two when?',
      ru: 'В среднем {count} слов в сообщении. Когда вторая глава?',
      uz: 'Har bir xabarda oʻrtacha {count} soʻz. Ikkinchi bob qachon?',
    },
    condition: (p) => (p.textMessages >= 20 && p.avgWords >= 4 ? p.avgWords : null),
    vars: (p) => ({ count: Math.round(p.avgWords * 10) / 10 }),
  },
  {
    id: 'hype-machine',
    emoji: '🎉',
    title: { en: 'The Hype Machine', ru: 'Машина хайпа', uz: 'Hayajon mashinasi' },
    description: {
      en: '{count} exclamation marks and emojis. Pure energy!!!',
      ru: '{count} восклицательных знаков и эмодзи. Чистая энергия!!!',
      uz: '{count} ta undov belgisi va emoji. Sof energiya!!!',
    },
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
    title: { en: 'Ghost Mode', ru: 'Режим призрака', uz: 'Arvoh rejimi' },
    description: {
      en: 'Once vanished for {duration} before replying. Spooky.',
      ru: 'Однажды исчезновение длилось {duration}. Жутковато.',
      uz: 'Bir marta {duration} davomida gʻoyib boʻldi. Qoʻrqinchli.',
    },
    condition: (p) => atLeast(p.maxGhostMs, 12 * HOUR),
    vars: (p) => ({ duration: p.maxGhostMs }),
  },
  {
    id: 'conversation-starter',
    emoji: '🚀',
    priority: 1.2,
    title: { en: 'The Conversation Starter', ru: 'Заводила', uz: 'Suhbat boshlovchisi' },
    description: {
      en: 'Kicked off {pct} of all conversations. The chat’s alarm clock.',
      ru: 'Начинает {pct} всех разговоров. Будильник этого чата.',
      uz: 'Barcha suhbatlarning {pct} qismini boshlagan. Chatning budilnigi.',
    },
    condition: (p) => atLeast(p.convStarts, 3),
    vars: (p, ctx) => ({ pct: share(p.convStarts, ctx.totalConversations) }),
  },
  {
    id: 'topic-killer',
    emoji: '🔚',
    title: { en: 'The Topic Killer', ru: 'Убийца тем', uz: 'Mavzu qotili' },
    description: {
      en: 'Had the last word before a long silence {count} times. Mic drop.',
      ru: 'Последнее слово перед долгой тишиной — {count} раз. Микрофон упал.',
      uz: '{count} marta uzoq jimlikdan oldin oxirgi soʻzni aytgan. Mikrofon tashlandi.',
    },
    condition: (p) => atLeast(p.convEnds, 3),
    vars: (p) => ({ count: p.convEnds }),
  },
  {
    id: 'chief-laughing-officer',
    emoji: '😂',
    priority: 1.3,
    title: { en: 'Chief Laughing Officer', ru: 'Главный по смеху', uz: 'Bosh kulgi direktori' },
    description: {
      en: '{count} laughs logged. Best audience ever.',
      ru: '{count} смешков. Лучшая публика на свете.',
      uz: '{count} marta kulgi. Eng zoʻr tomoshabin.',
    },
    condition: (p) => atLeast(p.laughs, 5),
    vars: (p) => ({ count: p.laughs }),
  },
  {
    id: 'sticker-mafia',
    emoji: '🃏',
    priority: 1.2,
    title: { en: 'The Sticker Mafia', ru: 'Стикерная мафия', uz: 'Stiker mafiyasi' },
    description: {
      en: '{count} stickers deployed. Words are overrated.',
      ru: '{count} стикеров. Слова переоценены.',
      uz: '{count} ta stiker. Soʻzlar shart emas.',
    },
    condition: (p) => atLeast(p.stickers, 3),
    vars: (p) => ({ count: p.stickers }),
  },
  {
    id: 'question-detective',
    emoji: '🔍',
    title: {
      en: 'The Question Mark Detective',
      ru: 'Детектив вопросительных знаков',
      uz: 'Savol belgisi detektivi',
    },
    description: {
      en: 'Asked {count} questions. Curiosity level: maxed out.',
      ru: '{count} вопросов. Любопытство на максимуме.',
      uz: '{count} ta savol. Qiziquvchanlik — maksimumda.',
    },
    condition: (p) => atLeast(p.questions, 5),
    vars: (p) => ({ count: p.questions }),
  },
  {
    id: 'sorry-champion',
    emoji: '🙏',
    title: { en: 'The Sorry Champion', ru: 'Чемпион по извинениям', uz: 'Kechirim chempioni' },
    description: {
      en: 'Said sorry {count} times. Probably even when it wasn’t needed.',
      ru: '{count} извинений. Наверняка даже без повода.',
      uz: '{count} marta kechirim soʻragan. Ehtimol, sababsiz ham.',
    },
    condition: (p) => atLeast(p.phrases.sorry, 2),
    vars: (p) => ({ count: p.phrases.sorry }),
  },
  {
    id: 'gratitude-guru',
    emoji: '💐',
    title: { en: 'The Gratitude Guru', ru: 'Гуру благодарности', uz: 'Minnatdorchilik ustozi' },
    description: {
      en: 'Said thanks {count} times. Manners: impeccable.',
      ru: '«Спасибо» — {count} раз. Манеры безупречны.',
      uz: '{count} marta rahmat aytgan. Odobi aʼlo.',
    },
    condition: (p) => atLeast(p.phrases.thanks, 3),
    vars: (p) => ({ count: p.phrases.thanks }),
  },
  {
    id: 'love-letter',
    emoji: '💌',
    priority: 1.1,
    title: { en: 'The Love Letter', ru: 'Любовное письмо', uz: 'Sevgi maktubi' },
    description: {
      en: 'Said “love you” {count} times. Wholesome levels: critical.',
      ru: '{count} признаний в любви. Уровень милоты: критический.',
      uz: '{count} marta “yaxshi koʻraman”. Shirinlik darajasi: kritik.',
    },
    condition: (p) => atLeast(p.phrases.love, 2),
    vars: (p) => ({ count: p.phrases.love }),
  },
  {
    id: 'certified-ok',
    emoji: '👌',
    title: { en: 'Certified OK-er', ru: 'Мастер «ок»', uz: 'Rasmiy “ok”chi' },
    description: {
      en: 'Said “ok” {count} times. Efficient. Mysterious. Ok.',
      ru: '«Ок» — {count} раз. Коротко. Загадочно. Ок.',
      uz: '{count} marta “ok”. Qisqa. Sirli. Ok.',
    },
    condition: (p) => atLeast(p.phrases.ok, 5),
    vars: (p) => ({ count: p.phrases.ok }),
  },
  {
    id: 'triple-texter',
    emoji: '🔁',
    title: { en: 'The Triple Texter', ru: 'Мастер серий', uz: 'Ketma-ket yozuvchi' },
    description: {
      en: 'Sent 3+ messages in a row {count} times. Why say it once?',
      ru: '3+ сообщения подряд — {count} раз. Зачем говорить один раз?',
      uz: '{count} marta ketma-ket 3+ xabar. Nega bir marta aytish kerak?',
    },
    condition: (p) => atLeast(p.doubleTexts, 3),
    vars: (p) => ({ count: p.doubleTexts }),
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    title: { en: 'The Early Bird', ru: 'Ранняя пташка', uz: 'Erta turar' },
    description: {
      en: '{count} messages between 5 and 9 AM. Coffee? Chat first.',
      ru: '{count} сообщений с 5 до 9 утра. Кофе подождёт.',
      uz: 'Soat 5 dan 9 gacha {count} ta xabar. Avval chat, keyin kofe.',
    },
    condition: (p) => atLeast(p.earlyBird, 5),
    vars: (p) => ({ count: p.earlyBird }),
  },
  {
    id: 'weekend-warrior',
    emoji: '🛋️',
    title: { en: 'The Weekend Warrior', ru: 'Воин выходных', uz: 'Dam olish jangchisi' },
    description: {
      en: '{pct} of their messages land on weekends. Saturday’s main character.',
      ru: '{pct} сообщений — в выходные. Звезда субботы.',
      uz: 'Xabarlarining {pct} qismi dam olish kunlarida. Shanba qahramoni.',
    },
    condition: (p) => {
      const s = p.weekend / Math.max(1, p.messages)
      return p.messages >= 30 && s >= 0.35 ? s : null
    },
    vars: (p) => ({ pct: share(p.weekend, p.messages) }),
  },
  {
    id: 'emoji-artist',
    emoji: '🎨',
    title: { en: 'The Emoji Artist', ru: 'Эмодзи-художник', uz: 'Emoji rassomi' },
    description: {
      en: 'Used {count} different emojis. A true visual storyteller.',
      ru: '{count} разных эмодзи. Настоящий визуальный рассказчик.',
      uz: '{count} xil emoji. Haqiqiy vizual hikoyachi.',
    },
    condition: (p) => atLeast(p.distinctEmojis, 8),
    vars: (p) => ({ count: p.distinctEmojis }),
  },
  {
    id: 'paparazzi',
    emoji: '📸',
    title: { en: 'The Paparazzi', ru: 'Папарацци', uz: 'Paparatsi' },
    description: {
      en: 'Shared {count} photos and videos. Pics or it didn’t happen.',
      ru: '{count} фото и видео. Нет фото — не было.',
      uz: '{count} ta rasm va video. Rasmsiz ishonmaymiz.',
    },
    condition: (p) => atLeast(p.media, 5),
    vars: (p) => ({ count: p.media }),
  },
  {
    id: 'master-of-brevity',
    emoji: '✂️',
    title: { en: 'The Master of Brevity', ru: 'Мастер краткости', uz: 'Qisqalik ustasi' },
    description: {
      en: 'Just {count} words per message. Why waste letters?',
      ru: 'Всего {count} слова на сообщение. Зачем тратить буквы?',
      uz: 'Har xabarda atigi {count} soʻz. Harflarni tejash kerak.',
    },
    condition: (p) => (p.textMessages >= 30 && p.avgWords > 0 ? 1 / p.avgWords : null),
    vars: (p) => ({ count: Math.round(p.avgWords * 10) / 10 }),
  },
  {
    id: 'main-character',
    emoji: '🎬',
    title: { en: 'The Main Character', ru: 'Главный герой', uz: 'Bosh qahramon' },
    description: {
      en: 'Sent {pct} of all messages. This chat is their show.',
      ru: '{pct} всех сообщений. Этот чат — личное шоу.',
      uz: 'Barcha xabarlarning {pct} qismi. Bu chat — shaxsiy shou.',
    },
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
    title: { en: 'The Undo Button', ru: 'Кнопка «Отмена»', uz: '“Bekor qilish” tugmasi' },
    description: {
      en: 'Deleted {count} messages. We’ll never know…',
      ru: 'Удалено {count} сообщений. Мы никогда не узнаем…',
      uz: '{count} ta xabar oʻchirilgan. Hech qachon bilmaymiz…',
    },
    condition: (p) => atLeast(p.deleted, 2),
    vars: (p) => ({ count: p.deleted }),
  },
  {
    id: 'icebreaker',
    emoji: '🧊',
    priority: 1.1,
    title: { en: 'The Icebreaker', ru: 'Ледокол', uz: 'Muzyorar' },
    description: {
      en: 'Broke the longest silence ({duration}). A true hero.',
      ru: 'Прервать самую долгую тишину ({duration}) — настоящий подвиг.',
      uz: 'Eng uzun jimlikni ({duration}) buzgan. Haqiqiy qahramon.',
    },
    condition: (_p, ctx) => {
      const s = ctx.stats.longestSilence
      return s && s.brokenBy === ctx.index && s.ms >= DAY ? s.ms : null
    },
    vars: (_p, ctx) => ({ duration: ctx.stats.longestSilence?.ms ?? 0 }),
  },
  {
    id: 'office-hours-hero',
    emoji: '💼',
    title: { en: 'Office Hours Hero', ru: 'Герой рабочего дня', uz: 'Ish vaqti qahramoni' },
    description: {
      en: '{count} messages on weekdays, 9 to 5. Totally working, right?',
      ru: '{count} сообщений в будни с 9 до 17. Работа кипит, да?',
      uz: 'Ish kunlari 9 dan 17 gacha {count} ta xabar. Ishlayapmiz-a?',
    },
    condition: (p) => atLeast(p.workHours, 20),
    vars: (p) => ({ count: p.workHours }),
  },
  {
    id: 'walking-dictionary',
    emoji: '📚',
    title: { en: 'The Walking Dictionary', ru: 'Ходячий словарь', uz: 'Yuruvchi lugʻat' },
    description: {
      en: 'Used {count} different words. Vocabulary flex.',
      ru: '{count} разных слов. Словарный запас впечатляет.',
      uz: '{count} xil soʻz ishlatgan. Soʻz boyligi zoʻr.',
    },
    condition: (p) => atLeast(p.uniqueWords, 50),
    vars: (p) => ({ count: p.uniqueWords }),
  },
  {
    id: 'caps-lock',
    emoji: '📣',
    title: { en: 'CAPS LOCK ENTHUSIAST', ru: 'ФАНАТ CAPS LOCK', uz: 'CAPS LOCK ISHQIBOZI' },
    description: {
      en: '{count} MESSAGES IN ALL CAPS. WE HEAR YOU.',
      ru: '{count} СООБЩЕНИЙ КАПСОМ. МЫ СЛЫШИМ.',
      uz: '{count} TA XABAR KATTA HARFLARDA. ESHITYAPMIZ.',
    },
    condition: (p) => atLeast(p.capsMessages, 3),
    vars: (p) => ({ count: p.capsMessages }),
  },
  {
    id: 'link-librarian',
    emoji: '🔗',
    title: { en: 'The Link Librarian', ru: 'Библиотекарь ссылок', uz: 'Havolalar kutubxonachisi' },
    description: {
      en: 'Shared {count} links. Homework for everyone.',
      ru: '{count} ссылок. Домашка для всех.',
      uz: '{count} ta havola. Hammaga uy vazifasi.',
    },
    condition: (p) => atLeast(p.links, 3),
    vars: (p) => ({ count: p.links }),
  },
  {
    id: 'reply-master',
    emoji: '💬',
    title: { en: 'The Reply Master', ru: 'Мастер цитат', uz: 'Javob ustasi' },
    description: {
      en: 'Quote-replied {count} times. Context is everything.',
      ru: '{count} ответов с цитатой. Контекст — наше всё.',
      uz: '{count} marta iqtibos bilan javob. Kontekst — hammasi.',
    },
    condition: (p) => atLeast(p.quotedReplies, 5),
    vars: (p) => ({ count: p.quotedReplies }),
  },
  {
    id: 'forwarding-department',
    emoji: '📨',
    title: { en: 'The Forwarding Department', ru: 'Отдел пересылок', uz: 'Yoʻnaltirish boʻlimi' },
    description: {
      en: 'Forwarded {count} messages. The chat’s personal newsfeed.',
      ru: '{count} пересланных сообщений. Личная лента новостей чата.',
      uz: '{count} ta yoʻnaltirilgan xabar. Chatning shaxsiy yangiliklar lentasi.',
    },
    condition: (p) => atLeast(p.forwarded, 3),
    vars: (p) => ({ count: p.forwarded }),
  },

  // ---- Fallbacks: everyone deserves at least one award.
  {
    id: 'loyal-regular',
    emoji: '💛',
    fallback: true,
    title: { en: 'The Loyal Regular', ru: 'Верный завсегдатай', uz: 'Sodiq hamroh' },
    description: {
      en: '{count} messages of steady, cozy presence. The chat wouldn’t be the same.',
      ru: '{count} сообщений стабильного уюта. Без этого чат был бы другим.',
      uz: '{count} ta xabar — doimiy iliqlik. Busiz chat boshqacha boʻlardi.',
    },
    condition: (p) => p.messages,
    vars: (p) => ({ count: p.messages }),
  },
  {
    id: 'quiet-legend',
    emoji: '🌿',
    fallback: true,
    title: { en: 'The Quiet Legend', ru: 'Тихая легенда', uz: 'Sokin afsona' },
    description: {
      en: 'Speaks rarely, but each of their {count} messages is pure gold.',
      ru: 'Пишет редко, но каждое из {count} сообщений — на вес золота.',
      uz: 'Kam yozadi, lekin {count} ta xabarning har biri oltin.',
    },
    condition: (p, ctx) => 1 / Math.max(1, p.messages / Math.max(1, ctx.stats.totalMessages)),
    vars: (p) => ({ count: p.messages }),
  },
  {
    id: 'prime-time',
    emoji: '⏰',
    fallback: true,
    title: { en: 'Prime Time Player', ru: 'Звезда прайм-тайма', uz: 'Eng qizgʻin vaqt yulduzi' },
    description: {
      en: 'Most active around {hour}:00. Set your watches.',
      ru: 'Пик активности — около {hour}:00. Сверяйте часы.',
      uz: 'Eng faol vaqti — taxminan {hour}:00. Soatlarni toʻgʻrilang.',
    },
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
