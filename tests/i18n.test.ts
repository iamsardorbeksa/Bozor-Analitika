import { describe, expect, it } from 'vitest'
import { en, type DictKey } from '../src/i18n/en'
import { ru } from '../src/i18n/ru'
import { uz } from '../src/i18n/uz'
import { makeTranslator } from '../src/i18n'
import { formatDuration } from '../src/i18n/format'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  for (const [name, dict] of [
    ['ru', ru],
    ['uz', uz],
  ] as const) {
    it(`${name} uses the same placeholders as English`, () => {
      for (const key of Object.keys(en) as DictKey[]) {
        const want = new Set(placeholders(en[key]))
        const got = new Set(placeholders(dict[key]))
        expect([...got].sort(), `${name}:${key}`).toEqual([...want].sort())
      }
    })
  }

  it('Russian plurals have three forms', () => {
    for (const key of Object.keys(en) as DictKey[]) {
      if (en[key].includes('|')) expect(ru[key].split('|'), key).toHaveLength(3)
    }
  })

  it('picks plural forms', () => {
    const r = makeTranslator('ru')
    expect(r.tp('setup.messages', 1)).toBe('1 сообщение')
    expect(r.tp('setup.messages', 3)).toBe('3 сообщения')
    expect(r.tp('setup.messages', 11)).toBe('11 сообщений')
    const e = makeTranslator('en')
    expect(e.tp('setup.messages', 1)).toBe('1 message')
    expect(e.tp('setup.messages', 2)).toBe('2 messages')
    expect(makeTranslator('uz').tp('setup.messages', 5)).toBe('5 ta xabar')
  })

  it('formats durations in every language', () => {
    for (const lang of ['en', 'ru', 'uz'] as const) {
      expect(formatDuration(90_000, lang)).toMatch(/2/)
      expect(formatDuration(3 * 86_400_000, lang)).toMatch(/3/)
    }
  })
})
