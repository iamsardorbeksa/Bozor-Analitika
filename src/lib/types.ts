export type Platform = 'whatsapp' | 'telegram'

export type MessageKind = 'text' | 'media' | 'voice' | 'sticker' | 'deleted'

/** The one normalized message shape every parser produces. */
export interface ChatMessage {
  /** Epoch milliseconds. Wall-clock time of the chat is interpreted in the local timezone. */
  timestamp: number
  sender: string
  text: string
  kind: MessageKind
  /** Id of the message this one replies to (Telegram only). */
  replyTo?: number
  /** Our own message id (Telegram only, used to resolve replies). */
  id?: number
  forwarded?: boolean
  /** Telegram sticker emoji, when the message is a sticker. */
  stickerEmoji?: string
}

export type DateOrder = 'DMY' | 'MDY' | 'YMD'

export interface ParsedChat {
  platform: Platform
  name?: string
  messages: ChatMessage[]
  participants: string[]
  /** WhatsApp only: which date order was used and whether it was a guess. */
  dateOrder?: DateOrder
  dateOrderAmbiguous?: boolean
  /** Number of system / service messages that were skipped. */
  systemCount: number
}

export interface ChatSummary {
  name: string
  type: string
  messageCount: number
}

export type ParseErrorCode =
  | 'empty'
  | 'unrecognized'
  | 'telegram_html'
  | 'zip_no_chat'
  | 'corrupted_json'
  | 'corrupted_zip'
  | 'no_messages'
  | 'too_large'
  | 'unknown'

export class ChatParseError extends Error {
  code: ParseErrorCode
  constructor(code: ParseErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = 'ChatParseError'
  }
}
