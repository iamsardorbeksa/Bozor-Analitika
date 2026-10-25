import { describe, expect, it } from 'vitest'
import { assignAwards } from '../src/lib/awards'
import { parseTelegram, parseWhatsApp } from '../src/lib/parse'
import { computeStats } from '../src/lib/stats/compute'
import { generateTelegramJson, generateWhatsAppText } from './helpers/fakeChat'

/** Target from the spec: parse + stats for 200k messages in under 5 seconds. */
const BUDGET_MS = 5000

describe('performance', () => {
  it('parses and analyses 200k WhatsApp messages within budget', () => {
    const text = generateWhatsAppText(200_000, 2)
    const t0 = performance.now()
    const chat = parseWhatsApp(text)
    const t1 = performance.now()
    const stats = computeStats(chat.messages, { platform: 'whatsapp' })
    assignAwards(stats)
    const t2 = performance.now()
    console.log(`WhatsApp 200k: parse ${(t1 - t0).toFixed(0)}ms, stats ${(t2 - t1).toFixed(0)}ms`)
    expect(chat.messages.length).toBe(200_000)
    expect(t2 - t0).toBeLessThan(BUDGET_MS)
  })

  it('parses and analyses 200k Telegram messages within budget', () => {
    const json = generateTelegramJson(200_000, 6)
    const t0 = performance.now()
    const chat = parseTelegram(json)
    const t1 = performance.now()
    const stats = computeStats(chat.messages, { platform: 'telegram' })
    const t2 = performance.now()
    console.log(`Telegram 200k: parse ${(t1 - t0).toFixed(0)}ms, stats ${(t2 - t1).toFixed(0)}ms`)
    expect(stats.people.length).toBe(6)
    expect(t2 - t0).toBeLessThan(BUDGET_MS)
  })
})
