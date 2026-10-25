import type { ChatStats, TimeRange } from '../lib/stats/compute'
import type { ChatSummary, DateOrder, ParseErrorCode, Platform } from '../lib/types'

export type WorkerRequest =
  | { type: 'load'; file: Blob; name: string }
  | { type: 'selectChat'; index: number }
  | { type: 'setDateOrder'; order: DateOrder }
  | { type: 'compute'; range: TimeRange }

export interface LoadedInfo {
  platform: Platform
  /** Telegram full-account exports: the chats to pick from. */
  chats?: ChatSummary[]
  selectedChat: number
  chatName?: string
  participants: string[]
  messageCount: number
  first: number
  last: number
  dateOrder?: DateOrder
  dateOrderAmbiguous?: boolean
}

export type Phase = 'reading' | 'parsing' | 'computing'

export type WorkerResponse =
  | { type: 'progress'; phase: Phase; fraction: number }
  | { type: 'loaded'; info: LoadedInfo }
  | { type: 'stats'; stats: ChatStats; range: TimeRange }
  | { type: 'error'; code: ParseErrorCode }
