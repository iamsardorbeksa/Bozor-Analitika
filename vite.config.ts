import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { APP_CONFIG } from './src/config'

/**
 * Production CSP: the browser itself refuses every network request (connect-src 'none'),
 * so a chat file can never be uploaded anywhere, even by accident.
 */
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** Dev only: Vite's hot reload needs a websocket back to the local dev server. */
const DEV_CSP = PROD_CSP.replace("connect-src 'none'", "connect-src 'self' ws: wss:").replace(
  "script-src 'self'",
  "script-src 'self' 'unsafe-inline'",
)

function htmlMeta(): Plugin {
  let isBuild = false
  return {
    name: 'chat-wrapped-html',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    transformIndexHtml(html) {
      return html
        .replaceAll('%APP_NAME%', APP_CONFIG.name)
        .replaceAll('%APP_DESCRIPTION%', APP_CONFIG.description)
        .replaceAll('%APP_URL%', APP_CONFIG.siteUrl)
        .replaceAll('%THEME_COLOR%', APP_CONFIG.themeColor)
        .replace('%CSP%', isBuild ? PROD_CSP : DEV_CSP)
    },
  }
}

function listFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFiles(full))
    else out.push(relative(dir, full).replaceAll('\\', '/'))
  }
  return out
}

/**
 * Emits a tiny cache-first service worker that precaches the built app,
 * so it keeps working offline after the first visit. It only ever touches our own files.
 */
function serviceWorker(): Plugin {
  return {
    name: 'chat-wrapped-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const publicFiles = listFiles(join(process.cwd(), 'public')).filter((f) => f !== 'sw.js')
      const files = ['./', ...new Set([...assets, ...publicFiles])].map((f) =>
        f === './' ? f : `./${f}`,
      )
      const version = `${Date.now().toString(36)}`
      const source = `/* ${APP_CONFIG.name} offline cache. Only caches this app's own files. */
const CACHE = 'chat-wrapped-${version}'
const FILES = ${JSON.stringify(files)}
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./').then((r) => r || fetch(req)))
    return
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)))
})
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), htmlMeta(), serviceWorker()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
})
