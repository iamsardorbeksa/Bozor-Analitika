/**
 * Invisible / directional characters that WhatsApp sprinkles into exports
 * (LRM, RLM, BOM, bidi isolates, zero-width no-break space...).
 */
const INVISIBLE_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C]/g
/** Space-like characters that should behave like a normal space. */
const SPACE_RE = /[\u00A0\u2007\u202F\u2009\u200A\u3000]/g

/** Strip invisible marks and normalize exotic spaces. Cheap enough to run on every line. */
export function cleanLine(line: string): string {
  return line.replace(INVISIBLE_RE, '').replace(SPACE_RE, ' ')
}

/** Normalize the various apostrophes used in Uzbek Latin (oʻ, gʻ) and elsewhere. */
export function normalizeApostrophes(s: string): string {
  return s.replace(/[‘’ʻʼ`´]/g, "'")
}

/** Decode raw bytes into text, honouring UTF-8 / UTF-16 byte order marks. */
export function decodeBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes)
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes)
  }
  // utf-8 decoder strips a leading BOM by default
  return new TextDecoder('utf-8').decode(bytes)
}
