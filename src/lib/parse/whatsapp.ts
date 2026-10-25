import { ChatParseError, type ChatMessage, type DateOrder, type ParsedChat } from '../types'
import { cleanLine } from './unicode'
import {
  classifyWhatsAppText,
  isSystemContent,
  isSystemText,
  stripEditedMarker,
} from './whatsappPatterns'

/**
 * Matches the timestamp header of a WhatsApp line, after cleanLine():
 *   Android: "12/31/23, 9:41 PM - Name: message"
 *   iOS:     "[31/12/2023, 21:41:05] Name: message"
 *   Chinese: "2023/12/31 下午9:41 - 张三: 你好" (AM/PM marker *before* the time)
 *   Arabic:  "31/12/2023، 9:41 م - Name: message" (Arabic comma; digits normalized by cleanLine)
 * Also handles dots / dashes as date separators, missing comma and a.m./p.m.
 * Groups: 1-3 date parts, 4 AM/PM prefix, 5 hour, 6 minute, 7 second, 8 AM/PM suffix.
 */
const HEADER_RE =
  /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})[,.،]?\s*(上午|下午|午前|午後|오전|오후)?\s*(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?|ص|م|午前|午後|오전|오후)?\s*\]?\s*(?:[-–—]\s+|:\s+)?/

export interface WhatsAppParseOptions {
  /** Force a date order instead of auto-detecting. */
  dateOrder?: DateOrder
  onProgress?: (fraction: number) => void
}

interface RawEntry {
  a: number
  b: number
  c: number
  aLen: number
  hour: number
  minute: number
  second: number
  ampm: string | undefined
  content: string
  /** Continuation lines are appended here. */
  extra: string[] | null
}

/** Quick check used by platform detection: does this text look like a WhatsApp export? */
export function looksLikeWhatsApp(text: string): boolean {
  const lines = text.slice(0, 20000).split(/\r?\n/, 60)
  let hits = 0
  for (const line of lines) {
    const clean = cleanLine(line)
    const m = HEADER_RE.exec(clean)
    if (m && m[0].length < clean.length) hits++
    if (hits >= 2) return true
  }
  return hits >= 1 && lines.filter((l) => l.trim()).length <= 2
}

/**
 * Decide the date order by scanning every date in the file.
 * Evidence: a component > 12 can only be the day. If nothing is decisive,
 * prefer the order where dates go backwards the least, then default to DMY.
 */
export function detectDateOrder(entries: Pick<RawEntry, 'a' | 'b' | 'c' | 'aLen'>[]): {
  order: DateOrder
  ambiguous: boolean
} {
  if (entries.length === 0) return { order: 'DMY', ambiguous: true }
  if (entries.some((e) => e.aLen === 4)) return { order: 'YMD', ambiguous: false }
  let firstOver12 = false
  let secondOver12 = false
  for (const e of entries) {
    if (e.a > 12) firstOver12 = true
    if (e.b > 12) secondOver12 = true
    if (firstOver12 && secondOver12) break
  }
  if (firstOver12 && !secondOver12) return { order: 'DMY', ambiguous: false }
  if (secondOver12 && !firstOver12) return { order: 'MDY', ambiguous: false }

  // Nothing decisive: count how often the date goes backwards under each order.
  const backwards = (order: DateOrder) => {
    let prev = -Infinity
    let count = 0
    for (const e of entries) {
      const { day, month } = order === 'MDY' ? { month: e.a, day: e.b } : { day: e.a, month: e.b }
      const key = normalizeYear(e.c) * 400 + month * 32 + day
      if (key < prev) count++
      prev = key
    }
    return count
  }
  const dmy = backwards('DMY')
  const mdy = backwards('MDY')
  if (mdy < dmy) return { order: 'MDY', ambiguous: true }
  return { order: 'DMY', ambiguous: true }
}

function normalizeYear(y: number): number {
  if (y < 100) return 2000 + y
  return y
}

function toTimestamp(e: RawEntry, order: DateOrder): number | null {
  let year: number
  let month: number
  let day: number
  if (order === 'YMD') {
    year = e.a
    month = e.b
    day = e.c
  } else if (order === 'MDY') {
    month = e.a
    day = e.b
    year = normalizeYear(e.c)
  } else {
    day = e.a
    month = e.b
    year = normalizeYear(e.c)
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let hour = e.hour
  if (e.ampm) {
    const p = e.ampm.toLowerCase()
    const pm = p.startsWith('p') || p === 'م' || p === '下午' || p === '午後' || p === '오후'
    if (hour === 12) hour = pm ? 12 : 0
    else if (pm) hour += 12
  }
  if (hour > 23 || e.minute > 59) return null
  return new Date(year, month - 1, day, hour, e.minute, e.second).getTime()
}

/** Split "Name: text" (Android & iOS share this after the header; CJK exports may use "："). */
function splitSender(content: string): { sender: string; text: string } | null {
  const idx = content.indexOf(': ')
  if (idx > 0) return { sender: content.slice(0, idx), text: content.slice(idx + 2) }
  const wide = content.indexOf('：')
  if (wide > 0) return { sender: content.slice(0, wide), text: content.slice(wide + 1).trimStart() }
  if (content.endsWith(':') && content.length > 1) {
    return { sender: content.slice(0, -1), text: '' }
  }
  return null
}

export function parseWhatsApp(input: string, options: WhatsAppParseOptions = {}): ParsedChat {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  if (!text.trim()) throw new ChatParseError('empty')

  const lines = text.split(/\r\n|\n|\r/)
  const entries: RawEntry[] = []
  const progressEvery = 50000
  for (let i = 0; i < lines.length; i++) {
    if (options.onProgress && i % progressEvery === 0) options.onProgress((i / lines.length) * 0.7)
    const line = cleanLine(lines[i])
    const m = HEADER_RE.exec(line)
    if (m) {
      const content = line.slice(m[0].length)
      entries.push({
        a: +m[1],
        b: +m[2],
        c: +m[3],
        aLen: m[1].length,
        hour: +m[5],
        minute: +m[6],
        second: m[7] ? +m[7] : 0,
        ampm: m[4] ?? m[8],
        content,
        extra: null,
      })
    } else if (entries.length > 0) {
      const last = entries[entries.length - 1]
      if (last.extra) last.extra.push(line)
      else last.extra = [line]
    }
  }
  if (entries.length === 0) throw new ChatParseError('unrecognized')

  const detected = detectDateOrder(entries)
  const order = options.dateOrder ?? detected.order

  const messages: ChatMessage[] = []
  const participants = new Map<string, true>()
  let systemCount = 0
  let invalidDates = 0
  let sorted = true
  for (let i = 0; i < entries.length; i++) {
    if (options.onProgress && i % progressEvery === 0) {
      options.onProgress(0.7 + (i / entries.length) * 0.3)
    }
    const e = entries[i]
    const timestamp = toTimestamp(e, order)
    if (timestamp === null || Number.isNaN(timestamp)) {
      invalidDates++
      continue
    }
    const split = splitSender(e.content)
    if (!split) {
      systemCount++
      continue
    }
    const sender = split.sender.trim()
    let body = split.text
    if (e.extra) body += '\n' + e.extra.join('\n')
    if (
      !sender ||
      sender.length > 80 ||
      isSystemText(body) ||
      (sender.split(' ').length >= 3 && isSystemContent(sender))
    ) {
      systemCount++
      continue
    }
    body = stripEditedMarker(body).trimEnd()
    const kind = classifyWhatsAppText(body)
    const prev = messages[messages.length - 1]
    if (prev && timestamp < prev.timestamp) sorted = false
    messages.push({ timestamp, sender, text: kind === 'text' ? body : '', kind })
    participants.set(sender, true)
  }

  if (messages.length === 0) {
    if (invalidDates > 0) throw new ChatParseError('unrecognized')
    throw new ChatParseError('no_messages')
  }
  if (!sorted) messages.sort((x, y) => x.timestamp - y.timestamp)
  options.onProgress?.(1)

  return {
    platform: 'whatsapp',
    messages,
    participants: [...participants.keys()],
    dateOrder: order,
    dateOrderAmbiguous: detected.ambiguous,
    systemCount,
  }
}
