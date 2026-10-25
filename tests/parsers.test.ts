import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  detectPlatform,
  extractSource,
  flattenTelegramText,
  parseTelegram,
  parseWhatsApp,
  readTelegramExport,
  summarizeTelegramChats,
} from '../src/lib/parse'
import { ChatParseError } from '../src/lib/types'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const fixtureBytes = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)))
const local = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, mo - 1, d, h, mi, s).getTime()

function expectCode(fn: () => unknown, code: string) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(ChatParseError)
    expect((e as ChatParseError).code).toBe(code)
    return
  }
  throw new Error(`expected ChatParseError(${code})`)
}

describe('WhatsApp parser', () => {
  it('parses Android 12h format with narrow no-break spaces', () => {
    const chat = parseWhatsApp(fixture('android-12h.txt'))
    expect(chat.dateOrder).toBe('MDY')
    expect(chat.dateOrderAmbiguous).toBe(false)
    expect(chat.participants).toEqual(['Alice', 'Bob'])
    expect(chat.systemCount).toBe(1)
    expect(chat.messages).toHaveLength(6)
    expect(chat.messages[0]).toMatchObject({
      sender: 'Alice',
      text: 'Happy new year eve!!',
      kind: 'text',
      timestamp: local(2023, 12, 31, 21, 41),
    })
    expect(chat.messages[2].kind).toBe('media')
    expect(chat.messages[3]).toMatchObject({ kind: 'deleted', timestamp: local(2024, 1, 1, 0, 1) })
    expect(chat.messages[4].text).toBe('first line\nsecond line\nthird line')
    expect(chat.messages[5].timestamp).toBe(local(2024, 1, 13, 15, 0))
  })

  it('parses Android 24h format with BOM, Russian placeholders and system lines', () => {
    const chat = parseWhatsApp(fixture('android-24h.txt'))
    expect(chat.dateOrder).toBe('DMY')
    expect(chat.messages.map((m) => m.kind)).toEqual(['text', 'text', 'media', 'deleted', 'text'])
    expect(chat.messages[0].timestamp).toBe(local(2023, 12, 31, 21, 41))
    expect(chat.messages[4].timestamp).toBe(local(2024, 1, 13, 9, 5))
    expect(chat.systemCount).toBe(1) // "Alice added Charlie"
  })

  it('parses iOS bracket format, LRM marks, media kinds and edited markers', () => {
    const chat = parseWhatsApp(fixture('ios.txt'))
    expect(chat.dateOrder).toBe('DMY')
    expect(chat.systemCount).toBe(1) // encryption notice
    expect(chat.messages.map((m) => m.kind)).toEqual([
      'text',
      'media',
      'sticker',
      'voice',
      'text',
      'deleted',
      'text',
    ])
    expect(chat.messages[0].timestamp).toBe(local(2023, 12, 31, 21, 41, 5))
    expect(chat.messages[4].text).toBe('multi\nline')
    expect(chat.messages[6].text).toBe('edited text')
  })

  it('detects MM/DD order from date sequence when no day is above 12', () => {
    const chat = parseWhatsApp(fixture('ambiguous-mdy.txt'))
    expect(chat.dateOrder).toBe('MDY')
    expect(chat.dateOrderAmbiguous).toBe(true)
    expect(chat.messages[2].timestamp).toBe(local(2024, 2, 1, 21, 43, 5))
    expect(chat.messages[3].timestamp).toBe(local(2024, 2, 2, 0, 10))
  })

  it('defaults to DD/MM when ambiguous, and allows overriding', () => {
    const chat = parseWhatsApp(fixture('ambiguous-dmy.txt'))
    expect(chat.dateOrder).toBe('DMY')
    expect(chat.dateOrderAmbiguous).toBe(true)
    expect(chat.messages[0].timestamp).toBe(local(2024, 1, 2, 9, 41))
    const flipped = parseWhatsApp(fixture('ambiguous-dmy.txt'), { dateOrder: 'MDY' })
    expect(flipped.messages[0].timestamp).toBe(local(2024, 2, 1, 9, 41))
  })

  it('detects media and deleted placeholders in many languages', () => {
    const chat = parseWhatsApp(fixture('media-multilang.txt'))
    expect(chat.messages.map((m) => m.kind)).toEqual([
      'text', // hola jajaja
      'media', // Multimedia omitido
      'media', // imagen omitida
      'deleted', // es
      'deleted', // tr
      'media', // tr
      'voice', // audio omitido
      'sticker', // sticker omitido
      'media', // de
      'deleted', // de
      'media', // pt
      'media', // fr
      'media', // ar
      'deleted', // uz with ʻ
      'text', // long sentence containing "omitted"
    ])
  })

  it('handles group chats, phone-number senders and system messages', () => {
    const chat = parseWhatsApp(fixture('group-system.txt'))
    expect(chat.participants).toEqual(['Alice', '+1 555 123 4567', 'Carol'])
    expect(chat.messages).toHaveLength(3)
    expect(chat.systemCount).toBe(5)
  })

  it('parses 4-digit year first (YYYY-MM-DD) exports', () => {
    const chat = parseWhatsApp('2024-03-05 14:22 - Ann: hey\n2024-03-06 08:00 - Ben: yo\n')
    expect(chat.dateOrder).toBe('YMD')
    expect(chat.messages[0].timestamp).toBe(local(2024, 3, 5, 14, 22))
  })

  it('parses Chinese exports with 上午/下午 before the time', () => {
    const chat = parseWhatsApp(fixture('zh-android.txt'))
    expect(chat.dateOrder).toBe('YMD')
    expect(chat.systemCount).toBe(1) // encryption notice
    expect(chat.participants.sort()).toEqual(['张伟', '李娜'].sort())
    expect(chat.messages.map((m) => m.kind)).toEqual(['text', 'text', 'media', 'deleted'])
    expect(chat.messages[0].timestamp).toBe(local(2023, 12, 31, 10, 5))
    expect(chat.messages[1].timestamp).toBe(local(2023, 12, 31, 21, 41))
    expect(chat.messages[2].timestamp).toBe(local(2024, 1, 1, 0, 30))
  })

  it('parses Arabic exports with Arabic-Indic digits, Arabic comma and ص/م', () => {
    const chat = parseWhatsApp(fixture('ar-android.txt'))
    expect(chat.dateOrder).toBe('DMY')
    expect(chat.participants).toEqual(['أحمد', 'سارة'])
    expect(chat.messages.map((m) => m.kind)).toEqual(['text', 'deleted', 'media'])
    expect(chat.messages[0].timestamp).toBe(local(2023, 12, 31, 21, 41))
    expect(chat.messages[2].timestamp).toBe(local(2024, 1, 1, 0, 15))
    // digits inside the message text are left alone
    expect(chat.messages[0].text).toBe('ههههه شكراً')
  })

  it('handles a.m./p.m. variants and 12 AM/PM edge cases', () => {
    const chat = parseWhatsApp(
      '[13/01/2024, 12:05:00 a.m.] Ann: midnight\n[13/01/2024, 12:05:00 p.m.] Ben: noon\n',
    )
    expect(chat.messages[0].timestamp).toBe(local(2024, 1, 13, 0, 5))
    expect(chat.messages[1].timestamp).toBe(local(2024, 1, 13, 12, 5))
  })

  it('throws friendly errors for empty and unrecognized files', () => {
    expectCode(() => parseWhatsApp(fixture('empty.txt')), 'empty')
    expectCode(() => parseWhatsApp(fixture('random.txt')), 'unrecognized')
  })
})

describe('Telegram parser', () => {
  it('flattens text arrays', () => {
    expect(flattenTelegramText(['a', { type: 'bold', text: 'b' }, { type: 'x' }, 'c'])).toBe('abc')
    expect(flattenTelegramText('plain')).toBe('plain')
    expect(flattenTelegramText(undefined)).toBe('')
  })

  it('parses a single chat export', () => {
    const chat = parseTelegram(fixture('telegram-single.json'))
    expect(chat.platform).toBe('telegram')
    expect(chat.systemCount).toBe(1)
    expect(chat.messages).toHaveLength(7)
    // renamed user keeps one identity (latest name)
    expect(chat.participants).toEqual(['Alice Renamed', 'Bob'])
    expect(chat.messages[1]).toMatchObject({
      text: 'Check https://example.com now',
      replyTo: 2,
      kind: 'text',
    })
    expect(chat.messages[2].kind).toBe('voice')
    expect(chat.messages[3]).toMatchObject({ kind: 'sticker', stickerEmoji: '😂' })
    expect(chat.messages[4].kind).toBe('voice') // round video
    expect(chat.messages[5].kind).toBe('media')
    expect(chat.messages[6].forwarded).toBe(true)
    expect(chat.messages[0].timestamp).toBe(local(2024, 1, 1, 10, 1))
  })

  it('reads a full account export with a chat list', () => {
    const exp = readTelegramExport(fixture('telegram-full.json'))
    expect(exp.kind).toBe('multi')
    if (exp.kind !== 'multi') return
    const summary = summarizeTelegramChats(exp.chats)
    expect(summary.map((s) => s.name)).toEqual(['Big Group', 'Small'])
    expect(summary[0].messageCount).toBe(4)
    const group = parseTelegram(fixture('telegram-full.json'), 0)
    // two different people both called "B" stay separate
    expect(group.participants).toEqual(['A', 'B', 'C', 'B (2)'])
    expect(group.systemCount).toBe(1)
  })

  it('throws on corrupted JSON', () => {
    expectCode(() => parseTelegram(fixture('telegram-corrupted.json')), 'corrupted_json')
  })
})

describe('platform detection & extraction', () => {
  it('detects WhatsApp and Telegram', () => {
    expect(detectPlatform(fixture('android-12h.txt'))).toBe('whatsapp')
    expect(detectPlatform(fixture('ios.txt'))).toBe('whatsapp')
    expect(detectPlatform(fixture('telegram-single.json'))).toBe('telegram')
    expect(detectPlatform(fixture('telegram-full.json'))).toBe('telegram')
  })

  it('gives a friendly error for Telegram HTML exports', () => {
    expectCode(() => detectPlatform(fixture('telegram.html')), 'telegram_html')
  })

  it('rejects unknown and empty files', () => {
    expectCode(() => detectPlatform(fixture('random.txt')), 'unrecognized')
    expectCode(() => extractSource(new Uint8Array()), 'empty')
    expectCode(() => detectPlatform('{"hello": 1}'), 'unrecognized')
  })

  it('extracts _chat.txt from a WhatsApp zip and ignores media', () => {
    const zip = zipSync({
      '_chat.txt': fixtureBytes('ios.txt'),
      'IMG-0001.jpg': new Uint8Array([1, 2, 3]),
    })
    const src = extractSource(zip, 'WhatsApp Chat.zip')
    expect(src.platform).toBe('whatsapp')
    expect(parseWhatsApp(src.text).messages.length).toBe(7)
  })

  it('reports zips without a chat file, and corrupted zips', () => {
    expectCode(() => extractSource(zipSync({ 'a.jpg': strToU8('x') }), 'x.zip'), 'zip_no_chat')
    expectCode(() => extractSource(strToU8('PK\u0003\u0004garbage'), 'x.zip'), 'corrupted_zip')
  })
})
