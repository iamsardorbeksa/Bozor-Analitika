import { unzipSync } from 'fflate'
import { ChatParseError, type Platform } from '../types'
import { decodeBytes } from './unicode'
import { looksLikeWhatsApp } from './whatsapp'

export { parseWhatsApp, detectDateOrder } from './whatsapp'
export {
  parseTelegram,
  parseTelegramChat,
  readTelegramExport,
  summarizeTelegramChats,
  flattenTelegramText,
} from './telegram'

export interface DetectedSource {
  platform: Platform
  text: string
}

const MAX_BYTES = 1024 * 1024 * 1024 // 1 GB: beyond that the tab will likely run out of memory

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}

function looksLikeTelegramHtml(text: string): boolean {
  const head = text.slice(0, 5000).toLowerCase()
  return (
    (head.includes('<!doctype html') || head.includes('<html')) &&
    (head.includes('telegram') || head.includes('page_wrap') || head.includes('message default'))
  )
}

/** Detect the platform from raw text. Throws a friendly ChatParseError when unknown. */
export function detectPlatform(text: string): Platform {
  const trimmed = text.replace(/^\uFEFF/, '').trimStart()
  if (!trimmed) throw new ChatParseError('empty')
  if (trimmed.startsWith('{')) {
    const head = trimmed.slice(0, 4000)
    if (
      /"messages"\s*:|"chats"\s*:|"personal_information"\s*:|"about"\s*:/.test(head) ||
      /"messages"\s*:/.test(trimmed.slice(0, 200000))
    ) {
      return 'telegram'
    }
    throw new ChatParseError('unrecognized')
  }
  if (looksLikeTelegramHtml(trimmed)) throw new ChatParseError('telegram_html')
  if (looksLikeWhatsApp(trimmed)) return 'whatsapp'
  throw new ChatParseError('unrecognized')
}

/**
 * Turn the uploaded bytes into chat text: unzips WhatsApp .zip exports
 * (picking _chat.txt or the biggest .txt) and Telegram zips (result.json).
 */
export function extractSource(bytes: Uint8Array, fileName = ''): DetectedSource {
  if (bytes.length === 0) throw new ChatParseError('empty')
  if (bytes.length > MAX_BYTES) throw new ChatParseError('too_large')
  if (isZip(bytes) || /\.zip$/i.test(fileName)) {
    let files: Record<string, Uint8Array>
    try {
      files = unzipSync(bytes, {
        // Only inflate text / json entries; media files are skipped entirely.
        filter: (f) => /\.(txt|json|html?)$/i.test(f.name) && !f.name.startsWith('__MACOSX'),
      })
    } catch {
      throw new ChatParseError('corrupted_zip')
    }
    const names = Object.keys(files)
    const pick =
      names.find((n) => /(^|\/)_chat\.txt$/i.test(n)) ??
      names.find((n) => /(^|\/)result\.json$/i.test(n)) ??
      names
        .filter((n) => /\.(txt|json)$/i.test(n))
        .sort((a, b) => files[b].length - files[a].length)[0]
    if (!pick) {
      if (names.some((n) => /messages\d*\.html?$/i.test(n)))
        throw new ChatParseError('telegram_html')
      throw new ChatParseError('zip_no_chat')
    }
    const text = decodeBytes(files[pick])
    return { platform: detectPlatform(text), text }
  }
  const text = decodeBytes(bytes)
  return { platform: detectPlatform(text), text }
}
