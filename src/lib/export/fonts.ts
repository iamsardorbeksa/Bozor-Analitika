/**
 * Fonts inlined as data URLs for image export. html-to-image would normally fetch()
 * the font files, but our CSP forbids every fetch (connect-src 'none'), so we hand it
 * ready-made @font-face rules instead. This module is lazy-loaded on first export.
 */
import unboundedLatin from '@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2?inline'
import unboundedLatinExt from '@fontsource-variable/unbounded/files/unbounded-latin-ext-wght-normal.woff2?inline'
import unboundedCyrillic from '@fontsource-variable/unbounded/files/unbounded-cyrillic-wght-normal.woff2?inline'
import unboundedCyrillicExt from '@fontsource-variable/unbounded/files/unbounded-cyrillic-ext-wght-normal.woff2?inline'
import manropeLatin from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?inline'
import manropeLatinExt from '@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2?inline'
import manropeCyrillic from '@fontsource-variable/manrope/files/manrope-cyrillic-wght-normal.woff2?inline'
import manropeCyrillicExt from '@fontsource-variable/manrope/files/manrope-cyrillic-ext-wght-normal.woff2?inline'

const RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  latinExt:
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  cyrillicExt: 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
}

function face(family: string, src: string, range: string): string {
  // Vite may label the data URL with a generic mime type; the format() hint is what matters.
  return `@font-face{font-family:'${family}';font-style:normal;font-display:block;font-weight:200 900;src:url(${src}) format('woff2');unicode-range:${range};}`
}

export const fontEmbedCSS = [
  face('Unbounded Variable', unboundedLatin, RANGES.latin),
  face('Unbounded Variable', unboundedLatinExt, RANGES.latinExt),
  face('Unbounded Variable', unboundedCyrillic, RANGES.cyrillic),
  face('Unbounded Variable', unboundedCyrillicExt, RANGES.cyrillicExt),
  face('Manrope Variable', manropeLatin, RANGES.latin),
  face('Manrope Variable', manropeLatinExt, RANGES.latinExt),
  face('Manrope Variable', manropeCyrillic, RANGES.cyrillic),
  face('Manrope Variable', manropeCyrillicExt, RANGES.cyrillicExt),
].join('\n')
