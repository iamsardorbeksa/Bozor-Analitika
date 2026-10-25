import { describe, expect, it } from 'vitest'
import { assignAwards } from '../src/lib/awards'
import { generateTelegramDemo, generateWhatsAppDemo } from '../src/lib/demo/demoChats'
import { detectPlatform, parseTelegram, parseWhatsApp } from '../src/lib/parse'
import { computeStats } from '../src/lib/stats/compute'

describe('demo chats', () => {
  it('WhatsApp demo parses as a 1-on-1 with varied awards', () => {
    const text = generateWhatsAppDemo()
    expect(detectPlatform(text)).toBe('whatsapp')
    const chat = parseWhatsApp(text)
    expect(chat.participants.sort()).toEqual(['Leo', 'Maya'])
    expect(chat.systemCount).toBe(1)
    const stats = computeStats(chat.messages, { platform: 'whatsapp' })
    expect(stats.totalMessages).toBeGreaterThan(2000)
    expect(stats.longestSilence!.ms).toBeGreaterThan(9 * 24 * 3600_000)
    expect(stats.people.find((p) => p.name === 'Maya')!.voice).toBeGreaterThan(10)
    const awards = assignAwards(stats)
    for (const i of [0, 1]) {
      const mine = awards.filter((a) => a.personIndex === i)
      expect(mine.length).toBeGreaterThanOrEqual(1)
      expect(mine.length).toBeLessThanOrEqual(3)
    }
  })

  it('Telegram demo parses as a group', () => {
    const json = generateTelegramDemo()
    expect(detectPlatform(json)).toBe('telegram')
    const chat = parseTelegram(json)
    expect(chat.participants).toHaveLength(6)
    const stats = computeStats(chat.messages, { platform: 'telegram', chatName: chat.name })
    expect(stats.isGroup).toBe(true)
    const awards = assignAwards(stats)
    expect(new Set(awards.map((a) => a.personIndex)).size).toBe(6)
  })
})
