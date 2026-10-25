import {
  ChatParseError,
  type ChatMessage,
  type ChatSummary,
  type MessageKind,
  type ParsedChat,
} from '../types'

/* Shapes of the Telegram Desktop "Machine-readable JSON" export (only the fields we use). */
type TgTextPart = string | { type?: string; text?: string }
interface TgMessage {
  id?: number
  type?: string
  date?: string
  date_unixtime?: string | number
  from?: string | null
  from_id?: string
  actor?: string
  text?: string | TgTextPart[]
  media_type?: string
  photo?: string
  file?: string
  sticker_emoji?: string
  reply_to_message_id?: number
  forwarded_from?: string | null
  poll?: unknown
  contact_information?: unknown
  location_information?: unknown
}
interface TgChat {
  name?: string | null
  type?: string
  id?: number
  messages?: TgMessage[]
}
interface TgFullExport {
  chats?: { list?: TgChat[] }
  left_chats?: { list?: TgChat[] }
}

export type TelegramExport = { kind: 'single'; chat: TgChat } | { kind: 'multi'; chats: TgChat[] }

/** Turn Telegram's string-or-array `text` into plain text. */
export function flattenTelegramText(text: TgMessage['text']): string {
  if (text == null) return ''
  if (typeof text === 'string') return text
  if (!Array.isArray(text)) return ''
  let out = ''
  for (const part of text) {
    if (typeof part === 'string') out += part
    else if (part && typeof part.text === 'string') out += part.text
  }
  return out
}

/** Parse the JSON text and figure out whether it is a single chat or a full account export. */
export function readTelegramExport(json: string): TelegramExport {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new ChatParseError('corrupted_json')
  }
  if (!data || typeof data !== 'object') throw new ChatParseError('unrecognized')
  const obj = data as TgChat & TgFullExport
  if (Array.isArray(obj.messages)) return { kind: 'single', chat: obj }
  const list = [...(obj.chats?.list ?? []), ...(obj.left_chats?.list ?? [])].filter(
    (c) => c && Array.isArray(c.messages) && c.messages.length > 0,
  )
  if (obj.chats && Array.isArray(obj.chats.list)) {
    if (list.length === 0) throw new ChatParseError('no_messages')
    // Sort biggest chats first; that's almost always what people want.
    list.sort((x, y) => (y.messages?.length ?? 0) - (x.messages?.length ?? 0))
    return { kind: 'multi', chats: list }
  }
  throw new ChatParseError('unrecognized')
}

export function summarizeTelegramChats(chats: TgChat[]): ChatSummary[] {
  return chats.map((c) => ({
    name: c.name || chatTypeLabel(c.type),
    type: c.type ?? 'unknown',
    messageCount: c.messages?.filter((m) => m.type !== 'service').length ?? 0,
  }))
}

function chatTypeLabel(type?: string): string {
  if (type === 'saved_messages') return 'Saved Messages'
  return 'Unnamed chat'
}

function kindOf(m: TgMessage): MessageKind {
  switch (m.media_type) {
    case 'sticker':
      return 'sticker'
    case 'voice_message':
    case 'video_message':
      return 'voice'
    case undefined:
      break
    default:
      return 'media'
  }
  if (m.photo || m.file || m.poll || m.contact_information || m.location_information) {
    return 'media'
  }
  return 'text'
}

/** Parse local wall-clock "2023-12-31T21:41:05", falling back to the unix timestamp. */
function timestampOf(m: TgMessage): number {
  if (typeof m.date === 'string') {
    const d = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(m.date)
    if (d) return new Date(+d[1], +d[2] - 1, +d[3], +d[4], +d[5], +d[6]).getTime()
  }
  if (m.date_unixtime != null) {
    const n = Number(m.date_unixtime)
    if (Number.isFinite(n)) return n * 1000
  }
  return NaN
}

export function parseTelegramChat(
  chat: TgChat,
  onProgress?: (fraction: number) => void,
): ParsedChat {
  const raw = chat.messages ?? []
  // Resolve display names by from_id so renamed users stay one person,
  // and two different people with the same name stay two people.
  const nameById = new Map<string, string>()
  for (const m of raw) {
    if (m.type !== 'message') continue
    const id = m.from_id ?? m.from ?? 'unknown'
    if (m.from) nameById.set(id, m.from)
  }
  const usedNames = new Map<string, string>()
  const displayName = (id: string): string => {
    const cached = usedNames.get(id)
    if (cached) return cached
    const base = nameById.get(id) || 'Deleted Account'
    let name = base
    let n = 2
    const taken = new Set(usedNames.values())
    while (taken.has(name)) name = `${base} (${n++})`
    usedNames.set(id, name)
    return name
  }

  const messages: ChatMessage[] = []
  let systemCount = 0
  let sorted = true
  for (let i = 0; i < raw.length; i++) {
    if (onProgress && i % 50000 === 0) onProgress(i / raw.length)
    const m = raw[i]
    if (!m || m.type !== 'message') {
      systemCount++
      continue
    }
    const timestamp = timestampOf(m)
    if (Number.isNaN(timestamp)) continue
    const kind = kindOf(m)
    const msg: ChatMessage = {
      timestamp,
      sender: displayName(m.from_id ?? m.from ?? 'unknown'),
      text: flattenTelegramText(m.text),
      kind,
    }
    if (typeof m.id === 'number') msg.id = m.id
    if (typeof m.reply_to_message_id === 'number') msg.replyTo = m.reply_to_message_id
    if (m.forwarded_from !== undefined) msg.forwarded = true
    if (kind === 'sticker' && m.sticker_emoji) msg.stickerEmoji = m.sticker_emoji
    const prev = messages[messages.length - 1]
    if (prev && timestamp < prev.timestamp) sorted = false
    messages.push(msg)
  }
  if (messages.length === 0) throw new ChatParseError('no_messages')
  if (!sorted) messages.sort((a, b) => a.timestamp - b.timestamp)
  onProgress?.(1)

  const participants = [...new Set(messages.map((m) => m.sender))]
  return {
    platform: 'telegram',
    name: chat.name ?? undefined,
    messages,
    participants,
    systemCount,
  }
}

/** Convenience for tests and single-chat exports. */
export function parseTelegram(json: string, chatIndex = 0): ParsedChat {
  const exp = readTelegramExport(json)
  const chat = exp.kind === 'single' ? exp.chat : exp.chats[chatIndex]
  if (!chat) throw new ChatParseError('no_messages')
  return parseTelegramChat(chat)
}
