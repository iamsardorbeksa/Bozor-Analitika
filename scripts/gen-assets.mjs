/**
 * Generates favicon / PWA icons / Open Graph image into public/.
 *   npm run gen:assets
 * Uses resvg (dev dependency) with the locally bundled Unbounded font. Run it again
 * after changing the app name in src/config.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { Resvg } from '@resvg/resvg-js'

const configSrc = readFileSync('src/config.ts', 'utf8')
const pick = (key) => new RegExp(`${key}:\\s*'([^']+)'`).exec(configSrc)[1]
const APP_NAME = pick('name')
const DISPLAY_URL = pick('displayUrl')

/** Convert a WOFF 1.0 font to a plain TrueType/OpenType file (resvg can't read WOFF). */
function woffToSfnt(woff) {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength)
  if (v.getUint32(0) !== 0x774f4646) throw new Error('not a WOFF file')
  const flavor = v.getUint32(4)
  const numTables = v.getUint16(12)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20
    const tag = v.getUint32(o)
    const offset = v.getUint32(o + 4)
    const compLength = v.getUint32(o + 8)
    const origLength = v.getUint32(o + 12)
    const checksum = v.getUint32(o + 16)
    let data = woff.subarray(offset, offset + compLength)
    if (compLength < origLength) data = inflateSync(data)
    tables.push({ tag, checksum, data })
  }
  const headerSize = 12 + numTables * 16
  let size = headerSize
  for (const t of tables) size += (t.data.length + 3) & ~3
  const out = new Uint8Array(size)
  const w = new DataView(out.buffer)
  let pow = 1
  let log = 0
  while (pow * 2 <= numTables) {
    pow *= 2
    log++
  }
  w.setUint32(0, flavor)
  w.setUint16(4, numTables)
  w.setUint16(6, pow * 16)
  w.setUint16(8, log)
  w.setUint16(10, numTables * 16 - pow * 16)
  let offset = headerSize
  tables.forEach((t, i) => {
    const o = 12 + i * 16
    w.setUint32(o, t.tag)
    w.setUint32(o + 4, t.checksum)
    w.setUint32(o + 8, offset)
    w.setUint32(o + 12, t.data.length)
    out.set(t.data, offset)
    offset += (t.data.length + 3) & ~3
  })
  return out
}

const fontDir = join(tmpdir(), 'chat-wrapped-fonts')
mkdirSync(fontDir, { recursive: true })
const fontFiles = ['latin-900', 'latin-ext-900', 'cyrillic-900', 'latin-600'].flatMap((name) => {
  try {
    const woff = readFileSync(
      `node_modules/@fontsource/unbounded/files/unbounded-${name}-normal.woff`,
    )
    const file = join(fontDir, `unbounded-${name}.ttf`)
    writeFileSync(file, woffToSfnt(new Uint8Array(woff)))
    return [file]
  } catch {
    return []
  }
})

function render(svg, width, out) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Unbounded' },
  })
  writeFileSync(out, resvg.render().asPng())
  console.log('wrote', out)
}

const glyph = (scale = 1, x = 0, y = 0) => `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M6 5h20a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H15l-7 6v-6H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" fill="#fff"/>
    <path d="M9 17l4-6 4 4 5-6" stroke="#D7FF3A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`

// Favicon (also used as the SVG icon in the manifest)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#5B2EFF"/>
  ${glyph(1.5, 8, 8)}
</svg>
`
writeFileSync('public/favicon.svg', faviconSvg)

// Maskable icon: glyph inside the 80% safe zone on a full-bleed background.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#5B2EFF"/>
  ${glyph(1.1, 14.4, 14.4)}
</svg>`

render(faviconSvg, 32, 'public/favicon-32.png')
render(faviconSvg, 192, 'public/icon-192.png')
render(faviconSvg, 512, 'public/icon-512.png')
render(maskableSvg, 512, 'public/icon-maskable-512.png')
render(
  maskableSvg.replace('fill="#5B2EFF"/>', 'fill="#5B2EFF"/>'),
  180,
  'public/apple-touch-icon.png',
)

// Open Graph / Twitter preview, 1200×630
const pillText = `100% private · ${DISPLAY_URL}`
// Unbounded 900 at 19px averages ~12.4px per character; 60px of horizontal padding.
const pillWidth = Math.round(pillText.length * 12.4 + 60)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="0.15" cy="0.1" r="0.6"><stop offset="0" stop-color="#FF7AB6" stop-opacity="0.55"/><stop offset="1" stop-color="#FF7AB6" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.9" cy="0.95" r="0.6"><stop offset="0" stop-color="#D7FF3A" stop-opacity="0.45"/><stop offset="1" stop-color="#D7FF3A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#2A12A8"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>

  <g transform="translate(760 70) rotate(-9 110 200)">
    <rect width="220" height="390" rx="26" fill="#0B1033"/>
    <text x="22" y="48" font-size="13" font-weight="600" fill="#F4F1FF" opacity="0.75" letter-spacing="2">RUSH HOUR</text>
    <text x="22" y="100" font-size="44" font-weight="900" fill="#3AF0FF">11 PM</text>
    ${Array.from({ length: 16 }, (_, i) => {
      const h = [20, 14, 8, 10, 18, 26, 30, 36, 34, 40, 52, 60, 74, 90, 120, 104][i]
      return `<rect x="${22 + i * 11.5}" y="${360 - h}" width="8" height="${h}" rx="2" fill="${i === 14 ? '#3AF0FF' : '#F4F1FF'}" opacity="${i === 14 ? 1 : 0.3}"/>`
    }).join('')}
  </g>
  <g transform="translate(930 110) rotate(8 110 200)">
    <rect width="220" height="390" rx="26" fill="#E0145A"/>
    <text x="22" y="48" font-size="11" font-weight="600" fill="#fff" opacity="0.8" letter-spacing="1.5">TOGETHER YOU SENT</text>
    <text x="22" y="104" font-size="46" font-weight="900" fill="#FFE14D">4,524</text>
    <text x="22" y="140" font-size="20" font-weight="900" fill="#fff">messages</text>
    <rect x="22" y="300" width="176" height="64" rx="16" fill="#2B0A3D" opacity="0.35"/>
    <text x="38" y="340" font-size="16" font-weight="900" fill="#fff">Speed Demon</text>
  </g>

  <rect x="72" y="76" width="64" height="64" rx="18" fill="#5B2EFF" transform="rotate(-6 104 108)"/>
  ${glyph(1.45, 81, 85)}
  <text x="158" y="122" font-size="30" font-weight="900" fill="#fff">${APP_NAME}</text>

  <text x="72" y="300" font-size="92" font-weight="900" fill="#fff" letter-spacing="-3">Your chat,</text>
  <text x="72" y="400" font-size="92" font-weight="900" fill="#D7FF3A" letter-spacing="-3">wrapped.</text>
  <text x="74" y="468" font-size="24" font-weight="600" fill="#fff" opacity="0.9">WhatsApp + Telegram stats, awards &amp; stories</text>

  <rect x="72" y="510" width="${pillWidth}" height="56" rx="28" fill="#0E0B1F"/>
  <text x="102" y="546" font-size="19" font-weight="900" fill="#D7FF3A">${pillText}</text>
</svg>`
render(ogSvg, 1200, 'public/og-image.png')

// PWA manifest
const manifest = {
  name: `${APP_NAME}: your chat, wrapped`,
  short_name: pick('shortName'),
  description: pick('description'),
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: pick('backgroundColor'),
  theme_color: pick('themeColor'),
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
}
writeFileSync('public/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n')
console.log('wrote public/manifest.webmanifest')
