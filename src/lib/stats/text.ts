/* Text analysis helpers: tokenization, emoji extraction, laughter detection. */

const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi
/** Word = letters/digits, allowing inner apostrophes (don't, o'zim, oʻzbek). */
const WORD_RE = /[\p{L}\p{N}](?:[\p{L}\p{M}\p{N}]|['’ʻʼ](?=\p{L}))*/gu
/** Scripts written without spaces need a real word segmenter. */
const NO_SPACE_SCRIPT_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u
const NON_ASCII_RE = /[^\p{ASCII}]/u

type Segmenter = { segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }> }
let wordSegmenter: Segmenter | null | undefined

function getWordSegmenter(): Segmenter | null {
  if (wordSegmenter !== undefined) return wordSegmenter
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter })
    .Segmenter
  wordSegmenter = Seg ? new Seg(undefined, { granularity: 'word' }) : null
  return wordSegmenter
}

export function countLinks(text: string): number {
  const m = text.match(URL_RE)
  return m ? m.length : 0
}

export function stripLinks(text: string): string {
  return text.replace(URL_RE, ' ')
}

/**
 * Unicode-aware tokenizer. Fast regex path for space-separated scripts
 * (Latin, Cyrillic, Arabic...), Intl.Segmenter for CJK / Thai etc.
 */
export function tokenize(text: string): string[] {
  if (NON_ASCII_RE.test(text) && NO_SPACE_SCRIPT_RE.test(text)) {
    const seg = getWordSegmenter()
    if (seg) {
      const out: string[] = []
      for (const s of seg.segment(text)) if (s.isWordLike) out.push(s.segment)
      return out
    }
  }
  return text.match(WORD_RE) ?? []
}

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[’ʻʼ]/g, "'")
}

/**
 * Emoji sequences: flags, keycaps, ZWJ sequences, skin tones and tag sequences
 * are each matched as ONE emoji.
 */
const EMOJI_RE =
  /\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)?)*/gu

/** Returns emojis in the text. Variation selectors are dropped so ❤ and ❤\uFE0F count together. */
export function extractEmojis(text: string): string[] {
  if (!NON_ASCII_RE.test(text)) return []
  const matches = text.match(EMOJI_RE)
  if (!matches) return []
  const out: string[] = []
  for (const m of matches) {
    const cp = m.codePointAt(0)!
    // Skip text-style symbols like ©, ®, ™, ‼ unless explicitly emoji-presented.
    if (m.length === 1 && cp < 0x2190) continue
    out.push(normalizeEmoji(m))
  }
  return out
}

export function normalizeEmoji(e: string): string {
  // Keep FE0F inside ZWJ sequences (needed to render them), drop it elsewhere.
  if (e.includes('\u200D')) return e
  const stripped = e.replace(/\uFE0F/g, '')
  return stripped || e
}

/** Emojis that count as laughter. */
export const LAUGH_EMOJIS: ReadonlySet<string> = new Set(['😂', '🤣', '😭', '😆', '😹', '💀'])

/** Single-word laughter in many languages and spellings. */
const LAUGH_WORD_RE = new RegExp(
  '^(?:' +
    [
      'a?(?:ha|he|hi){2,}h?a?', // haha, hahaha, hehe, hihi, ahaha
      '(?:ah){2,}a?h?', // ahah, ahahah
      'a?(?:ja|je|ji){2,}j?a?', // jaja (es)
      '(?:js){2,}j?', // jsjs (es)
      'k{3,}', // kkkk (pt)
      'lo+l(?:ol)*', // lol, lool, lolol
      'lmf?a+o+', // lmao, lmfao
      'rofl',
      'xd+',
      'a?(?:xa){2,}x?', // xaxa (uz latin)
      'а?(?:ха|хе|хи){2,}х?а?', // хаха, хехе, хихи
      '(?:ах){2,}а?х?', // ахах, ахахах
      'ы{3,}', // ыыы
      'кек',
      'ржу',
      'ㅋ{2,}', // ㅋㅋㅋ (ko)
      'w{3,}', // www (ja)
      '5{3,}', // 555 (th)
      'p?mdr+', // mdr, ptdr (fr)
      'ptdr+',
      '(?:rs){2,}', // rsrs (pt)
      'ه{3,}', // ههههه (ar)
      'خ{3,}', // خخخخ (Gulf ar)
      'هه(?:ه|ـ)+',
    ].join('|') +
    ')$',
  'u',
)
const PAREN_LAUGH_RE = /\){2,}/g
/** Chinese laughter is written without spaces, so it is matched inside the text: 哈哈, 呵呵, 嘻嘻, 笑死. */
const CJK_LAUGH_RE = /哈{2,}|呵{2,}|嘻{2,}|嘿{2,}|笑死|xswl/gi
const CJK_RE = /[一-鿿]/

/** "哈哈哈" etc. as a token: counted by CJK_LAUGH_RE, but must not show up as a "top word". */
export function isCjkLaugh(word: string): boolean {
  return /^[哈呵嘻嘿]+$/.test(word)
}

export function isLaughWord(word: string): boolean {
  return word.length >= 3 && LAUGH_WORD_RE.test(word)
}

/** Count laughter in a message: laugh words, ")))" runs and laugh emojis. */
export function countLaughs(lowerTokens: string[], text: string, emojis: string[]): number {
  let n = 0
  for (const t of lowerTokens) if (isLaughWord(t)) n++
  if (CJK_RE.test(text)) {
    const m = text.match(CJK_LAUGH_RE)
    if (m) n += m.length
  }
  if (text.includes('))')) {
    const m = text.match(PAREN_LAUGH_RE)
    if (m) n += m.length
  }
  for (const e of emojis) if (LAUGH_EMOJIS.has(e)) n++
  return n
}

export function isQuestion(text: string): boolean {
  const t = text.trimEnd()
  const last = t[t.length - 1]
  return last === '?' || last === '؟' || last === '？' || last === '¿'
}

export function countExclamations(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c === 33 /* ! */ || c === 0xff01 || c === 0x00a1) n++
  }
  return n
}

/** ALL CAPS shouting: at least 5 cased letters and no lowercase ones. */
export function isAllCaps(text: string): boolean {
  let upper = 0
  for (const ch of text) {
    const lo = ch.toLowerCase()
    const up = ch.toUpperCase()
    if (lo === up) continue
    if (ch === lo) return false
    upper++
  }
  return upper >= 5
}
