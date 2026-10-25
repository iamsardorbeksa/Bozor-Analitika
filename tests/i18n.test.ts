import { describe, expect, it } from 'vitest'
import { makeTranslator } from '../src/i18n'
import { ar, arAwards } from '../src/i18n/ar'
import { de, deAwards } from '../src/i18n/de'
import { en, type AwardTexts, type Dict, type DictKey } from '../src/i18n/en'
import { es, esAwards } from '../src/i18n/es'
import { formatDate, formatDuration } from '../src/i18n/format'
import { fr, frAwards } from '../src/i18n/fr'
import { detectLang, LANGS, PLURAL_ORDER, type Lang } from '../src/i18n/lang'
import { pt, ptAwards } from '../src/i18n/pt'
import { ru, ruAwards } from '../src/i18n/ru'
import { uz, uzAwards } from '../src/i18n/uz'
import { zh, zhAwards } from '../src/i18n/zh'
import { AWARDS } from '../src/lib/awards'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const uniq = (a: string[]) => [...new Set(a)].sort()

const LOCALES: [Exclude<Lang, 'en'>, Dict, AwardTexts][] = [
  ['es', es, esAwards],
  ['fr', fr, frAwards],
  ['de', de, deAwards],
  ['pt', pt, ptAwards],
  ['ru', ru, ruAwards],
  ['uz', uz, uzAwards],
  ['zh', zh, zhAwards],
  ['ar', ar, arAwards],
]

describe('translations', () => {
  it('covers every supported language', () => {
    expect(LOCALES.map(([l]) => l).sort()).toEqual(LANGS.filter((l) => l !== 'en').sort())
  })

  for (const [lang, dict, awards] of LOCALES) {
    describe(lang, () => {
      it('has every UI string with the same placeholders as English', () => {
        for (const key of Object.keys(en) as DictKey[]) {
          expect(dict[key], `${lang}:${key}`).toBeTruthy()
          for (const form of dict[key].split('|')) {
            const want = uniq(placeholders(en[key]))
            expect(uniq(placeholders(form)), `${lang}:${key} "${form}"`).toEqual(want)
          }
        }
      })

      it('writes plural strings with one form per plural category', () => {
        const forms = PLURAL_ORDER[lang].length
        for (const key of Object.keys(en) as DictKey[]) {
          if (!en[key].includes('|')) continue
          expect(dict[key].split('|'), `${lang}:${key}`).toHaveLength(forms)
        }
      })

      it('translates every award with the same placeholders', () => {
        for (const a of AWARDS) {
          const tr = awards[a.id]
          expect(tr?.title, `${lang}:${a.id}`).toBeTruthy()
          expect(tr?.description, `${lang}:${a.id}`).toBeTruthy()
          expect(placeholders(tr.description), `${lang}:${a.id}`).toEqual(
            placeholders(a.description),
          )
        }
        expect(Object.keys(awards).sort()).toEqual(AWARDS.map((a) => a.id).sort())
      })
    })
  }

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

  it('formats durations and dates in every language', () => {
    for (const lang of LANGS) {
      expect(formatDuration(90_000, lang), lang).toMatch(/2/)
      expect(formatDuration(3 * 86_400_000, lang), lang).toMatch(/3/)
      expect(formatDate(new Date(2024, 2, 5).getTime(), lang), lang).toMatch(/2024/)
    }
  })
})

describe('browser language detection', () => {
  it('uses the first supported browser language, otherwise English', () => {
    expect(detectLang(['ru-RU', 'en-US'])).toBe('ru')
    expect(detectLang(['uz-Latn-UZ'])).toBe('uz')
    expect(detectLang(['pt-BR'])).toBe('pt')
    expect(detectLang(['zh-CN'])).toBe('zh')
    expect(detectLang(['ar-EG'])).toBe('ar')
    // unsupported languages are skipped in favour of the next preference
    expect(detectLang(['it-IT', 'de-DE'])).toBe('de')
    // nothing supported → English
    expect(detectLang(['it-IT', 'ja-JP'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })
})
