/// <reference lib="webworker" />
/**
 * All parsing and number crunching happens here, off the main thread.
 * The parsed messages stay inside the worker; only summaries and stats are posted back.
 * Nothing in here (or anywhere in the app) talks to the network.
 */
import {
  extractSource,
  parseTelegramChat,
  parseWhatsApp,
  readTelegramExport,
  summarizeTelegramChats,
  type DetectedSource,
} from '../lib/parse'
import type { TelegramExport } from '../lib/parse/telegram'
import { computeStats, filterByRange } from '../lib/stats/compute'
import { ChatParseError, type ParsedChat } from '../lib/types'
import type { LoadedInfo, Phase, WorkerRequest, WorkerResponse } from './protocol'

const ctx = self as unknown as DedicatedWorkerGlobalScope

let source: DetectedSource | null = null
let telegram: TelegramExport | null = null
let chat: ParsedChat | null = null
let selectedChat = 0

function post(msg: WorkerResponse) {
  ctx.postMessage(msg)
}

function progress(phase: Phase, fraction: number) {
  post({ type: 'progress', phase, fraction })
}

async function readWithProgress(file: Blob): Promise<Uint8Array> {
  const total = file.size
  if (!file.stream) return new Uint8Array(await file.arrayBuffer())
  const out = new Uint8Array(total)
  const reader = file.stream().getReader()
  let offset = 0
  let lastReport = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out.set(value, offset)
    offset += value.length
    if (offset - lastReport > 2_000_000) {
      lastReport = offset
      progress('reading', offset / total)
    }
  }
  return offset === total ? out : out.subarray(0, offset)
}

function info(): LoadedInfo {
  if (!chat || !source) throw new ChatParseError('unknown')
  return {
    platform: chat.platform,
    chats: telegram?.kind === 'multi' ? summarizeTelegramChats(telegram.chats) : undefined,
    selectedChat,
    chatName: chat.name,
    participants: chat.participants,
    messageCount: chat.messages.length,
    first: chat.messages[0].timestamp,
    last: chat.messages[chat.messages.length - 1].timestamp,
    dateOrder: chat.dateOrder,
    dateOrderAmbiguous: chat.dateOrderAmbiguous,
  }
}

function parseSelected(dateOrder?: ParsedChat['dateOrder']) {
  if (!source) throw new ChatParseError('unknown')
  if (source.platform === 'whatsapp') {
    chat = parseWhatsApp(source.text, {
      dateOrder,
      onProgress: (f) => progress('parsing', f),
    })
  } else {
    telegram ??= readTelegramExport(source.text)
    const tgChat = telegram.kind === 'single' ? telegram.chat : telegram.chats[selectedChat]
    if (!tgChat) throw new ChatParseError('no_messages')
    chat = parseTelegramChat(tgChat, (f) => progress('parsing', f))
  }
}

async function handle(req: WorkerRequest) {
  switch (req.type) {
    case 'load': {
      source = null
      telegram = null
      chat = null
      selectedChat = 0
      progress('reading', 0)
      const bytes = await readWithProgress(req.file)
      progress('parsing', 0)
      source = extractSource(bytes, req.name)
      parseSelected()
      post({ type: 'loaded', info: info() })
      break
    }
    case 'selectChat': {
      selectedChat = req.index
      parseSelected()
      post({ type: 'loaded', info: info() })
      break
    }
    case 'setDateOrder': {
      parseSelected(req.order)
      post({ type: 'loaded', info: info() })
      break
    }
    case 'compute': {
      if (!chat) throw new ChatParseError('unknown')
      progress('computing', 0)
      const messages = filterByRange(chat.messages, req.range)
      if (messages.length === 0) throw new ChatParseError('no_messages')
      const stats = computeStats(messages, {
        platform: chat.platform,
        chatName: chat.name,
        onProgress: (f) => progress('computing', f),
      })
      post({ type: 'stats', stats, range: req.range })
      break
    }
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  handle(event.data).catch((err: unknown) => {
    const code =
      err instanceof ChatParseError ? err.code : err instanceof RangeError ? 'too_large' : 'unknown'
    // Log for debugging in the console only; the UI shows a friendly message.
    if (!(err instanceof ChatParseError)) console.error(err)
    post({ type: 'error', code })
  })
}
